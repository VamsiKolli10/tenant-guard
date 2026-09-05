import "server-only";

import type { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
import { hasRole } from "@/server/rbac";
import { setOrgContext } from "@/server/tenant-context";
import type { DbClient } from "@/server/services/types";

export async function requireMembership(
  orgId: string,
  userId: string,
  db: DbClient = prisma,
) {
  // Bind the context first: the membership lookup is itself a tenant-scoped
  // query, and the guard needs to know which organization it may touch. This
  // states the subject of the request, not the caller's right to it — that is
  // decided by the lookup immediately below.
  setOrgContext(orgId);

  const membership = await db.membership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });

  if (!membership) {
    throw new AuthorizationError("Forbidden.");
  }

  return membership;
}

export async function requireRole(
  orgId: string,
  userId: string,
  roles: Role[],
  db: DbClient = prisma,
) {
  const membership = await requireMembership(orgId, userId, db);

  if (!hasRole(membership.role, roles)) {
    throw new AuthorizationError("Forbidden.");
  }

  return membership;
}
