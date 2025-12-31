import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitePanel } from "@/components/invite-panel";
import { getSessionUserId } from "@/server/session";
import { membershipService } from "@/services/memberships";
import { orgService } from "@/services/organizations";
import { taskService } from "@/services/tasks";
import { requireMembership } from "@/services/tenancy";

type PageProps = {
  params: { orgId: string };
  searchParams: Record<string, string | string[] | undefined>;
};

async function createTaskAction(formData: FormData) {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const orgId = String(formData.get("orgId") || "");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status = String(formData.get("status") || "TODO") as TaskStatus;
  const priority = String(formData.get("priority") || "MEDIUM") as TaskPriority;
  const assignedToUserId = String(formData.get("assignedToUserId") || "").trim();

  if (!title) {
    return;
  }

  try {
    await taskService.createTask({
      orgId,
      userId,
      payload: {
        title,
        description: description || undefined,
        status: Object.values(TaskStatus).includes(status) ? status : "TODO",
        priority: Object.values(TaskPriority).includes(priority) ? priority : "MEDIUM",
        assignedToUserId: assignedToUserId || null,
      },
    });
  } catch {
    return;
  }

  redirect(`/orgs/${orgId}`);
}

async function changeRoleAction(formData: FormData) {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const orgId = String(formData.get("orgId") || "");
  const memberUserId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "") as Role;

  if (!Object.values(Role).includes(role)) {
    return;
  }

  try {
    await membershipService.changeRole({
      orgId,
      userId,
      memberUserId,
      role,
    });
  } catch {
    return;
  }

  redirect(`/orgs/${orgId}`);
}

