import Link from "next/link";

export type WorkspaceSection = "tasks" | "members" | "invitations" | "audit";

/**
 * Workspace navigation.
 *
 * A server component on purpose. The active tab is resolved from the request
 * path by the layout rather than from `usePathname()` in the browser: that hook
 * is not resolved while a layout renders on the server, so the server emitted
 * no `aria-current` while the client emitted one, and React abandoned
 * hydration for this subtree — taking the interactivity of every client
 * component on the page with it.
 *
 * Tabs the caller cannot use are not rendered at all, per the PRD's "hide
 * unavailable actions". The server remains the authority: each route re-checks
 * the role regardless of what is shown here.
 */
export function WorkspaceTabs({
  orgId,
  canAdminister,
  active,
}: {
  orgId: string;
  canAdminister: boolean;
  active: WorkspaceSection;
}) {
  const base = `/orgs/${orgId}`;

  const tabs: { href: string; label: string; key: WorkspaceSection; show: boolean }[] = [
    { href: base, label: "Tasks", key: "tasks", show: true },
    { href: `${base}/members`, label: "Members", key: "members", show: canAdminister },
    {
      href: `${base}/invitations`,
      label: "Invitations",
      key: "invitations",
      show: canAdminister,
    },
    { href: `${base}/audit`, label: "Audit", key: "audit", show: canAdminister },
  ];

  return (
    <nav aria-label="Workspace sections">
      <ul className="flex flex-wrap gap-1 border-b border-[color:var(--border)] pb-3">
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => (
            <li key={tab.key}>
              <Link
                href={tab.href}
                className="tab"
                aria-current={tab.key === active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
