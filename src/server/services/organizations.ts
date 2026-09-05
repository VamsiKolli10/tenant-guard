import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import { runWithOrg } from "@/server/tenant-context";
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

  // Idempotency window for double submissions. A disabled button handles the
  // common case, but a fast second click before hydration, or a retried
  // request, can still arrive twice. Re-creating the same workspace seconds
  // apart is never the intent; two workspaces sharing a name later on is fine,
  // so this deliberately only collapses a near-simultaneous repeat.
  const recent = await db.organization.findFirst({
    where: {
      name: trimmedName,
      createdById: input.ownerId,
      createdAt: { gte: new Date(Date.now() - 30 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    return recent;
  }

  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: trimmedName,
        createdById: input.ownerId,
      },
    });

    // The organization did not exist until now, so this is the first point at
    // which a tenant context can be bound. `runWithOrg` rather than
    // `setOrgContext`: inside a Prisma interactive transaction an `enterWith`
    // binding is not visible to the query guard.
    await runWithOrg(org.id, async () => {
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
