import { createHash, randomBytes } from "crypto";

import type { PrismaClient, Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";

type CreateInvitationInput = {
  orgId: string;
  email?: string;
  role: Role;
  invitedByUserId: string;
  expiresInDays?: number;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvitation(
  input: CreateInvitationInput,
  db: DbClient = prisma,
) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const email = input.email?.toLowerCase().trim();
  const expiresAt =
    typeof input.expiresInDays === "number"
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      orgId: input.orgId,
      email: email || null,
      role: input.role,
      tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    },
    select: {
      id: true,
      orgId: true,
      email: true,
      role: true,
      invitedByUserId: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      acceptedAt: true,
    },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.invitedByUserId,
    action: "org.invite.created",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: {
      email,
      role: input.role,
    },
  });

  return { invitation, token };
}

type AcceptInvitationInput = {
  token: string;
  userId: string;
};

export async function acceptInvitation(
  input: AcceptInvitationInput,
  db: PrismaClient = prisma,
) {
  return db.$transaction(async (tx) => {
    const tokenHash = hashToken(input.token.trim());
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new Error("Invite not found.");
    }

    if (invitation.revokedAt || invitation.acceptedAt) {
      throw new Error("Invite is no longer valid.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invite has expired.");
    }

    const user = await tx.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (invitation.email && invitation.email !== user.email.toLowerCase()) {
      throw new Error("Invite email does not match.");
    }

    const existingMembership = await tx.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.userId,
          orgId: invitation.orgId,
        },
      },
    });

    const membership =
      existingMembership ??
      (await tx.membership.create({
        data: {
          userId: input.userId,
          orgId: invitation.orgId,
          role: invitation.role,
        },
      }));

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    await logAuditEvent(tx, {
      orgId: invitation.orgId,
      actorUserId: input.userId,
      action: "org.invite.accepted",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: {
        role: invitation.role,
      },
    });

    return membership;
  });
}

type RevokeInvitationInput = {
  invitationId: string;
  actorId: string;
  orgId: string;
};

export async function revokeInvitation(
  input: RevokeInvitationInput,
  db: DbClient = prisma,
) {
  const existing = await db.invitation.findFirst({
    where: {
      id: input.invitationId,
      orgId: input.orgId,
    },
  });

  if (!existing) {
    throw new Error("Invitation not found.");
  }

  const invitation = await db.invitation.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.actorId,
    action: "org.invite.revoked",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: {
      email: invitation.email,
      role: invitation.role,
    },
  });

  return invitation;
}

export async function listInvitations(orgId: string, db: DbClient = prisma) {
  return db.invitation.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orgId: true,
      email: true,
      role: true,
      invitedByUserId: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      acceptedAt: true,
    },
  });
}
