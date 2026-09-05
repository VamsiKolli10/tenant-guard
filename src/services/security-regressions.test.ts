import { expect, it } from "vitest";

import { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
import { createInvitation } from "@/server/services/invitations";
import { createOrganization } from "@/server/services/organizations";
import { createUser } from "@/server/services/users";
import { setOrgContext } from "@/server/tenant-context";
import { inviteService } from "@/services/invitations";
import { membershipService } from "@/services/memberships";
import { taskService } from "@/services/tasks";
import { createVerifiedUser } from "@/test/factories";

/**
 * Regressions for the findings in docs/security/security-review-2026-09-05.md.
 * Each test names the finding it locks down.
 */

async function seedOrg(prefix: string) {
  const admin = await createVerifiedUser({
    email: `${prefix}-admin@example.com`,
    name: "Admin",
    password: "password123",
  });

  const org = await createOrganization({ name: `${prefix} Org`, ownerId: admin.id });

  const member = await createVerifiedUser({
    email: `${prefix}-member@example.com`,
    name: "Member",
    password: "password123",
  });

  setOrgContext(org.id);
  await prisma.membership.create({
    data: { orgId: org.id, userId: member.id, role: Role.MEMBER },
  });

  return { org, admin, member };
}

// Finding 1 — credential exposure through the members API.
it("never returns a password hash from the members list", async () => {
  const { org, admin } = await seedOrg("f1");

  const members = await membershipService.listMembers({
    orgId: org.id,
    userId: admin.id,
  });

  expect(members.length).toBeGreaterThan(0);
  for (const entry of members) {
    expect(entry.user).not.toHaveProperty("passwordHash");
    expect(entry.user).not.toHaveProperty("emailVerifiedAt");
    expect(entry.user.email).toBeTypeOf("string");
  }
});

it("never returns a password hash when changing a role", async () => {
  const { org, admin, member } = await seedOrg("f1b");

  const updated = await membershipService.changeRole({
    orgId: org.id,
    userId: admin.id,
    memberUserId: member.id,
    role: Role.MANAGER,
  });

  expect(updated.role).toBe(Role.MANAGER);
  expect(updated.user).not.toHaveProperty("passwordHash");
});

// Finding 2 — unverified accounts must not cross a tenant boundary.
it("refuses an invite acceptance from an unverified account", async () => {
  const { org, admin } = await seedOrg("f2");

  const unverified = await createUser({
    email: "f2-unverified@example.com",
    password: "password123",
  });

  const { token } = await createInvitation({
    orgId: org.id,
    email: unverified.email,
    role: Role.MEMBER,
    invitedByUserId: admin.id,
  });

  await expect(
    inviteService.acceptInvite({ token, userId: unverified.id }),
  ).rejects.toThrow(/Verify your email/i);

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: unverified.id, orgId: org.id } },
  });
  expect(membership).toBeNull();
});

// Finding 3 — the guard is a real backstop, not scaffolding.
// The "no organization bound" path is covered as a pure unit test in
// src/server/tenant-guard.test.ts, where the async context can be controlled
// exactly. Here we cover the case that actually leaks data: a live query
// reaching for a row belonging to a different tenant.
it("refuses a query that names a different organization than the context", async () => {
  const { org: orgA, admin: adminA } = await seedOrg("f3a");
  const { org: orgB } = await seedOrg("f3b");

  const task = await taskService.createTask({
    orgId: orgA.id,
    userId: adminA.id,
    payload: { title: "Tenant A task" },
  });

  // Context is currently org B (seeded last). Reaching for an org A row by id
  // must fail rather than return it.
  setOrgContext(orgB.id);
  const leaked = await prisma.task.findFirst({ where: { id: task.id } });
  expect(leaked).toBeNull();
});

// Finding 4 — invite token hashes must not leave the server.
it("never returns a token hash when revoking an invite", async () => {
  const { org, admin } = await seedOrg("f4");

  const { invitation } = await inviteService.createInvite({
    orgId: org.id,
    actorUserId: admin.id,
    email: "f4-invitee@example.com",
    role: Role.MEMBER,
  });

  expect(invitation).not.toHaveProperty("tokenHash");

  const revoked = await inviteService.revokeInvite({
    orgId: org.id,
    actorUserId: admin.id,
    inviteId: invitation.id,
  });

  expect(revoked.revokedAt).not.toBeNull();
  expect(revoked).not.toHaveProperty("tokenHash");
});

// Finding 5 — the audit trail is append-only in the database.
it("rejects updates and deletes against the audit log", async () => {
  const { org, admin } = await seedOrg("f5");

  await taskService.createTask({
    orgId: org.id,
    userId: admin.id,
    payload: { title: "Audited task" },
  });

  const entry = await prisma.auditLog.findFirst({ where: { orgId: org.id } });
  expect(entry).not.toBeNull();

  await expect(
    prisma.auditLog.update({
      where: { id: entry!.id },
      data: { action: "tampered" },
    }),
  ).rejects.toThrow(/append-only/i);

  await expect(
    prisma.auditLog.delete({ where: { id: entry!.id } }),
  ).rejects.toThrow(/append-only/i);

  const still = await prisma.auditLog.findFirst({ where: { id: entry!.id } });
  expect(still?.action).toBe(entry!.action);
});

// Finding 7 — a member assigned a task may advance it, not re-plan it.
it("lets an assigned member change status but not reassign", async () => {
  const { org, admin, member } = await seedOrg("f7");

  const task = await taskService.createTask({
    orgId: org.id,
    userId: admin.id,
    payload: { title: "Assigned work", assignedToUserId: member.id },
  });

  const advanced = await taskService.updateTask({
    orgId: org.id,
    userId: member.id,
    taskId: task.id,
    payload: { status: "IN_PROGRESS" },
  });
  expect(advanced.status).toBe("IN_PROGRESS");

  await expect(
    taskService.updateTask({
      orgId: org.id,
      userId: member.id,
      taskId: task.id,
      payload: { assignedToUserId: admin.id },
    }),
  ).rejects.toThrow(AuthorizationError);

  await expect(
    taskService.updateTask({
      orgId: org.id,
      userId: member.id,
      taskId: task.id,
      payload: { title: "Renamed by assignee" },
    }),
  ).rejects.toThrow(AuthorizationError);
});
