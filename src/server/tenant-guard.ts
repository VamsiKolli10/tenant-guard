import { TENANT_MODELS } from "@/server/tenant-context";

/**
 * Raised when a tenant-scoped query runs with no organization bound to the
 * async context. This is a programming error: the caller skipped a tenancy
 * guard, or reached a tenant model before establishing which tenant applies.
 */
export class TenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Unscoped ${model}.${operation}: the query names no organization and none is bound to the request. Pass orgId explicitly, bind one with runWithOrg(), or wrap deliberate cross-tenant access in runUnscoped().`,
    );
    this.name = "TenantContextError";
  }
}

/**
 * Raised when a query names an organization other than the one bound to the
 * context — an attempt, deliberate or accidental, to reach across the boundary.
 */
export class TenantIsolationError extends Error {
  constructor(model: string, operation: string, found: string, expected: string) {
    super(
      `Cross-tenant ${model}.${operation} blocked: query targets org ${found} but context is org ${expected}.`,
    );
    this.name = "TenantIsolationError";
  }
}

/** Operations whose `where` clause must be narrowed to the ambient org. */
const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** Operations whose `data` payload must carry the ambient org. */
const CREATE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Finds an organization the query already scopes itself to.
 *
 * A query carrying its own `orgId` is scoped — it simply arrived at that scope
 * by argument rather than by ambient context. Treating it as acceptable is what
 * lets the guard work inside a Prisma interactive transaction, where an
 * AsyncLocalStorage binding made with `enterWith` is not visible.
 *
 * Recognises the shapes this schema actually produces: a top-level `orgId`, the
 * `userId_orgId` compound unique on Membership, and `orgId` in a create payload.
 */
function explicitOrgId(args: unknown): string | null {
  if (!isRecord(args)) return null;

  const fromFilter = (filter: unknown): string | null => {
    if (!isRecord(filter)) return null;
    if (typeof filter.orgId === "string") return filter.orgId;

    const compound = filter.userId_orgId;
    if (isRecord(compound) && typeof compound.orgId === "string") {
      return compound.orgId;
    }
    return null;
  };

  const fromWhere = fromFilter(args.where);
  if (fromWhere) return fromWhere;

  const data = args.data;
  if (Array.isArray(data)) {
    const ids = data.map(fromFilter);
    // Only counts as scoped when every row names the same organization.
    if (ids.length > 0 && ids.every((id) => id !== null && id === ids[0])) {
      return ids[0];
    }
    return null;
  }

  return fromFilter(data) ?? fromFilter(args.create);
}

/**
 * Sets `orgId` on a filter or payload object, or throws if it already names a
 * different organization. Overwriting silently would turn a cross-tenant bug
 * into a query that quietly returns the wrong rows.
 */
function pinOrgId(
  target: UnknownRecord,
  orgId: string,
  model: string,
  operation: string,
): UnknownRecord {
  const existing = target.orgId;

  if (typeof existing === "string" && existing !== orgId) {
    throw new TenantIsolationError(model, operation, existing, orgId);
  }

  return { ...target, orgId };
}

/**
 * Rewrites Prisma query arguments so they cannot escape `orgId`.
 *
 * `orgId` is added at the top level of `where`, where Prisma treats sibling
 * keys as AND — so any caller-supplied `OR`/`AND` is still constrained. It is
 * kept at the top level rather than nested inside an `AND` so that
 * `findUnique`, `update` and `delete` retain the unique field Prisma requires.
 *
 * Exported separately from the extension so it can be unit-tested as a pure
 * function, with no database or client involved.
 */
export function scopeArgs(
  model: string,
  operation: string,
  args: unknown,
  orgId: string | null,
): unknown {
  if (!TENANT_MODELS.has(model)) {
    return args;
  }

  // No ambient organization: the query must scope itself, or it is refused.
  // This still catches the regression the guard exists for — a lookup by bare
  // id that forgets the tenant — while allowing correctly written queries to
  // run in contexts where AsyncLocalStorage does not reach.
  if (!orgId) {
    const explicit = explicitOrgId(args);
    if (!explicit) {
      throw new TenantContextError(model, operation);
    }
    return args;
  }

  const next: UnknownRecord = isRecord(args) ? { ...args } : {};

  if (WHERE_OPERATIONS.has(operation)) {
    const where = isRecord(next.where) ? next.where : {};
    next.where = pinOrgId(where, orgId, model, operation);
    return next;
  }

  if (CREATE_OPERATIONS.has(operation)) {
    const data = next.data;

    if (Array.isArray(data)) {
      next.data = data.map((row) =>
        isRecord(row) ? pinOrgId(row, orgId, model, operation) : row,
      );
    } else if (isRecord(data)) {
      next.data = pinOrgId(data, orgId, model, operation);
    }

    return next;
  }

  if (operation === "upsert") {
    const where = isRecord(next.where) ? next.where : {};
    next.where = pinOrgId(where, orgId, model, operation);

    if (isRecord(next.create)) {
      next.create = pinOrgId(next.create, orgId, model, operation);
    }

    return next;
  }

  // Unrecognised operation on a tenant model: refuse rather than pass it
  // through unscoped, so a future Prisma operation cannot silently bypass this.
  throw new TenantContextError(model, operation);
}

type QueryExtensionParams = {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

type GuardDeps = {
  getOrgContext: () => string | null;
};

/**
 * The Prisma client extension.
 *
 * A query against a model in TENANT_MODELS must either name its own `orgId` or
 * run with one bound to the async context; anything else is refused. Models
 * without a tenant column pass through untouched.
 *
 * Deliberate cross-tenant access does not go through here — it uses the
 * separate `prismaUnscoped` client, which has no guard attached.
 */
export function createTenantGuard(deps: GuardDeps) {
  return async function guard({
    model,
    operation,
    args,
    query,
  }: QueryExtensionParams) {
    if (!model || !TENANT_MODELS.has(model)) {
      return query(args);
    }

    return query(scopeArgs(model, operation, args, deps.getOrgContext()));
  };
}
