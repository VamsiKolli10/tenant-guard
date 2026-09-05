import { AsyncLocalStorage } from "node:async_hooks";

type TenantContext = {
  /** The organization every tenant-scoped query in this context must target. */
  orgId: string;
};

const orgStore = new AsyncLocalStorage<TenantContext>();

/**
 * Models carrying an `orgId` column. Every query against one of these must name
 * its organization, or run with one bound here.
 */
export const TENANT_MODELS = new Set([
  "Membership",
  "Invitation",
  "Task",
  "AuditLog",
]);

/**
 * Bind the current async context to an organization.
 *
 * Setting the context is not an authorization decision. It states which tenant
 * the request concerns; membership is still checked separately.
 */
export function setOrgContext(orgId: string) {
  orgStore.enterWith({ orgId });
}

/**
 * Binds an organization for the duration of `fn`. Same caveat as
 * `getOrgContext`: this does not reach queries running inside a Prisma
 * interactive transaction.
 */
export function runWithOrg<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return orgStore.run({ orgId }, fn);
}

/**
 * The organization bound to the current async context, if any.
 *
 * Treat this as a convenience, never as the guarantee. An AsyncLocalStorage
 * binding — whether set with `enterWith` or with `run` — is not visible to a
 * Prisma client extension executing inside an interactive transaction, so the
 * guard frequently sees `null` here even when a context was set moments
 * earlier.
 *
 * The property the application actually relies on is that every tenant-scoped
 * query names its own `orgId`. This is a second line of defence for the queries
 * it does happen to reach, not the mechanism itself.
 */
export function getOrgContext() {
  return orgStore.getStore()?.orgId ?? null;
}