export default async function OrgPage({ params, searchParams }: PageProps) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(params.orgId, userId);
  } catch {
    redirect("/dashboard");
  }

  let org: Awaited<ReturnType<typeof orgService.getOrg>>;
  try {
    org = await orgService.getOrg({
      orgId: params.orgId,
      userId,
    });
  } catch {
    redirect("/dashboard");
  }

  const rawPage = typeof searchParams.page === "string" ? Number(searchParams.page) : undefined;
  const rawPageSize =
    typeof searchParams.pageSize === "string" ? Number(searchParams.pageSize) : undefined;
  const page = rawPage && Number.isFinite(rawPage) ? rawPage : undefined;
  const pageSize = rawPageSize && Number.isFinite(rawPageSize) ? rawPageSize : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const assignedToUserIdParam =
    typeof searchParams.assignedToUserId === "string"
      ? searchParams.assignedToUserId
      : undefined;
  const searchParam = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const fromParam = typeof searchParams.from === "string" ? new Date(searchParams.from) : undefined;
  const toParam = typeof searchParams.to === "string" ? new Date(searchParams.to) : undefined;
  const fromValue = typeof searchParams.from === "string" ? searchParams.from : "";
  const toValue = typeof searchParams.to === "string" ? searchParams.to : "";

  const status = statusParam && Object.values(TaskStatus).includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : undefined;

  const dateFrom = fromParam && !Number.isNaN(fromParam.valueOf()) ? fromParam : undefined;
  const dateTo = toParam && !Number.isNaN(toParam.valueOf()) ? toParam : undefined;

  const tasksResult = await taskService.listTasks({
    orgId: params.orgId,
    userId,
    page,
    limit: pageSize,
    filters: {
      status,
      assignedToUserId: assignedToUserIdParam,
      search: searchParam,
      dateFrom,
      dateTo,
    },
  });

  const canViewMembers = membership.role === "ADMIN" || membership.role === "MANAGER";
  const members = canViewMembers
    ? await membershipService.listMembers({
        orgId: params.orgId,
        userId,
      })
    : [];
  const memberMap = new Map(
    members.map((member) => [member.userId, member.user?.name || member.user?.email || ""] as const),
  );

  const resolveAssignee = (assignedToUserId: string | null) => {
    if (!assignedToUserId) {
      return "Unassigned";
    }
    if (assignedToUserId === userId) {
      return "You";
    }
    return memberMap.get(assignedToUserId) || "Assigned";
  };

  const canCreateTasks = true;
  const buildPageLink = (nextPage: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (!value || key === "page") {
        continue;
      }
      query.set(key, Array.isArray(value) ? value[0] : value);
    }
    query.set("page", String(nextPage));
    return `/orgs/${params.orgId}?${query.toString()}`;
  };

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Organization
            </p>
            <h1 className="font-display text-3xl">{org.name}</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Your role: {membership.role}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm transition hover:bg-[color:var(--surface)]"
          >
            Back to dashboard
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
              <h2 className="font-display text-xl">Tasks</h2>
              <form
                method="get"
                className="mt-4 flex flex-wrap items-end gap-3 text-sm"
              >
                <label className="flex flex-col gap-2">
                  Search
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchParam || ""}
                    className="min-w-[200px] rounded-xl border border-[color:var(--border)] bg-white px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Status
                  <select
                    name="status"
                    defaultValue={statusParam || ""}
                    className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2"
                  >
                    <option value="">Any</option>
                    <option value={TaskStatus.TODO}>Todo</option>
                    <option value={TaskStatus.IN_PROGRESS}>In progress</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  Assignee
                  <select
                    name="assignedToUserId"
                    defaultValue={assignedToUserIdParam || ""}
                    className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2"
                  >
                    <option value="">Anyone</option>
                    {canViewMembers ? (
                      members.map((member) => (
                        <option key={member.id} value={member.userId}>
                          {member.user?.name || member.user?.email}
                        </option>
                      ))
                    ) : (
                      <option value={userId}>You</option>
                    )}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  From
                  <input
                    type="date"
                    name="from"
                    defaultValue={fromValue}
                    className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  To
                  <input
                    type="date"
                    name="to"
                    defaultValue={toValue}
                    className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-semibold text-[color:var(--surface)] transition hover:opacity-90"
                >
                  Filter
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {tasksResult.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-white/70 px-4 py-6 text-sm text-[color:var(--muted)]">
                    No tasks match your filters yet.
                  </div>
                ) : (
                  tasksResult.items.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {task.status.replace("_", " ")} •{" "}
                            {task.priority.toLowerCase()} priority •{" "}
                            {resolveAssignee(task.assignedToUserId)}
                          </p>
                        </div>
                        <span className="text-xs text-[color:var(--muted)]">
                          {task.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      {task.description ? (
                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>
                  Page {tasksResult.page} of {tasksResult.totalPages}
                </span>
                <div className="flex gap-2">
                  {tasksResult.page > 1 ? (
                    <Link
                      href={buildPageLink(tasksResult.page - 1)}
                      className="rounded-full border border-[color:var(--border)] px-3 py-1"
                    >
                      Prev
                    </Link>
                  ) : null}
                  {tasksResult.page < tasksResult.totalPages ? (
                    <Link
                      href={buildPageLink(tasksResult.page + 1)}
                      className="rounded-full border border-[color:var(--border)] px-3 py-1"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {canCreateTasks ? (
              <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <h2 className="font-display text-xl">Create a task</h2>
                <form action={createTaskAction} className="mt-4 space-y-4 text-sm">
                  <input type="hidden" name="orgId" value={params.orgId} />
                  <label className="flex flex-col gap-2">
                    Title
                    <input
                      type="text"
                      name="title"
                      required
                      className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    Description
                    <textarea
                      name="description"
                      rows={3}
                      className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-2">
                      Status
                      <select
                        name="status"
                        className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
                      >
                        <option value={TaskStatus.TODO}>Todo</option>
                        <option value={TaskStatus.IN_PROGRESS}>In progress</option>
                        <option value={TaskStatus.DONE}>Done</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      Priority
                      <select
                        name="priority"
                        defaultValue={TaskPriority.MEDIUM}
                        className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
                      >
                        <option value={TaskPriority.LOW}>Low</option>
                        <option value={TaskPriority.MEDIUM}>Medium</option>
                        <option value={TaskPriority.HIGH}>High</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      Assignee
                      <select
                        name="assignedToUserId"
                        className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
                      >
                        <option value="">Unassigned</option>
                        {canViewMembers ? (
                          members.map((member) => (
                            <option key={member.id} value={member.userId}>
                              {member.user?.name || member.user?.email}
                            </option>
                          ))
                        ) : (
                          <option value={userId}>You</option>
                        )}
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    Create task
                  </button>
                </form>
              </section>
            ) : null}
          </section>

          <aside className="space-y-6">
            <InvitePanel
              orgId={params.orgId}
              canInvite={membership.role === "ADMIN" || membership.role === "MANAGER"}
            />

            {canViewMembers ? (
              <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <h2 className="font-display text-xl">Members</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-3"
                    >
                      <p className="font-medium">
                        {member.user?.name || member.user?.email}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {member.user?.email}
                      </p>
                      {membership.role === "ADMIN" ? (
                        <form
                          action={changeRoleAction}
                          className="mt-2 flex items-center gap-2"
                        >
                          <input type="hidden" name="orgId" value={params.orgId} />
                          <input type="hidden" name="userId" value={member.userId} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-xl border border-[color:var(--border)] bg-white px-2 py-1 text-xs"
                          >
                            <option value={Role.ADMIN}>Admin</option>
                            <option value={Role.MANAGER}>Manager</option>
                            <option value={Role.MEMBER}>Member</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-full border border-[color:var(--border)] px-2 py-1 text-xs"
                          >
                            Update
                          </button>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          Role: {member.role}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <h2 className="font-display text-xl">Members</h2>
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  Member rosters are visible to admins and managers only.
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
