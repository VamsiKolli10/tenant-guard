import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { taskService } from "@/services/tasks";

type Params = {
  params: { orgId: string; taskId: string };
};

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedToUserId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export async function GET(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const task = await taskService.getTask({
      orgId: params.orgId,
      userId,
      taskId: params.taskId,
    });

    return jsonOk(task);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof NotFoundError) {
      return jsonError(error.message, 404);
    }
    const message = error instanceof Error ? error.message : "Unable to load task.";
    return jsonError(message, 400);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid JSON payload.");
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid task details.");
  }

  try {
    const task = await taskService.updateTask({
      orgId: params.orgId,
      userId,
      taskId: params.taskId,
      payload: {
        title: parsed.data.title,
        description:
          parsed.data.description === undefined ? undefined : parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assignedToUserId:
          parsed.data.assignedToUserId === undefined
            ? undefined
            : parsed.data.assignedToUserId,
        dueDate:
          parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate,
      },
    });

    return jsonOk(task);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof NotFoundError) {
      return jsonError(error.message, 404);
    }
    const message = error instanceof Error ? error.message : "Unable to update task.";
    return jsonError(message, 400);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const task = await taskService.deleteTask({
      orgId: params.orgId,
      userId,
      taskId: params.taskId,
    });

    return jsonOk(task);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof NotFoundError) {
      return jsonError(error.message, 404);
    }
    const message = error instanceof Error ? error.message : "Unable to delete task.";
    return jsonError(message, 400);
  }
}
