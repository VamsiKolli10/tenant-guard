import type { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { hasAtLeastRole, hasRole } from "@/server/rbac";
import { setOrgContext } from "@/server/tenant-context";
import type { DbClient } from "@/server/services/types";

type RequireOrgRoleInput = {
  orgId: string;
  userId: string;
  roles?: Role[];
  minimumRole?: Role;
};

export async function requireOrgRole(
  input: RequireOrgRoleInput,
  db: DbClient = prisma,
) {
  const membership = await db.membership.findUnique({
    where: {
      userId_orgId: {
        userId: input.userId,
        orgId: input.orgId,
      },
    },
  });

  if (!membership) {
    return null;
  }

  if (input.roles && !hasRole(membership.role, input.roles)) {
    return null;
  }

  if (input.minimumRole && !hasAtLeastRole(membership.role, input.minimumRole)) {
    return null;
  }

  setOrgContext(input.orgId);
  return membership;
}
