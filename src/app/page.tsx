import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/server/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen px-6 py-10 text-[color:var(--foreground)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-tight">
            Tenant Guard
          </span>
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            MVP
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full border border-transparent px-4 py-2 transition hover:border-[color:var(--border)]"
              >
                Dashboard
              </Link>
              <SignOutButton className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--surface)] transition hover:opacity-90" />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full border border-[color:var(--border)] px-4 py-2 transition hover:bg-[color:var(--surface)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-[color:var(--surface)] transition hover:opacity-90"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto mt-16 grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="font-display text-5xl leading-[1.05] tracking-tight">
            Secure, auditable workspaces for every tenant and team.
          </p>
          <p className="max-w-xl text-lg text-[color:var(--muted)]">
            Tenant Guard keeps your organization boundaries crisp with strict
            RBAC, shareable invite links, and task workflows that stay accountable
            with a full audit trail.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={session?.user ? "/dashboard" : "/signup"}
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--accent)]/30 transition hover:-translate-y-0.5"
            >
              {session?.user ? "Open dashboard" : "Start in minutes"}
            </Link>
            <Link
              href="#features"
              className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold transition hover:bg-[color:var(--surface)]"
            >
              See what ships
            </Link>
          </div>
          <div className="flex items-center gap-6 text-sm text-[color:var(--muted)]">
            <div>
              <span className="font-semibold text-[color:var(--foreground)]">
                3 roles
              </span>{" "}
              for layered access
            </div>
            <div>
              <span className="font-semibold text-[color:var(--foreground)]">
                100%
              </span>{" "}
              audit coverage
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl shadow-black/5">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Live controls</h2>
              <span className="rounded-full bg-[color:var(--accent-2)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--accent-2)]">
                RBAC core
              </span>
            </div>
            <ul className="space-y-4 text-sm text-[color:var(--muted)]">
              {[
                "Admin-only invite issuance with expiring links",
                "Membership checks on every sensitive endpoint",
                "Task filters with pagination and search",
                "Audit events for task deletes and role changes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-white/60 p-4 text-xs text-[color:var(--muted)]">
              Wire it to your tenant data and ship with confidence. Everything
              in this MVP is backed by Prisma + Postgres and testable service
              APIs.
            </div>
          </div>
        </section>
      </main>

      <section
        id="features"
        className="mx-auto mt-20 w-full max-w-6xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 p-8"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Organizations + invites",
              body: "Create orgs, invite teammates by email or link, and accept securely.",
            },
            {
              title: "Tasks with filters",
              body: "Paginated lists with status, assignee, search, and date windows.",
            },
            {
              title: "Audit-ready",
              body: "Track role changes, invite lifecycle, and task deletions.",
            },
          ].map((feature) => (
            <div key={feature.title} className="space-y-3">
              <h3 className="font-display text-xl">{feature.title}</h3>
              <p className="text-sm text-[color:var(--muted)]">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
