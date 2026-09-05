import "server-only";

import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import {
  createOrganization,
  listOrganizationsForUser,
} from "@/server/services/organizations";
import { requireMembership } from "@/services/tenancy";

type GetOrgInput = {
  orgId: string;
  userId: string;
};

type CreateOrgInput = {
  name: string;
  userId: string;
};

export const orgService = {
  async getOrg(input: GetOrgInput) {
    await requireMembership(input.orgId, input.userId);

    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
    });

    if (!org) {
      throw new NotFoundError("Organization not found.");
    }

    return org;
  },

  /**
   * No membership guard: the caller is founding the organization and becomes
   * its first ADMIN. Routed through the facade anyway so that route handlers
   * have a single, guarded entry point to reason about.
   */
  async createOrg(input: CreateOrgInput) {
    return createOrganization({ name: input.name, ownerId: input.userId });
  },

  /** Scoped by membership in the query itself. */
  async listOrgsForUser(userId: string) {
    return listOrganizationsForUser(userId);
  },
};
