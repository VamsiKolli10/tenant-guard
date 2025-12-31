import { expect, it } from "vitest";

import { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError } from "@/server/errors";
import { createOrganization } from "@/server/services/organizations";
import { createTask, deleteTask, listTasks, updateTask } from "@/server/services/tasks";
import { createUser } from "@/server/services/users";

it("filters tasks by status and search query", async () => {
  const admin = await createUser({
    email: "taskadmin@example.com",
    name: "Task Admin",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Task Ops",
    ownerId: admin.id,
  });

  await createTask({
    orgId: org.id,
    title: "Prepare report",
    description: "Monthly usage metrics",
    status: "IN_PROGRESS",
    actorUserId: admin.id,
    actorRole: Role.ADMIN,
  });

  await createTask({
    orgId: org.id,
    title: "Close Q4 tasks",
    description: "Archive old items",
    status: "DONE",
    actorUserId: admin.id,
    actorRole: Role.ADMIN,
  });

  const doneTasks = await listTasks({
    orgId: org.id,
    status: "DONE",
  });

  expect(doneTasks.items).toHaveLength(1);
  expect(doneTasks.items[0]?.status).toBe("DONE");

  const searched = await listTasks({
    orgId: org.id,
    search: "report",
  });

  expect(searched.items).toHaveLength(1);
  expect(searched.items[0]?.title).toBe("Prepare report");
});

it("logs an audit event on task deletion", async () => {
  const admin = await createUser({
    email: "auditadmin@example.com",
    name: "Audit Admin",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Audit Ops",
    ownerId: admin.id,
  });

  const task = await createTask({
    orgId: org.id,
    title: "Remove stale entries",
    actorUserId: admin.id,
    actorRole: Role.ADMIN,
  });

  await deleteTask({
    orgId: org.id,
    taskId: task.id,
    actorUserId: admin.id,
    actorRole: Role.ADMIN,
  });

  const audit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "task.deleted" },
  });

  expect(audit).not.toBeNull();
});

it("prevents members from updating tasks they do not own or hold", async () => {
  const admin = await createUser({
    email: "admin3@example.com",
    name: "Admin Three",
    password: "password123",
  });

  const member = await createUser({
    email: "member3@example.com",
    name: "Member Three",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Member Guard",
    ownerId: admin.id,
  });

  await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: member.id,
      role: "MEMBER",
    },
  });

  const task = await createTask({
    orgId: org.id,
    title: "Admin-only task",
    actorUserId: admin.id,
    actorRole: Role.ADMIN,
  });

  await expect(
    updateTask({
      orgId: org.id,
      taskId: task.id,
      actorUserId: member.id,
      actorRole: Role.MEMBER,
      data: { title: "Attempted update" },
    }),
  ).rejects.toThrow(AuthorizationError);
});

it("allows members to update tasks they created", async () => {
  const admin = await createUser({
    email: "admin4@example.com",
    name: "Admin Four",
    password: "password123",
  });

  const member = await createUser({
    email: "member4@example.com",
    name: "Member Four",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Member Owns",
    ownerId: admin.id,
  });

  await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: member.id,
      role: "MEMBER",
    },
  });

  const task = await createTask({
    orgId: org.id,
    title: "Member-owned task",
    actorUserId: member.id,
    actorRole: Role.MEMBER,
  });

  const updated = await updateTask({
    orgId: org.id,
    taskId: task.id,
    actorUserId: member.id,
    actorRole: Role.MEMBER,
    data: { title: "Updated by owner" },
  });

  expect(updated.title).toBe("Updated by owner");
});
