import { createHash, randomBytes } from "crypto";

import type { PrismaClient, Role } from "@prisma/client";

import { prisma, prismaUnscoped } from "@/server/db";
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

/**
 * Invitation fields safe to return across an API boundary. `tokenHash` is
 * deliberately excluded — it is derived from the invite secret and must never
 * appear in a response body.
 */
const PUBLIC_INVITATION_SELECT = {
  id: true,
  orgId: true,
  email: true,
  role: true,
  invitedByUserId: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  acceptedAt: true,
} as const;

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
    select: PUBLIC_INVITATION_SELECT,
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
  const tokenHash = hashToken(input.token.trim());

  // Resolving which tenant a token belongs to is the one query in the
  // application that cannot name an organization: the caller is a member of
  // nothing, and the token itself is the authority. It therefore runs on the
  // unguarded client, and reads nothing but the organization id.
  const resolved = await prismaUnscoped.invitation.findUnique({
    where: { tokenHash },
    select: { orgId: true },
  });

  if (!resolved) {
    throw new Error("Invite not found.");
  }

  const orgId = resolved.orgId;

  return db.$transaction(async (tx) => {
    // Re-read inside the transaction, now explicitly scoped, so validation and
    // acceptance are atomic with respect to a concurrent revoke.
    const invitation = await tx.invitation.findFirst({
      where: { tokenHash, orgId },
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

    // Checked independently of the sign-in gate: the tenant boundary must not
    // depend on which authentication path the caller arrived through.
    if (!user.emailVerifiedAt) {
      throw new Error("Verify your email address before accepting an invite.");
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
      where: { id: invitation.id, orgId },
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
    where: { id: existing.id, orgId: input.orgId },
    data: {
      revokedAt: new Date(),
    },
    select: PUBLIC_INVITATION_SELECT,
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
    select: PUBLIC_INVITATION_SELECT,
  });
}
