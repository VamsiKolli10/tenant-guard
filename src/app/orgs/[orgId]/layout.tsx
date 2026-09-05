import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { WorkspaceTabs, type WorkspaceSection } from "@/components/workspace-tabs";
import { getSessionUserId } from "@/server/session";
import { orgService } from "@/services/organizations";
import { requireMembership } from "@/services/tenancy";
import { BackLink, RoleBadge } from "@/components/ui";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
};

/**
 * Resolves the active tab from the request path, supplied as a header by
 * `src/proxy.ts`. Doing this on the server keeps the rendered markup identical
 * on both sides of hydration.
 */
function sectionFromPath(pathname: string | null, orgId: string): WorkspaceSection {
  const rest = pathname?.replace(`/orgs/${orgId}`, "").replace(/^\//, "") ?? "";
  const segment = rest.split("/")[0];

  if (segment === "members") return "members";
  if (segment === "invitations") return "invitations";
  if (segment === "audit") return "audit";
  return "tasks";
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { orgId } = await params;

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  // Membership is resolved once for the whole workspace. Every child page still
  // guards independently — this only decides what is worth showing.
  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(orgId, userId);
  } catch {
    redirect("/dashboard");
  }

  let org: Awaited<ReturnType<typeof orgService.getOrg>>;
  try {
    org = await orgService.getOrg({ orgId, userId });
  } catch {
    redirect("/dashboard");
  }

  const canAdminister = membership.role === "ADMIN" || membership.role === "MANAGER";
  const active = sectionFromPath((await headers()).get("x-pathname"), orgId);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BackLink href="/dashboard">All workspaces</BackLink>
            <Link href="/settings" className="btn btn-secondary btn-sm">
              Account settings
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1 className="font-display text-3xl sm:text-4xl">{org.name}</h1>
            </div>
            <p className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              Your role
              <RoleBadge role={membership.role} />
            </p>
          </div>

          <WorkspaceTabs orgId={orgId} canAdminister={canAdminister} active={active} />
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
