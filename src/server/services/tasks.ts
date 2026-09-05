import type { Prisma, Role, TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { hasRole } from "@/server/rbac";
import { logAuditEvent } from "@/server/services/audit";
import type { DbClient } from "@/server/services/types";

const CREATE_ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];
const MANAGE_ROLES: Role[] = ["ADMIN", "MANAGER"];

/**
 * What a MEMBER may change on a task that was assigned to them but which they
 * did not create: they advance their own work, they do not re-plan it. Notably
 * this keeps `assignedToUserId` out of reach, so a member cannot push work
 * back onto someone else. Members retain full edit rights on tasks they
 * created themselves.
 */
const ASSIGNEE_EDITABLE_FIELDS = new Set(["status", "priority"]);

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

  if (input.assignedToUserId) {
    const assigneeMembership = await db.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.assignedToUserId,
          orgId: input.orgId,
        },
      },
    });
    if (!assigneeMembership) {
      throw new AuthorizationError("Assignee must be an organization member.");
    }
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

  if (input.actorRole === "MEMBER") {
    const isCreator = existing.createdByUserId === input.actorUserId;
    const isAssignee = existing.assignedToUserId === input.actorUserId;

    if (!isCreator && !isAssignee) {
      throw new AuthorizationError("Not allowed to update this task.");
    }

    if (!isCreator) {
      const requestedFields = Object.entries(input.data)
        .filter(([, value]) => value !== undefined)
        .map(([field]) => field);
      const disallowed = requestedFields.filter(
        (field) => !ASSIGNEE_EDITABLE_FIELDS.has(field),
      );

      if (disallowed.length > 0) {
        throw new AuthorizationError(
          `Members may only change ${[...ASSIGNEE_EDITABLE_FIELDS].join(" and ")} on a task assigned to them.`,
        );
      }
    }
  }


  if (input.data.assignedToUserId) {
    const assigneeMembership = await db.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.data.assignedToUserId,
          orgId: input.orgId,
        },
      },
    });
    if (!assigneeMembership) {
      throw new AuthorizationError("Assignee must be an organization member.");
    }
  }

  type ChangeValue = string | number | boolean | null;
  const changes: Record<string, Prisma.InputJsonObject> = {};
  const recordChange = (field: string, from: ChangeValue, to: ChangeValue) => {
    if (from !== to) {
      changes[field] = { from, to };
    }
  };

  if (input.data.title !== undefined) {
    const nextTitle = input.data.title.trim();
    recordChange("title", existing.title, nextTitle);
  }

  if (input.data.description !== undefined) {
    const nextDescription = input.data.description?.trim() || null;
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
    // orgId in the filter, not just the guard: correctness must not depend on
    // ambient context being visible.
    where: { id: existing.id, orgId: input.orgId },
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
    where: { id: existing.id, orgId: input.orgId },
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

export type TaskSort = "created" | "dueDate" | "priority";

/**
 * Priority is an enum, and Postgres orders enums by declaration order — LOW,
 * MEDIUM, HIGH — so "highest first" is descending. Due date sorts ascending
 * with nulls last, because a task with no date is not urgent, it is unscheduled.
 */
const ORDER_BY: Record<TaskSort, Prisma.TaskOrderByWithRelationInput[]> = {
  created: [{ createdAt: "desc" }],
  dueDate: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  priority: [{ priority: "desc" }, { createdAt: "desc" }],
};

type ListTasksInput = {
  orgId: string;
  sort?: TaskSort;
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
      orderBy: ORDER_BY[input.sort ?? "created"],
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
