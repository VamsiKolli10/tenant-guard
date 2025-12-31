import { prisma } from "@/server/db";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";
import type { Role } from "@prisma/client";

type ChangeRoleInput = {
  orgId: string;
  memberUserId: string;
  actorId: string;
  role: Role;
};

export async function getMembership(
  orgId: string,
  userId: string,
  db: DbClient = prisma,
) {
  return db.membership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });
}

export async function listMembers(orgId: string, db: DbClient = prisma) {
  return db.membership.findMany({
    where: { orgId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function changeMemberRole(
  input: ChangeRoleInput,
  db: DbClient = prisma,
) {
  const membership = await db.membership.findUnique({
    where: {
      userId_orgId: {
        userId: input.memberUserId,
        orgId: input.orgId,
      },
    },
    include: { user: true },
  });

  if (!membership) {
    throw new Error("Membership not found.");
  }

  const priorRole = membership.role;

  const updated = await db.membership.update({
    where: { id: membership.id },
    data: { role: input.role },
    include: { user: true },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.actorId,
    action: "org.member.role_updated",
    entityType: "Membership",
    entityId: updated.id,
    metadata: {
      memberUserId: updated.userId,
      priorRole,
      newRole: updated.role,
    },
  });

  return updated;
}
