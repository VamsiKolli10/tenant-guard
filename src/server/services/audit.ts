import type { Prisma } from "@prisma/client";

import { getRequestContext } from "@/server/request-context";
import type { DbClient } from "@/server/services/types";

type AuditInput = {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAuditEvent(db: DbClient, input: AuditInput) {
  // Callers may pass request context explicitly; otherwise it is read from the
  // ambient request, so every audited action carries it without each service
  // having to plumb it through.
  const ambient =
    input.ip === undefined && input.userAgent === undefined
      ? await getRequestContext()
      : { ip: null, userAgent: null };

  return db.auditLog.create({
    data: {
      orgId: input.orgId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ip: input.ip ?? ambient.ip,
      userAgent: input.userAgent ?? ambient.userAgent,
    },
  });
}
