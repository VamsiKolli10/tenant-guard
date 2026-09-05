import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Server-renderable primitives. Styling lives in globals.css against the token
 * set, so these stay thin and no component reaches for a raw colour.
 */

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return <Tag className={`card p-6 ${className}`}>{children}</Tag>;
}

export function SectionHeading({
  title,
  description,
  action,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id={id} className="font-display text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type AlertTone = "danger" | "success" | "warning";

/**
 * Errors and confirmations are announced, not just shown: `role="alert"` for
 * problems the user must notice, polite status for successes.
 */
export function Alert({
  tone,
  children,
}: {
  tone: AlertTone;
  children: ReactNode;
}) {
  const isProblem = tone === "danger";

  return (
    <div
      className={`alert alert-${tone}`}
      role={isProblem ? "alert" : "status"}
      aria-live={isProblem ? "assertive" : "polite"}
    >
      <span aria-hidden="true">{isProblem ? "!" : "✓"}</span>
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="font-medium text-[color:var(--muted-strong)]">{title}</p>
      {hint ? <p className="mt-1">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const suffix = tone === "neutral" ? "" : ` badge-${tone}`;
  return <span className={`badge${suffix}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className="field-label">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? (
        <span id={hintId} className="text-xs text-[color:var(--muted)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Status and priority read as colour plus text, never colour alone. */
export function TaskStatusBadge({ status }: { status: string }) {
  const tone =
    status === "DONE" ? "success" : status === "IN_PROGRESS" ? "accent" : "neutral";
  const label =
    status === "IN_PROGRESS"
      ? "In progress"
      : status.charAt(0) + status.slice(1).toLowerCase();

  return <Badge tone={tone}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "HIGH" ? "danger" : priority === "LOW" ? "neutral" : "warning";
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();

  return <Badge tone={tone}>{label} priority</Badge>;
}

/**
 * Surfaces how a due date sits relative to now.
 *
 * Comparison happens on the server against a calendar day, so it does not
 * depend on the viewer's clock; the date itself is still rendered client-side
 * in the viewer's timezone. Overdue reads as danger, due-today and tomorrow as
 * a warning, anything further out stays neutral — urgency should be visible
 * without reading dates.
 */
export function DueBadge({ due, now }: { due: Date; now: Date }) {
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);

  if (days < 0) {
    return (
      <Badge tone="danger">
        Overdue by {Math.abs(days)} {Math.abs(days) === 1 ? "day" : "days"}
      </Badge>
    );
  }
  if (days === 0) return <Badge tone="warning">Due today</Badge>;
  if (days === 1) return <Badge tone="warning">Due tomorrow</Badge>;
  if (days <= 7) return <Badge tone="neutral">Due in {days} days</Badge>;
  return null;
}

export function RoleBadge({ role }: { role: string }) {
  const tone = role === "ADMIN" ? "accent" : role === "MANAGER" ? "warning" : "neutral";
  const label = role.charAt(0) + role.slice(1).toLowerCase();

  return <Badge tone={tone}>{label}</Badge>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-secondary btn-sm">
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
