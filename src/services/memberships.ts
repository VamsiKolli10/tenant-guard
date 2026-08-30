import "server-only";

import type { Role } from "@prisma/client";

import {
  changeMemberRole,
  listMembers,
  removeMember,
} from "@/server/services/memberships";
import { requireRole } from "@/services/tenancy";

type ListMembersInput = {
  orgId: string;
  userId: string;
};

type ChangeRoleInput = {
  orgId: string;
  userId: string;
  memberUserId: string;
  role: Role;
};

type RemoveMemberInput = {
  orgId: string;
  userId: string;
  memberUserId: string;
};

export const membershipService = {
  async listMembers(input: ListMembersInput) {
    await requireRole(input.orgId, input.userId, ["ADMIN", "MANAGER"]);
    return listMembers(input.orgId);
  },

  async changeRole(input: ChangeRoleInput) {
    await requireRole(input.orgId, input.userId, ["ADMIN"]);

    return changeMemberRole({
      orgId: input.orgId,
      memberUserId: input.memberUserId,
      actorId: input.userId,
      role: input.role,
    });
  },

  async removeMember(input: RemoveMemberInput) {
    await requireRole(input.orgId, input.userId, ["ADMIN"]);

    return removeMember({
      orgId: input.orgId,
      memberUserId: input.memberUserId,
      actorId: input.userId,
    });
  },
};
