"use client";

import { useState } from "react";

import type { Role } from "@/lib/roles";
import { roles } from "@/lib/roles";

type Props = {
  orgId: string;
  canInvite: boolean;
};

export function InvitePanel({ orgId, canInvite }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canInvite) {
    return null;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/orgs/${orgId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || undefined,
        role,
      }),
    });

    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to create invite.");
      return;
    }

    const payload = await response.json();
    setInviteLink(payload.data?.inviteLink || null);
    setEmail("");
  };

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
      <h2 className="font-display text-xl">Invite teammates</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3">
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-[220px] flex-1 rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm"
        >
          {roles.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleOption[0] + roleOption.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-semibold text-[color:var(--surface)] transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Inviting..." : "Create invite"}
        </button>
      </form>
      {inviteLink ? (
        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-white/80 p-3 text-xs">
          <p className="text-[color:var(--muted)]">Invite link</p>
          <p className="mt-2 break-all font-medium text-[color:var(--foreground)]">
            {inviteLink}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
