"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Role } from "@prisma/client";

type Props = {
  orgId: string;
  allowedRoles: Role[];
};

export function InvitePanel({ orgId, allowedRoles }: Props) {
  const router = useRouter();
  const defaultRole = allowedRoles.includes("MEMBER" as Role)
    ? ("MEMBER" as Role)
    : (allowedRoles[0] ?? ("MEMBER" as Role));

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (allowedRoles.length === 0) {
    return null;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setCopied(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orgs/${orgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, role }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || "Unable to create this invitation.");
        return;
      }

      setInviteLink(payload.data?.inviteLink ?? null);
      setEmailSent(Boolean(payload.data?.emailSent));
      setEmail("");
      // Refresh the server-rendered invitation list beside this panel.
      router.refresh();
    } catch {
      setError("The network request failed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card p-6" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="font-display text-xl">
        Invite a teammate
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Leave the email blank to create a shareable link instead.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="field-label">
          <label htmlFor="invite-email">Email address</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="input"
            aria-describedby="invite-email-hint"
          />
          <span id="invite-email-hint" className="text-xs text-[color:var(--muted)]">
            An email-bound invite can only be accepted by that address.
          </span>
        </div>

        <div className="field-label">
          <label htmlFor="invite-role">Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="select"
          >
            {allowedRoles.map((option) => (
              <option key={option} value={option}>
                {option[0] + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? "Creating…" : "Create invitation"}
        </button>
      </form>

      <div aria-live="polite">
        {error ? (
          <p role="alert" className="alert alert-danger mt-4">
            {error}
          </p>
        ) : null}

        {inviteLink ? (
          <div className="mt-4 space-y-2">
            <p className="alert alert-success">
              {emailSent
                ? "Invitation created and emailed."
                : "Invitation created. No email was sent — share this link yourself."}
            </p>
            <div className="card-inset p-3">
              <p className="text-xs text-[color:var(--muted)]">Invitation link</p>
              <p className="mt-1 break-all text-xs font-medium">{inviteLink}</p>
              <button type="button" onClick={copyLink} className="btn btn-secondary btn-sm mt-3">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              This link is shown once. Anyone holding it can join with the selected
              role until it expires or is revoked.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
