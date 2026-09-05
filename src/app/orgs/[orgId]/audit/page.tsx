import Link from "next/link";
import { redirect } from "next/navigation";

import { FormattedDate } from "@/components/formatted-date";
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { auditService } from "@/services/audit";
import { membershipService } from "@/services/memberships";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Human labels for the event catalogue. Anything unrecognised falls back to a
 * readable form of the raw action rather than being hidden, so a new event type
 * is never silently invisible to a reviewer.
 */
const ACTION_LABELS: Record<string, string> = {
  "org.created": "Workspace created",
  "org.invite.created": "Invitation sent",
  "org.invite.accepted": "Invitation accepted",
  "org.invite.revoked": "Invitation revoked",
  "org.member.role_updated": "Member role changed",
  "org.member.removed": "Member removed",
  "task.created": "Task created",
  "task.updated": "Task updated",
  "task.status.changed": "Task status changed",
  "task.deleted": "Task deleted",
};

const ACCESS_ACTIONS = new Set([
  "org.invite.created",
  "org.invite.accepted",
  "org.invite.revoked",
  "org.member.role_updated",
  "org.member.removed",
]);

function labelFor(action: string) {
  return (
    ACTION_LABELS[action] ??
    action.replace(/[._]/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

/**
 * Metadata is operator-facing detail, and the audit writer already keeps
 * secrets out of it. This renders scalars only: a nested object would risk
 * printing something unreviewed, so it is summarised instead of dumped.
 */
function describeMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const lines: string[] = [];

  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
      continue;
    }

    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      if (value.length > 0) lines.push(`${key}: ${value.join(", ")}`);
      continue;
    }

    if (typeof value === "object") {
      const inner = value as Record<string, unknown>;
      if ("from" in inner || "to" in inner) {
        lines.push(`${key}: ${String(inner.from ?? "—")} → ${String(inner.to ?? "—")}`);
        continue;
      }
      const changed = Object.keys(inner);
      if (changed.length > 0) lines.push(`${key}: ${changed.join(", ")}`);
    }
  }

  return lines;
}

function readParam(
  source: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = source[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

export default async function AuditPage({ params, searchParams }: PageProps) {
  const { orgId } = await params;
  const query = await searchParams;

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const cursor = readParam(query, "cursor");

  let logs: Awaited<ReturnType<typeof auditService.list>>;
  try {
    logs = await auditService.list({ orgId, userId, cursor, limit: 25 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <Card>
          <SectionHeading title="Audit history" description="You do not have access to this section." />
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            The audit feed is available to admins and managers. Members cannot
            read organization activity.
          </p>
        </Card>
      );
    }
    throw error;
  }

  const members = await membershipService.listMembers({ orgId, userId });
  const actorName = new Map(
    members.map((m) => [m.userId, m.user.name || m.user.email] as const),
  );

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeading
          title="Audit history"
          description="Newest first. Records are append-only and cannot be edited or deleted."
        />

        {logs.items.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No activity recorded yet"
              hint="Invitations, role changes, and task lifecycle events will appear here as they happen."
            />
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {logs.items.map((entry) => {
              const details = describeMetadata(entry.metadata);
              const actor = entry.actorUserId
                ? (actorName.get(entry.actorUserId) ?? "A former member")
                : "System";

              return (
                <li key={entry.id} className="card-inset p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{labelFor(entry.action)}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {actor}
                        {entry.entityType ? ` · ${entry.entityType}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ACCESS_ACTIONS.has(entry.action) ? (
                        <Badge tone="accent">Access</Badge>
                      ) : null}
                      <FormattedDate
                        iso={entry.createdAt.toISOString()}
                        mode="datetime"
                        className="text-xs text-[color:var(--muted)]"
                      />
                    </div>
                  </div>

                  {details.length > 0 ? (
                    <dl className="mt-3 grid gap-1 text-xs text-[color:var(--muted-strong)]">
                      {details.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </dl>
                  ) : null}

                  {entry.ip || entry.userAgent ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-[color:var(--muted)]">
                        Request details
                      </summary>
                      <p className="mt-2 break-words text-xs text-[color:var(--muted)]">
                        {entry.ip ? `IP ${entry.ip}` : null}
                        {entry.ip && entry.userAgent ? " · " : null}
                        {entry.userAgent}
                      </p>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {logs.nextCursor ? (
          <nav aria-label="Audit pages" className="mt-5 flex justify-center border-t border-[color:var(--border)] pt-4">
            <Link
              href={`/orgs/${orgId}/audit?cursor=${encodeURIComponent(logs.nextCursor)}`}
              className="btn btn-secondary btn-sm"
            >
              Load older events
            </Link>
          </nav>
        ) : null}

        {cursor ? (
          <p className="mt-3 text-center">
            <Link href={`/orgs/${orgId}/audit`} className="text-xs text-[color:var(--muted)] underline">
              Back to newest
            </Link>
          </p>
        ) : null}
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
