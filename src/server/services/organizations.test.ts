import { expect, it } from "vitest";

import { prisma } from "@/server/db";
import { createOrganization } from "@/server/services/organizations";
import { createUser } from "@/server/services/users";

it("creates an org with an admin membership and audit event", async () => {
  const user = await createUser({
    email: "admin@example.com",
    name: "Admin User",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Acme Ops",
    ownerId: user.id,
  });

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
  });

  expect(membership?.role).toBe("ADMIN");

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.created" },
  });

  expect(audit).not.toBeNull();
});
