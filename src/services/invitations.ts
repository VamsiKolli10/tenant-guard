import "server-only";

import type { Role } from "@prisma/client";

import { requireRole } from "@/services/tenancy";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "@/server/services/invitations";

const INVITE_ROLES: Role[] = ["ADMIN", "MANAGER"];

type CreateInviteInput = {
  orgId: string;
  actorUserId: string;
  email?: string;
  role: Role;
};

type ListInvitesInput = {
  orgId: string;
  actorUserId: string;
};

type RevokeInviteInput = {
  orgId: string;
  actorUserId: string;
  inviteId: string;
};

type AcceptInviteInput = {
  token: string;
  userId: string;
};

export const inviteService = {
  async createInvite(input: CreateInviteInput) {
    await requireRole(input.orgId, input.actorUserId, INVITE_ROLES);

    return createInvitation({
      orgId: input.orgId,
      email: input.email,
      role: input.role,
      invitedByUserId: input.actorUserId,
    });
  },

  async listInvites(input: ListInvitesInput) {
    await requireRole(input.orgId, input.actorUserId, INVITE_ROLES);
    return listInvitations(input.orgId);
  },

  async revokeInvite(input: RevokeInviteInput) {
    await requireRole(input.orgId, input.actorUserId, INVITE_ROLES);

    return revokeInvitation({
      orgId: input.orgId,
      invitationId: input.inviteId,
      actorId: input.actorUserId,
    });
  },

  async acceptInvite(input: AcceptInviteInput) {
    return acceptInvitation({
      token: input.token,
      userId: input.userId,
    });
  },
};
