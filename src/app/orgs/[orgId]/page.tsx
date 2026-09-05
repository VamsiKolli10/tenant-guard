import { TaskPriority, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
} from "./actions";
import { ConfirmButton } from "@/components/confirm-button";
import { FormattedDate } from "@/components/formatted-date";
import { SubmitButton } from "@/components/submit-button";
import {
  Alert,
  Card,
  DueBadge,
  EmptyState,
  Field,
  PriorityBadge,
  SectionHeading,
  TaskStatusBadge,
} from "@/components/ui";
import { getSessionUserId } from "@/server/session";
import { membershipService } from "@/services/memberships";
import { taskService } from "@/services/tasks";
import { requireMembership } from "@/services/tenancy";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const NOTICE_KEYS = new Set(["error", "notice"]);

function readParam(
  source: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = source[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

export default async function TasksPage({ params, searchParams }: PageProps) {
  const { orgId } = await params;
  const query = await searchParams;

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(orgId, userId);
  } catch {
    redirect("/dashboard");
  }

  const canAdminister = membership.role === "ADMIN" || membership.role === "MANAGER";

  const statusParam = readParam(query, "status");
  const assigneeParam = readParam(query, "assignedToUserId");
  const searchParam = readParam(query, "search");
  const fromParam = readParam(query, "from");
  const toParam = readParam(query, "to");
  const pageParam = Number(readParam(query, "page") ?? "1");
  const sortParam = readParam(query, "sort");
  const sort =
    sortParam === "dueDate" || sortParam === "priority" ? sortParam : "created";

  const status = Object.values(TaskStatus).includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : undefined;
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const now = new Date();
  const tasks = await taskService.listTasks({
    orgId,
    userId,
    sort,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    filters: {
      status,
      assignedToUserId: assigneeParam,
      search: searchParam,
      dateFrom: from && !Number.isNaN(from.valueOf()) ? from : undefined,
      dateTo: to && !Number.isNaN(to.valueOf()) ? to : undefined,
    },
  });

  const members = canAdminister
    ? await membershipService.listMembers({ orgId, userId })
    : [];
  const nameFor = new Map(
    members.map((m) => [m.userId, m.user.name || m.user.email] as const),
  );

  const resolveAssignee = (assignedToUserId: string | null) => {
    if (!assignedToUserId) return "Unassigned";
    if (assignedToUserId === userId) return "You";
    return nameFor.get(assignedToUserId) ?? "A teammate";
  };

  const buildLink = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (!single || NOTICE_KEYS.has(key)) continue;
      next.set(key, single);
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/orgs/${orgId}?${qs}` : `/orgs/${orgId}`;
  };

  const returnTo = buildLink({});
  const error = readParam(query, "error");
  const notice = readParam(query, "notice");
  const hasFilters = Boolean(
    status || assigneeParam || searchParam || fromParam || toParam || sortParam,
  );

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <SectionHeading
              title="Tasks"
              description={`${tasks.total} ${tasks.total === 1 ? "task" : "tasks"} in this workspace`}
            />

            <form method="get" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Search" htmlFor="search">
                <input
                  id="search"
                  type="search"
                  name="search"
                  defaultValue={searchParam ?? ""}
                  placeholder="Title or description"
                  className="input"
                />
              </Field>

              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={statusParam ?? ""} className="select">
                  <option value="">Any status</option>
                  <option value={TaskStatus.TODO}>Todo</option>
                  <option value={TaskStatus.IN_PROGRESS}>In progress</option>
                  <option value={TaskStatus.DONE}>Done</option>
                </select>
              </Field>

              <Field label="Assignee" htmlFor="assignedToUserId">
                <select
                  id="assignedToUserId"
                  name="assignedToUserId"
                  defaultValue={assigneeParam ?? ""}
                  className="select"
                >
                  <option value="">Anyone</option>
                  <option value={userId}>Me</option>
                  {members
                    .filter((m) => m.userId !== userId)
                    .map((m) => (
                      <option key={m.id} value={m.userId}>
                        {m.user.name || m.user.email}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Created from" htmlFor="from">
                <input id="from" type="date" name="from" defaultValue={fromParam ?? ""} className="input" />
              </Field>

              <Field label="Created to" htmlFor="to">
                <input id="to" type="date" name="to" defaultValue={toParam ?? ""} className="input" />
              </Field>

              <Field label="Sort by" htmlFor="sort">
                <select id="sort" name="sort" defaultValue={sort} className="select">
                  <option value="created">Newest first</option>
                  <option value="dueDate">Due date</option>
                  <option value="priority">Priority</option>
                </select>
              </Field>

              <div className="flex items-end gap-2">
                <button type="submit" className="btn btn-primary">
                  Apply filters
                </button>
                {hasFilters ? (
                  <Link href={`/orgs/${orgId}`} className="btn btn-secondary">
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              {tasks.items.length === 0 ? (
                <EmptyState
                  title={hasFilters ? "No tasks match these filters" : "No tasks yet"}
                  hint={
                    hasFilters
                      ? "Try widening the date range or clearing the status filter."
                      : "Create the first task using the form beside this list."
                  }
                  action={
                    hasFilters ? (
                      <Link href={`/orgs/${orgId}`} className="btn btn-secondary btn-sm">
                        Clear filters
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {tasks.items.map((task) => {
                    const isCreator = task.createdByUserId === userId;
                    const isAssignee = task.assignedToUserId === userId;
                    const canChangeStatus = canAdminister || isCreator || isAssignee;
                    const canDelete = canAdminister;

                    return (
                      <li key={task.id} className="card-inset p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{task.title}</p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                              {resolveAssignee(task.assignedToUserId)}
                              {task.dueDate ? (
                                <>
                                  {" · due "}
                                  <FormattedDate iso={task.dueDate.toISOString()} />
                                </>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {task.dueDate && task.status !== "DONE" ? (
                              <DueBadge due={task.dueDate} now={now} />
                            ) : null}
                            <TaskStatusBadge status={task.status} />
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </div>

                        {task.description ? (
                          <p className="mt-3 text-sm text-[color:var(--muted-strong)]">
                            {task.description}
                          </p>
                        ) : null}

                        {canChangeStatus || canDelete ? (
                          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] pt-3">
                            {canChangeStatus ? (
                              <form action={updateTaskStatusAction} className="flex items-center gap-2">
                                <input type="hidden" name="orgId" value={orgId} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input type="hidden" name="taskId" value={task.id} />
                                <label htmlFor={`status-${task.id}`} className="text-xs text-[color:var(--muted)]">
                                  Status
                                </label>
                                <select
                                  id={`status-${task.id}`}
                                  name="status"
                                  defaultValue={task.status}
                                  className="select w-auto py-1 text-xs"
                                >
                                  <option value={TaskStatus.TODO}>Todo</option>
                                  <option value={TaskStatus.IN_PROGRESS}>In progress</option>
                                  <option value={TaskStatus.DONE}>Done</option>
                                </select>
                                <button type="submit" className="btn btn-secondary btn-sm">
                                  Save
                                </button>
                              </form>
                            ) : null}

                            {canDelete ? (
                              <form action={deleteTaskAction} className="ml-auto">
                                <input type="hidden" name="orgId" value={orgId} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input type="hidden" name="taskId" value={task.id} />
                                <ConfirmButton
                                  label="Delete"
                                  confirmLabel="Delete permanently"
                                  question={`Delete "${task.title}"?`}
                                />
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {tasks.totalPages > 1 ? (
              <nav
                aria-label="Task pages"
                className="mt-5 flex items-center justify-between border-t border-[color:var(--border)] pt-4 text-sm text-[color:var(--muted)]"
              >
                <span>
                  Page {tasks.page} of {tasks.totalPages}
                </span>
                <div className="flex gap-2">
                  {tasks.page > 1 ? (
                    <Link
                      href={buildLink({ page: String(tasks.page - 1) })}
                      className="btn btn-secondary btn-sm"
                      rel="prev"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {tasks.page < tasks.totalPages ? (
                    <Link
                      href={buildLink({ page: String(tasks.page + 1) })}
                      className="btn btn-secondary btn-sm"
                      rel="next"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </Card>
        </div>

        <Card as="aside">
          <SectionHeading title="Create a task" description="Every member can add work." />
          <form action={createTaskAction} className="mt-5 space-y-4">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="returnTo" value={returnTo} />

            <Field label="Title" htmlFor="title">
              <input id="title" name="title" required minLength={2} maxLength={200} className="input" />
            </Field>

            <Field label="Description" htmlFor="description" hint="Optional context for whoever picks this up.">
              <textarea id="description" name="description" rows={3} maxLength={2000} className="textarea" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" htmlFor="new-status">
                <select id="new-status" name="status" defaultValue={TaskStatus.TODO} className="select">
                  <option value={TaskStatus.TODO}>Todo</option>
                  <option value={TaskStatus.IN_PROGRESS}>In progress</option>
                  <option value={TaskStatus.DONE}>Done</option>
                </select>
              </Field>

              <Field label="Priority" htmlFor="priority">
                <select id="priority" name="priority" defaultValue={TaskPriority.MEDIUM} className="select">
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                </select>
              </Field>
            </div>

            <Field label="Due date" htmlFor="dueDate">
              <input id="dueDate" type="date" name="dueDate" className="input" />
            </Field>

            {canAdminister ? (
              <Field label="Assign to" htmlFor="assign">
                <select id="assign" name="assignedToUserId" defaultValue="" className="select">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.userId}>
                      {m.user.name || m.user.email}
                      {m.userId === userId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <input type="hidden" name="assignedToUserId" value="" />
            )}

            <SubmitButton className="btn btn-primary w-full" pendingLabel="Creating…">
              Create task
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
