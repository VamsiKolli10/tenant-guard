import "server-only";

import type { TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  listTasks as listTaskRecords,
  updateTask as updateTaskRecord,
} from "@/server/services/tasks";
import { requireMembership } from "@/services/tenancy";

type TaskFilters = {
  status?: TaskStatus;
  assignedToUserId?: string | null;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dateField?: "createdAt" | "dueDate";
};

type ListTasksInput = {
  orgId: string;
  userId: string;
  filters?: TaskFilters;
  page?: number;
  limit?: number;
};

type CreateTaskInput = {
  orgId: string;
  userId: string;
  payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToUserId?: string | null;
    dueDate?: Date | null;
  };
};

type UpdateTaskInput = {
  orgId: string;
  userId: string;
  taskId: string;
  payload: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToUserId?: string | null;
    dueDate?: Date | null;
  };
};

type DeleteTaskInput = {
  orgId: string;
  userId: string;
  taskId: string;
};

type GetTaskInput = {
  orgId: string;
  userId: string;
  taskId: string;
};

export const taskService = {
  async listTasks(input: ListTasksInput) {
    await requireMembership(input.orgId, input.userId);

    return listTaskRecords({
      orgId: input.orgId,
      page: input.page,
      pageSize: input.limit,
      status: input.filters?.status,
      assignedToUserId: input.filters?.assignedToUserId,
      search: input.filters?.search,
      dateFrom: input.filters?.dateFrom,
      dateTo: input.filters?.dateTo,
      dateField: input.filters?.dateField,
    });
  },

  async getTask(input: GetTaskInput) {
    await requireMembership(input.orgId, input.userId);

    const task = await prisma.task.findFirst({
      where: { id: input.taskId, orgId: input.orgId },
    });

    if (!task) {
      throw new NotFoundError("Task not found.");
    }

    return task;
  },

  async createTask(input: CreateTaskInput) {
    const membership = await requireMembership(input.orgId, input.userId);

    return createTaskRecord({
      orgId: input.orgId,
      title: input.payload.title,
      description: input.payload.description,
      status: input.payload.status,
      priority: input.payload.priority,
      assignedToUserId: input.payload.assignedToUserId ?? null,
      dueDate: input.payload.dueDate ?? null,
      actorUserId: input.userId,
      actorRole: membership.role,
    });
  },

  async updateTask(input: UpdateTaskInput) {
    const membership = await requireMembership(input.orgId, input.userId);

    return updateTaskRecord({
      orgId: input.orgId,
      taskId: input.taskId,
      actorUserId: input.userId,
      actorRole: membership.role,
      data: {
        title: input.payload.title,
        description:
          input.payload.description === undefined
            ? undefined
            : input.payload.description,
        status: input.payload.status,
        priority: input.payload.priority,
        assignedToUserId:
          input.payload.assignedToUserId === undefined
            ? undefined
            : input.payload.assignedToUserId,
        dueDate:
          input.payload.dueDate === undefined
            ? undefined
            : input.payload.dueDate,
      },
    });
  },

  async deleteTask(input: DeleteTaskInput) {
    const membership = await requireMembership(input.orgId, input.userId);

    return deleteTaskRecord({
      orgId: input.orgId,
      taskId: input.taskId,
      actorUserId: input.userId,
      actorRole: membership.role,
    });
  },
};
