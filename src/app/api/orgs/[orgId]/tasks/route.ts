import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { taskService } from "@/services/tasks";

type Params = {
  params: { orgId: string };
};

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignee: z.string().optional(),
  assignedToUserId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  dateField: z.enum(["createdAt", "dueDate"]).optional(),
});

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedToUserId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export async function GET(req: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const url = new URL(req.url);
  const getParam = (key: string) => {
    const value = url.searchParams.get(key);
    return value && value.length > 0 ? value : undefined;
  };

  const rawStatus = getParam("status");
  const normalizedStatus = rawStatus
    ? rawStatus.toUpperCase().replace("-", "_")
    : undefined;
  const statusValue =
    normalizedStatus === "OPEN" ? TaskStatus.TODO : normalizedStatus;

  const parsed = listSchema.safeParse({
    page: getParam("page"),
    limit: getParam("limit"),
    pageSize: getParam("pageSize"),
    status: statusValue,
    assignee: getParam("assignee"),
    assignedToUserId: getParam("assignedToUserId"),
    search: getParam("search"),
    dateFrom: getParam("from"),
    dateTo: getParam("to"),
    dateField: getParam("dateField"),
  });

  if (!parsed.success) {
    return jsonError("Invalid query parameters.");
  }

  const assignee = parsed.data.assignee ?? parsed.data.assignedToUserId;
  const normalizedAssignee = assignee?.toLowerCase();
  const assignedToUserId =
    normalizedAssignee === "me"
      ? userId
      : normalizedAssignee === "unassigned"
        ? null
        : assignee;

  try {
    const result = await taskService.listTasks({
      orgId: params.orgId,
      userId,
      page: parsed.data.page,
      limit: parsed.data.pageSize ?? parsed.data.limit,
      filters: {
        status: parsed.data.status,
        assignedToUserId,
        search: parsed.data.search,
        dateFrom: parsed.data.dateFrom,
        dateTo: parsed.data.dateTo,
        dateField: parsed.data.dateField,
      },
    });

    return Response.json({
      data: result.items,
      page: result.page,
      limit: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to load tasks.";
    return jsonError(message, 400);
  }
}

export async function POST(req: Request, { params }: Params) {
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

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid task details.");
  }

  try {
    const task = await taskService.createTask({
      orgId: params.orgId,
      userId,
      payload: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assignedToUserId: parsed.data.assignedToUserId ?? null,
        dueDate: parsed.data.dueDate ?? null,
      },
    });

    return jsonOk(task, 201);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to create task.";
    return jsonError(message, 400);
  }
}
