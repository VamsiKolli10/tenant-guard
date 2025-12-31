import { PrismaClient } from "@prisma/client";

import { getOrgContext, TENANT_MODELS } from "@/server/tenant-context";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaMiddlewareApplied?: boolean;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (!globalForPrisma.prismaMiddlewareApplied) {
  prismaClient.$use(async (params, next) => {
    const orgId = getOrgContext();

    if (!orgId || !params.model || !TENANT_MODELS.has(params.model)) {
      return next(params);
    }

    const args = params.args ?? {};
    const action = params.action;

    const scopeWhere = () => {
      args.where = { ...(args.where ?? {}), orgId };
      params.args = args;
    };

    const assertOrgId = (data: Record<string, unknown>) => {
      if (!("orgId" in data)) {
        throw new Error("Tenant scope violation: missing orgId.");
      }
      if (data.orgId !== orgId) {
        throw new Error("Tenant scope violation: mismatched orgId.");
      }
    };

    if (action === "create") {
      assertOrgId(args.data ?? {});
    }

    if (action === "createMany") {
      const data = Array.isArray(args.data) ? args.data : [args.data];
      data.forEach((item) => assertOrgId(item ?? {}));
    }

    if (action === "update" || action === "upsert") {
      if (args.data?.orgId && args.data.orgId !== orgId) {
        throw new Error("Tenant scope violation: orgId update blocked.");
      }
    }

    if (
      action === "findMany" ||
      action === "findFirst" ||
      action === "findFirstOrThrow" ||
      action === "count" ||
      action === "aggregate" ||
      action === "groupBy" ||
      action === "updateMany" ||
      action === "deleteMany"
    ) {
      scopeWhere();
    }

    if (action === "findUnique" || action === "findUniqueOrThrow") {
      const where = args.where ?? {};
      const hasOrgScope =
        "orgId" in where ||
        ("userId_orgId" in where &&
          typeof where.userId_orgId === "object" &&
          where.userId_orgId !== null &&
          "orgId" in where.userId_orgId);
      if (!hasOrgScope) {
        throw new Error("Tenant scope violation: findUnique requires orgId.");
      }
    }

    return next(params);
  });

  globalForPrisma.prismaMiddlewareApplied = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
