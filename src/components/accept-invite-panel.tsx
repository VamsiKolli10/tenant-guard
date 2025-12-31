"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  token: string;
};

export function AcceptInvitePanel({ token }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const acceptInvite = async () => {
    setStatus("loading");
    setMessage(null);

    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setStatus("error");
      setMessage("Please sign in to accept this invite.");
      return;
    }

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Unable to accept invite.");
      return;
    }

    setStatus("success");
    setMessage("Invite accepted. You can now access the organization.");
  };

  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center">
      <h1 className="font-display text-2xl">Accept your invite</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Join your organization and start collaborating.
      </p>
      <button
        type="button"
        onClick={acceptInvite}
        disabled={status === "loading"}
        className="mt-6 rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {status === "loading" ? "Accepting..." : "Accept invite"}
      </button>
      {message ? (
        <p className="mt-4 text-sm text-[color:var(--muted)]">{message}</p>
      ) : null}
      {status === "error" ? (
        <Link
          href={`/signin?callbackUrl=/invite/${token}`}
          className="mt-3 block text-sm text-[color:var(--accent)]"
        >
          Sign in to continue
        </Link>
      ) : null}
      {status === "success" ? (
        <Link
          href="/dashboard"
          className="mt-3 block text-sm text-[color:var(--accent)]"
        >
          Go to dashboard
        </Link>
      ) : null}
    </div>
  );
}
