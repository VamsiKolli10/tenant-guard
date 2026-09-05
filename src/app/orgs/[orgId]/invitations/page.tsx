import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { revokeInviteAction } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";
import { FormattedDate } from "@/components/formatted-date";
import { InvitePanel } from "@/components/invite-panel";
import { Alert, Badge, Card, EmptyState, RoleBadge, SectionHeading } from "@/components/ui";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";
import { requireMembership } from "@/services/tenancy";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type InviteState = "accepted" | "revoked" | "expired" | "pending";

function inviteState(invite: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): InviteState {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.valueOf() < Date.now()) return "expired";
  return "pending";
}

const STATE_TONE = {
  accepted: "success",
  revoked: "danger",
  expired: "warning",
  pending: "accent",
} as const;

const STATE_LABEL = {
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
  pending: "Pending",
} as const;

function readParam(
  source: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = source[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

export default async function InvitationsPage({ params, searchParams }: PageProps) {
  const { orgId } = await params;
  const query = await searchParams;

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const membership = await requireMembership(orgId, userId);

  let invites: Awaited<ReturnType<typeof inviteService.listInvites>>;
  try {
    invites = await inviteService.listInvites({ orgId, actorUserId: userId });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <Card>
          <SectionHeading title="Invitations" description="You do not have access to this section." />
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Invitations are managed by admins and managers.
          </p>
        </Card>
      );
    }
    throw error;
  }

  const inviteRoles =
    membership.role === Role.ADMIN
      ? [Role.ADMIN, Role.MANAGER, Role.MEMBER]
      : membership.role === Role.MANAGER
        ? [Role.MANAGER, Role.MEMBER]
        : [];

  const returnTo = `/orgs/${orgId}/invitations`;
  const error = readParam(query, "error");
  const notice = readParam(query, "notice");
  const pending = invites.filter((invite) => inviteState(invite) === "pending");

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <SectionHeading
            title="Invitations"
            description={`${pending.length} pending of ${invites.length} total`}
          />

          {invites.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No invitations yet"
                hint="Invite a teammate using the form beside this list. They will receive a link that expires in seven days."
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {invites.map((invite) => {
                const state = inviteState(invite);
                const canRevoke = state === "pending";

                return (
                  <li key={invite.id} className="card-inset p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {invite.email ?? (
                            <span className="text-[color:var(--muted-strong)]">
                              Shareable link (no email bound)
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          Invited <FormattedDate iso={invite.createdAt.toISOString()} />
                          {" · "}
                          {state === "accepted" && invite.acceptedAt ? (
                            <>
                              accepted <FormattedDate iso={invite.acceptedAt.toISOString()} />
                            </>
                          ) : state === "revoked" && invite.revokedAt ? (
                            <>
                              revoked <FormattedDate iso={invite.revokedAt.toISOString()} />
                            </>
                          ) : (
                            <>
                              expires <FormattedDate iso={invite.expiresAt.toISOString()} />
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={invite.role} />
                        <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
                      </div>
                    </div>

                    {!invite.email ? (
                      <p className="mt-3 text-xs text-[color:var(--warning)]">
                        Anyone holding this link can join with the{" "}
                        {invite.role.toLowerCase()} role. Revoke it if you are unsure
                        where it was shared.
                      </p>
                    ) : null}

                    {canRevoke ? (
                      <div className="mt-4 flex justify-end border-t border-[color:var(--border)] pt-3">
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="orgId" value={orgId} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <ConfirmButton
                            label="Revoke"
                            confirmLabel="Revoke invite"
                            question={`Revoke the invite for ${invite.email ?? "this link"}?`}
                          />
                        </form>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div>
          <InvitePanel orgId={orgId} allowedRoles={inviteRoles} />
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
