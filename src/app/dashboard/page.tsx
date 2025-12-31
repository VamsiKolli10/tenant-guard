import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUserId } from "@/server/session";
import {
  createOrganization,
  listOrganizationsForUser,
} from "@/server/services/organizations";

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

  const org = await createOrganization({ name, ownerId: userId });
  redirect(`/orgs/${org.id}`);
}

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const orgs = await listOrganizationsForUser(userId);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Dashboard
            </p>
            <h1 className="font-display text-3xl">Your organizations</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm transition hover:bg-[color:var(--surface)]"
          >
            Back to home
          </Link>
        </header>

        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="font-display text-xl">Create a new org</h2>
          <form action={createOrgAction} className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              name="name"
              placeholder="Organization name"
              required
              className="min-w-[240px] flex-1 rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
            />
            <button
              type="submit"
              className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Create org
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {orgs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-white/60 p-6 text-sm text-[color:var(--muted)]">
              No organizations yet. Create one to start inviting your team.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/orgs/${org.id}`}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5 transition hover:-translate-y-0.5"
                >
                  <p className="text-sm text-[color:var(--muted)]">
                    Organization
                  </p>
                  <p className="mt-2 font-display text-xl">{org.name}</p>
                  <p className="mt-3 text-xs text-[color:var(--muted)]">
                    Created {org.createdAt.toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
