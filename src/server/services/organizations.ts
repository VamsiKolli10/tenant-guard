import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";

type CreateOrgInput = {
  name: string;
  ownerId: string;
};

export async function createOrganization(
  input: CreateOrgInput,
  db: PrismaClient = prisma,
) {
  const trimmedName = input.name.trim();

  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: trimmedName,
        createdById: input.ownerId,
      },
    });

    await tx.membership.create({
      data: {
        orgId: org.id,
        userId: input.ownerId,
        role: "ADMIN",
      },
    });

    await logAuditEvent(tx, {
      orgId: org.id,
      actorUserId: input.ownerId,
      action: "org.created",
      entityType: "Organization",
      entityId: org.id,
      metadata: { name: trimmedName },
    });

    return org;
  });
}

export async function listOrganizationsForUser(
  userId: string,
  db: DbClient = prisma,
) {
  return db.organization.findMany({
    where: {
      memberships: {
        some: { userId },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
