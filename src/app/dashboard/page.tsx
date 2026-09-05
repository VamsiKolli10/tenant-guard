import Link from "next/link";
import { redirect } from "next/navigation";

import { FormattedDate } from "@/components/formatted-date";
import { SubmitButton } from "@/components/submit-button";
import { getSessionUserId } from "@/server/session";
import { orgService } from "@/services/organizations";

async function createOrgAction(formData: FormData) {
  "use server";

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return;
  }

  const org = await orgService.createOrg({ name, userId });
  redirect(`/orgs/${org.id}`);
}

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const orgs = await orgService.listOrgsForUser(userId);

  return (
    <main className="page-wash min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="font-display text-3xl">Your organizations</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings" className="btn btn-secondary btn-sm">
              Account settings
            </Link>
            <Link href="/" className="btn btn-secondary btn-sm">
              Home
            </Link>
          </div>
        </header>

        <section className="card p-6">
          <h2 className="font-display text-xl">Create a new org</h2>
          <form action={createOrgAction} className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              name="name"
              placeholder="Organization name"
              required
              className="min-w-[240px] flex-1 input"
            />
            <SubmitButton pendingLabel="Creating…">Create org</SubmitButton>
          </form>
        </section>

        <section className="space-y-4">
          {orgs.length === 0 ? (
            <div className="empty-state">
              <p className="font-medium text-[color:var(--muted-strong)]">
                No workspaces yet
              </p>
              <p className="mt-1">
                Create one above to start inviting your team.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/orgs/${org.id}`}
                  className="card-inset block p-5 transition hover:border-[color:var(--accent)]"
                >
                  <p className="eyebrow">Workspace</p>
                  <p className="mt-2 font-display text-xl">{org.name}</p>
                  <p className="mt-3 text-xs text-[color:var(--muted)]">
                    Created <FormattedDate iso={org.createdAt.toISOString()} />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
