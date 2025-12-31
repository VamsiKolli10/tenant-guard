import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";
import { requireRole } from "@/services/tenancy";

type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

type WriteAuditInput = {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  reqContext?: RequestContext;
};

type ListAuditInput = {
  orgId: string;
  userId: string;
  cursor?: string;
  limit?: number;
};

export const auditService = {
  async write(input: WriteAuditInput, db: DbClient = prisma) {
    return logAuditEvent(db, {
      orgId: input.orgId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ip: input.reqContext?.ip ?? null,
      userAgent: input.reqContext?.userAgent ?? null,
    });
  },

  async list(input: ListAuditInput) {
    await requireRole(input.orgId, input.userId, ["ADMIN", "MANAGER"]);

    const take = input.limit ?? 50;

    const logs = await prisma.auditLog.findMany({
      where: { orgId: input.orgId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });

    const nextCursor =
      logs.length === take ? logs[logs.length - 1]?.id ?? null : null;

    return { items: logs, nextCursor };
  },
};
