import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
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
  db: PrismaClient = prisma,
) {
  return db.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
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

    if (membership.role === "ADMIN" && input.role !== "ADMIN") {
      const adminCount = await tx.membership.count({
        where: { orgId: input.orgId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw new AuthorizationError("The final admin cannot be demoted.");
      }
    }

    const priorRole = membership.role;
    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: { role: input.role },
      include: { user: true },
    });

    await logAuditEvent(tx, {
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
  });
}

type RemoveMemberInput = {
  orgId: string;
  memberUserId: string;
  actorId: string;
};

export async function removeMember(
  input: RemoveMemberInput,
  db: PrismaClient = prisma,
) {
  return db.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.memberUserId,
          orgId: input.orgId,
        },
      },
    });

    if (!membership) {
      throw new Error("Membership not found.");
    }

    if (membership.role === "ADMIN") {
      const adminCount = await tx.membership.count({
        where: { orgId: input.orgId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw new AuthorizationError("The final admin cannot be removed.");
      }
    }

    await tx.task.updateMany({
      where: { orgId: input.orgId, assignedToUserId: input.memberUserId },
      data: { assignedToUserId: null },
    });
    await tx.membership.delete({ where: { id: membership.id } });
    await logAuditEvent(tx, {
      orgId: input.orgId,
      actorUserId: input.actorId,
      action: "org.member.removed",
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        memberUserId: membership.userId,
        priorRole: membership.role,
      },
    });

    return membership;
  });
}
