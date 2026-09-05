import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { changeRoleAction, removeMemberAction } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Alert, Card, RoleBadge, SectionHeading } from "@/components/ui";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { membershipService } from "@/services/memberships";
import { requireMembership } from "@/services/tenancy";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  source: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = source[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

export default async function MembersPage({ params, searchParams }: PageProps) {
  const { orgId } = await params;
  const query = await searchParams;

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const membership = await requireMembership(orgId, userId);

  let members: Awaited<ReturnType<typeof membershipService.listMembers>>;
  try {
    members = await membershipService.listMembers({ orgId, userId });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      // The authorization-error state: explain the boundary rather than
      // bouncing the user somewhere with no explanation.
      return (
        <Card>
          <SectionHeading
            title="Members"
            description="You do not have access to this section."
          />
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Member rosters are visible to admins and managers. Ask an
            administrator if you need access.
          </p>
        </Card>
      );
    }
    throw error;
  }

  const isAdmin = membership.role === Role.ADMIN;
  const adminCount = members.filter((m) => m.role === Role.ADMIN).length;
  const returnTo = `/orgs/${orgId}/members`;
  const error = readParam(query, "error");
  const notice = readParam(query, "notice");

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <SectionHeading
          title="Members"
          description={
            isAdmin
              ? "Admins can change roles and remove access. The last admin cannot be demoted or removed."
              : "Managers can view the roster. Only admins can change roles."
          }
        />

        <ul className="mt-5 space-y-3">
          {members.map((member) => {
            const isSelf = member.userId === userId;
            const isLastAdmin = member.role === Role.ADMIN && adminCount <= 1;
            const displayName = member.user.name || member.user.email;

            return (
              <li key={member.id} className="card-inset p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {displayName}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-[color:var(--muted)]">you</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">{member.user.email}</p>
                  </div>
                  <RoleBadge role={member.role} />
                </div>

                {isAdmin ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] pt-3">
                    <form action={changeRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="memberUserId" value={member.userId} />
                      <label
                        htmlFor={`role-${member.id}`}
                        className="text-xs text-[color:var(--muted)]"
                      >
                        Role
                      </label>
                      <select
                        id={`role-${member.id}`}
                        name="role"
                        defaultValue={member.role}
                        disabled={isLastAdmin}
                        className="select w-auto py-1 text-xs"
                      >
                        <option value={Role.ADMIN}>Admin</option>
                        <option value={Role.MANAGER}>Manager</option>
                        <option value={Role.MEMBER}>Member</option>
                      </select>
                      <button type="submit" className="btn btn-secondary btn-sm" disabled={isLastAdmin}>
                        Update
                      </button>
                    </form>

                    {isLastAdmin ? (
                      <p className="text-xs text-[color:var(--muted)]">
                        The final admin keeps their role until another admin is
                        appointed.
                      </p>
                    ) : (
                      <form action={removeMemberAction} className="ml-auto">
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="memberUserId" value={member.userId} />
                        <ConfirmButton
                          label={isSelf ? "Leave workspace" : "Remove"}
                          confirmLabel={isSelf ? "Leave" : "Remove access"}
                          question={
                            isSelf
                              ? "Remove your own access to this workspace?"
                              : `Remove ${displayName} from this workspace?`
                          }
                        />
                      </form>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
