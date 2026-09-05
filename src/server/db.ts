import { PrismaClient } from "@prisma/client";

import { getOrgContext } from "@/server/tenant-context";
import { createTenantGuard } from "@/server/tenant-guard";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUnscoped?: PrismaClient;
};

function createBaseClient() {
  return new PrismaClient({ log: ["error", "warn"] });
}

const base = globalForPrisma.prismaUnscoped ?? createBaseClient();

const extended = base.$extends({
  name: "tenantGuard",
  query: {
    $allModels: {
      $allOperations: createTenantGuard({ getOrgContext }),
    },
  },
  // The extension changes the client's structural type, which would ripple
  // through every `DbClient` signature for no behavioural benefit — the guard
  // runs regardless of how the client is typed.
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = extended;
  globalForPrisma.prismaUnscoped = base;
}

/** The guarded client. Everything in the application should use this. */
export const prisma = globalForPrisma.prisma ?? extended;

/**
 * The same connection with the tenant guard removed.
 *
 * There is exactly one legitimate use: resolving an invitation from its token,
 * where the caller belongs to no organization yet and the token itself is the
 * authority that identifies the tenant. Every other query must name its
 * organization.
 *
 * This exists as a separate client rather than an AsyncLocalStorage escape
 * hatch because an ALS binding is not visible inside a Prisma interactive
 * transaction — see the note on `getOrgContext`. A distinct client is explicit,
 * greppable, and cannot silently fail to apply.
 */
export const prismaUnscoped = globalForPrisma.prismaUnscoped ?? base;
