import "server-only";

import type { Role } from "@prisma/client";

import { AuthorizationError } from "@/server/errors";
import { requireRole } from "@/services/tenancy";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "@/server/services/invitations";

const INVITER_ROLES: Role[] = ["ADMIN", "MANAGER"];
const INVITE_ROLES_BY_ACTOR: Record<Role, Role[]> = {
  ADMIN: ["ADMIN", "MANAGER", "MEMBER"],
  MANAGER: ["MANAGER", "MEMBER"],
  MEMBER: [],
};

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
    const membership = await requireRole(
      input.orgId,
      input.actorUserId,
      INVITER_ROLES,
    );
    const allowedRoles = INVITE_ROLES_BY_ACTOR[membership.role] ?? [];
    if (!allowedRoles.includes(input.role)) {
      throw new AuthorizationError("Only admins can invite admins.");
    }

    return createInvitation({
      orgId: input.orgId,
      email: input.email,
      role: input.role,
      invitedByUserId: input.actorUserId,
    });
  },

  async listInvites(input: ListInvitesInput) {
    await requireRole(input.orgId, input.actorUserId, INVITER_ROLES);
    return listInvitations(input.orgId);
  },

  async revokeInvite(input: RevokeInviteInput) {
    await requireRole(input.orgId, input.actorUserId, INVITER_ROLES);

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
