import { expect, it } from "vitest";

import { prisma } from "@/server/db";
import { createOrganization } from "@/server/services/organizations";
import { changeMemberRole } from "@/server/services/memberships";
import { createUser } from "@/server/services/users";

it("records audit events for role changes", async () => {
  const admin = await createUser({
    email: "roleadmin@example.com",
    name: "Role Admin",
    password: "password123",
  });

  const member = await createUser({
    email: "member@example.com",
    name: "Member",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Role Ops",
    ownerId: admin.id,
  });

  const membership = await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: member.id,
      role: "MEMBER",
    },
  });

  const updated = await changeMemberRole({
    orgId: org.id,
    memberUserId: membership.userId,
    actorId: admin.id,
    role: "MANAGER",
  });

  expect(updated.role).toBe("MANAGER");

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.member.role_updated" },
  });

  expect(audit).not.toBeNull();
  expect(audit?.metadata).toMatchObject({
    priorRole: "MEMBER",
    newRole: "MANAGER",
  });
});
