import { expect, it } from "vitest";

import { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
import { createInvitation } from "@/server/services/invitations";
import { createOrganization } from "@/server/services/organizations";
import { createUser } from "@/server/services/users";
import { inviteService } from "@/services/invitations";
import { membershipService } from "@/services/memberships";
import { taskService } from "@/services/tasks";

async function seedOrg() {
  const admin = await createUser({
    email: "admin@example.com",
    name: "Admin",
    password: "password123",
  });

  const manager = await createUser({
    email: "manager@example.com",
    name: "Manager",
    password: "password123",
  });

  const member = await createUser({
    email: "member@example.com",
    name: "Member",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Service Layer Org",
    ownerId: admin.id,
  });

  await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: manager.id,
      role: Role.MANAGER,
    },
  });

  await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: member.id,
      role: Role.MEMBER,
    },
  });

  return { org, admin, manager, member };
}

it("prevents members from deleting tasks", async () => {
  const { org, admin, member } = await seedOrg();

  const task = await taskService.createTask({
    orgId: org.id,
    userId: admin.id,
    payload: {
      title: "Member delete blocked",
    },
  });

  await expect(
    taskService.deleteTask({
      orgId: org.id,
      userId: member.id,
      taskId: task.id,
    }),
  ).rejects.toThrow(AuthorizationError);
});

it("allows managers to delete tasks and logs the action", async () => {
  const { org, admin, manager } = await seedOrg();

  const task = await taskService.createTask({
    orgId: org.id,
    userId: admin.id,
    payload: {
      title: "Manager delete allowed",
    },
  });

  await taskService.deleteTask({
    orgId: org.id,
    userId: manager.id,
    taskId: task.id,
  });

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "task.deleted" },
  });

  expect(audit).not.toBeNull();
});

it("restricts role updates to admins and logs audit metadata", async () => {
  const { org, admin, manager, member } = await seedOrg();

  await expect(
    membershipService.changeRole({
      orgId: org.id,
      userId: manager.id,
      memberUserId: member.id,
      role: Role.MANAGER,
    }),
  ).rejects.toThrow(AuthorizationError);

  const updated = await membershipService.changeRole({
    orgId: org.id,
    userId: admin.id,
    memberUserId: member.id,
    role: Role.MANAGER,
  });

  expect(updated.role).toBe(Role.MANAGER);

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.member.role_updated" },
  });

  expect(audit).not.toBeNull();
  expect(audit?.metadata).toMatchObject({
    priorRole: "MEMBER",
    newRole: "MANAGER",
  });
});

it("creates invite audit rows", async () => {
  const { org, admin } = await seedOrg();

  await inviteService.createInvite({
    orgId: org.id,
    actorUserId: admin.id,
    email: "invitee@example.com",
    role: Role.MEMBER,
  });

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.invite.created" },
  });

  expect(audit).not.toBeNull();
  expect(audit?.metadata).toMatchObject({
    email: "invitee@example.com",
    role: "MEMBER",
  });
});

it("accepts invites, creates memberships, and marks invites accepted", async () => {
  const { org, admin } = await seedOrg();

  const invitee = await createUser({
    email: "invitee2@example.com",
    name: "Invitee",
    password: "password123",
  });

  const { invitation, token } = await createInvitation({
    orgId: org.id,
    email: invitee.email,
    role: Role.MEMBER,
    invitedByUserId: admin.id,
  });

  const membership = await inviteService.acceptInvite({
    token,
    userId: invitee.id,
  });

  expect(membership.orgId).toBe(org.id);
  expect(membership.role).toBe(Role.MEMBER);

  const storedInvite = await prisma.invitation.findFirst({
    where: { id: invitation.id, orgId: org.id },
  });

  expect(storedInvite?.acceptedAt).not.toBeNull();

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.invite.accepted" },
  });

  expect(audit).not.toBeNull();
});
