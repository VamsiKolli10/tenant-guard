"use server";

import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";
import { membershipService } from "@/services/memberships";
import { taskService } from "@/services/tasks";

/**
 * Server actions for the workspace. Each one redirects back to the surface it
 * was invoked from, carrying either an error or a success message in the query
 * string so the page can announce the outcome — the PRD requires every
 * mutation to have visible success and error states.
 */

function safeReturnTo(orgId: string, returnTo: string) {
  const fallback = `/orgs/${orgId}`;
  if (!returnTo.startsWith(`/orgs/${orgId}`)) {
    return fallback;
  }
  return returnTo;
}

function withParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function withoutParams(path: string, keys: string[]) {
  const url = new URL(path, "http://localhost");
  for (const key of keys) {
    url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}`;
}

const NOTICE_KEYS = ["error", "notice"];

/**
 * Form values arrive as strings. Anything not in the enum is dropped rather
 * than forwarded, so a hand-crafted POST cannot push an unknown value into the
 * service layer.
 */
function asStatus(value: string): TaskStatus | undefined {
  return Object.values(TaskStatus).includes(value as TaskStatus)
    ? (value as TaskStatus)
    : undefined;
}

function asPriority(value: string): TaskPriority | undefined {
  return Object.values(TaskPriority).includes(value as TaskPriority)
    ? (value as TaskPriority)
    : undefined;
}

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }
  return userId;
}

function messageFor(error: unknown, fallback: string) {
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function createTaskAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const title = String(formData.get("title") || "").trim();

  if (title.length < 2) {
    redirect(withParam(returnTo, "error", "A task needs a title of at least two characters."));
  }

  const assignedToUserId = String(formData.get("assignedToUserId") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();

  try {
    await taskService.createTask({
      orgId,
      userId,
      payload: {
        title,
        description: String(formData.get("description") || "").trim() || undefined,
        status: asStatus(String(formData.get("status") || "")),
        priority: asPriority(String(formData.get("priority") || "")),
        assignedToUserId: assignedToUserId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to create task.")));
  }

  redirect(withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Task created."));
}

export async function updateTaskStatusAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const taskId = String(formData.get("taskId") || "");
  const status = asStatus(String(formData.get("status") || ""));

  if (!status) {
    redirect(withParam(returnTo, "error", "Invalid status selection."));
  }

  try {
    await taskService.updateTask({
      orgId,
      userId,
      taskId,
      payload: { status },
    });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to update task.")));
  }

  redirect(withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Task updated."));
}

export async function deleteTaskAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const taskId = String(formData.get("taskId") || "");

  try {
    await taskService.deleteTask({ orgId, userId, taskId });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to delete task.")));
  }

  redirect(withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Task deleted."));
}

export async function changeRoleAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const memberUserId = String(formData.get("memberUserId") || "");
  const role = String(formData.get("role") || "") as Role;

  if (!Object.values(Role).includes(role)) {
    redirect(withParam(returnTo, "error", "Invalid role selection."));
  }

  try {
    await membershipService.changeRole({ orgId, userId, memberUserId, role });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to update role.")));
  }

  redirect(withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Role updated."));
}

export async function removeMemberAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const memberUserId = String(formData.get("memberUserId") || "");

  try {
    await membershipService.removeMember({ orgId, userId, memberUserId });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to remove member.")));
  }

  redirect(
    withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Member removed from the workspace."),
  );
}

export async function revokeInviteAction(formData: FormData) {
  const userId = await requireUser();

  const orgId = String(formData.get("orgId") || "");
  const returnTo = safeReturnTo(orgId, String(formData.get("returnTo") || ""));
  const inviteId = String(formData.get("inviteId") || "");

  try {
    await inviteService.revokeInvite({ orgId, actorUserId: userId, inviteId });
  } catch (error) {
    redirect(withParam(returnTo, "error", messageFor(error, "Unable to revoke invite.")));
  }

  redirect(withParam(withoutParams(returnTo, NOTICE_KEYS), "notice", "Invite revoked."));
}
