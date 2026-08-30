import { expect, it } from "vitest";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
import { createOrganization } from "@/server/services/organizations";
import { changeMemberRole, removeMember } from "@/server/services/memberships";
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

it("prevents demoting or removing the final administrator", async () => {
  const admin = await createUser({
    email: "final-admin@example.com",
    password: "password123",
  });
  const org = await createOrganization({
    name: "Protected Admin Org",
    ownerId: admin.id,
  });

  await expect(
    changeMemberRole({
      orgId: org.id,
      memberUserId: admin.id,
      actorId: admin.id,
      role: "MEMBER",
    }),
  ).rejects.toThrow(AuthorizationError);

  await expect(
    removeMember({
      orgId: org.id,
      memberUserId: admin.id,
      actorId: admin.id,
    }),
  ).rejects.toThrow(AuthorizationError);
});

it("removes a member, unassigns their tasks, and records an audit event", async () => {
  const admin = await createUser({
    email: "removal-admin@example.com",
    password: "password123",
  });
  const member = await createUser({
    email: "removed-member@example.com",
    password: "password123",
  });
  const org = await createOrganization({
    name: "Member Removal Org",
    ownerId: admin.id,
  });
  await prisma.membership.create({
    data: { orgId: org.id, userId: member.id, role: "MEMBER" },
  });
  const task = await prisma.task.create({
    data: {
      orgId: org.id,
      title: "Reassign after removal",
      createdByUserId: admin.id,
      assignedToUserId: member.id,
    },
  });

  await removeMember({
    orgId: org.id,
    memberUserId: member.id,
    actorId: admin.id,
  });

  expect(
    await prisma.membership.findUnique({
      where: { userId_orgId: { userId: member.id, orgId: org.id } },
    }),
  ).toBeNull();
  expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).assignedToUserId).toBeNull();
  expect(
    await prisma.auditLog.findFirst({
      where: { orgId: org.id, action: "org.member.removed" },
    }),
  ).not.toBeNull();
});
