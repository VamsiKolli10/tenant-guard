import type { Prisma, Role, TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { hasRole } from "@/server/rbac";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";

const CREATE_ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];
const MANAGE_ROLES: Role[] = ["ADMIN", "MANAGER"];

type CreateTaskInput = {
  orgId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string | null;
  dueDate?: Date | null;
  actorUserId: string;
  actorRole: Role;
};

export async function createTask(input: CreateTaskInput, db: DbClient = prisma) {
  if (!hasRole(input.actorRole, CREATE_ROLES)) {
    throw new AuthorizationError("Not allowed to create tasks.");
  }

  const task = await db.task.create({
    data: {
      orgId: input.orgId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      assignedToUserId: input.assignedToUserId ?? null,
      dueDate: input.dueDate ?? null,
      createdByUserId: input.actorUserId,
    },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
  });

  return task;
}

type UpdateTaskInput = {
  taskId: string;
  orgId: string;
  actorUserId: string;
  actorRole: Role;
  data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToUserId?: string | null;
    dueDate?: Date | null;
  };
};

export async function updateTask(
  input: UpdateTaskInput,
  db: DbClient = prisma,
) {
  const existing = await db.task.findFirst({
    where: { id: input.taskId, orgId: input.orgId },
  });

  if (!existing) {
    throw new NotFoundError("Task not found.");
  }

  if (
    input.actorRole === "MEMBER" &&
    existing.createdByUserId !== input.actorUserId &&
    existing.assignedToUserId !== input.actorUserId
  ) {
    throw new AuthorizationError("Not allowed to update this task.");
  }

  const normalizeString = (value: string | null | undefined) =>
    value === undefined ? undefined : value?.trim() || null;

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const recordChange = (field: string, from: unknown, to: unknown) => {
    if (from !== to) {
      changes[field] = { from, to };
    }
  };

  if (input.data.title !== undefined) {
    const nextTitle = input.data.title.trim();
    recordChange("title", existing.title, nextTitle);
  }

  if (input.data.description !== undefined) {
    const nextDescription = normalizeString(input.data.description);
    recordChange("description", existing.description ?? null, nextDescription);
  }

  if (input.data.status !== undefined) {
    recordChange("status", existing.status, input.data.status);
  }

  if (input.data.priority !== undefined) {
    recordChange("priority", existing.priority, input.data.priority);
  }

  if (input.data.assignedToUserId !== undefined) {
    recordChange(
      "assignedToUserId",
      existing.assignedToUserId ?? null,
      input.data.assignedToUserId,
    );
  }

  if (input.data.dueDate !== undefined) {
    recordChange(
      "dueDate",
      existing.dueDate?.toISOString() ?? null,
      input.data.dueDate?.toISOString() ?? null,
    );
  }

  const statusChanged =
    input.data.status !== undefined && existing.status !== input.data.status;

  const task = await db.task.update({
    where: { id: existing.id },
    data: {
      title: input.data.title?.trim(),
      description:
        input.data.description === undefined
          ? undefined
          : input.data.description?.trim() || null,
      status: input.data.status,
      priority: input.data.priority,
      assignedToUserId:
        input.data.assignedToUserId === undefined
          ? undefined
          : input.data.assignedToUserId,
      dueDate:
        input.data.dueDate === undefined ? undefined : input.data.dueDate,
    },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "task.updated",
    entityType: "Task",
    entityId: task.id,
    metadata: {
      changedFields: Object.keys(changes),
      changes,
    },
  });

  if (statusChanged) {
    await logAuditEvent(db, {
      orgId: input.orgId,
      actorUserId: input.actorUserId,
      action: "task.status.changed",
      entityType: "Task",
      entityId: task.id,
      metadata: {
        priorStatus: existing.status,
        newStatus: task.status,
      },
    });
  }

  return task;
}

type DeleteTaskInput = {
  taskId: string;
  orgId: string;
  actorUserId: string;
  actorRole: Role;
};

export async function deleteTask(
  input: DeleteTaskInput,
  db: DbClient = prisma,
) {
  const existing = await db.task.findFirst({
    where: { id: input.taskId, orgId: input.orgId },
  });

  if (!existing) {
    throw new NotFoundError("Task not found.");
  }

  if (!hasRole(input.actorRole, MANAGE_ROLES)) {
    throw new AuthorizationError("Not allowed to delete tasks.");
  }

  const task = await db.task.delete({
    where: { id: existing.id },
  });

  await logAuditEvent(db, {
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    action: "task.deleted",
    entityType: "Task",
    entityId: task.id,
    metadata: {
      title: task.title,
    },
  });

  return task;
}

type ListTasksInput = {
  orgId: string;
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  assignedToUserId?: string | null;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dateField?: "createdAt" | "dueDate";
};

export async function listTasks(
  input: ListTasksInput,
  db: DbClient = prisma,
) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 50);
  const skip = (page - 1) * pageSize;

  const where: Prisma.TaskWhereInput = {
    orgId: input.orgId,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.assignedToUserId !== undefined) {
    where.assignedToUserId = input.assignedToUserId;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  if (input.dateFrom || input.dateTo) {
    const dateField = input.dateField === "dueDate" ? "dueDate" : "createdAt";
    const range: Prisma.DateTimeFilter = {};
    if (input.dateFrom) {
      range.gte = input.dateFrom;
    }
    if (input.dateTo) {
      range.lte = input.dateTo;
    }
    if (dateField === "dueDate") {
      where.dueDate = range;
    } else {
      where.createdAt = range;
    }
  }

  const [total, items] = await Promise.all([
    db.task.count({ where }),
    db.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
