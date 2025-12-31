import "server-only";

import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { requireMembership } from "@/services/tenancy";

type GetOrgInput = {
  orgId: string;
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
};
