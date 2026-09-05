"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function AcceptInvitePanel({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const acceptInvite = async () => {
    setStatus("loading");
    setMessage(null);
    setNeedsSignIn(false);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setStatus("error");
        setNeedsSignIn(true);
        setMessage("Sign in first, then accept this invitation.");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error || "This invitation could not be accepted.");
        return;
      }

      setStatus("success");
      setMessage("You have joined the workspace.");
    } catch {
      setStatus("error");
      setMessage("The network request failed. Check your connection and try again.");
    }
  };

  return (
    <div className="card p-8 text-center">
      <h2 className="font-display text-2xl">Accept your invitation</h2>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Joining adds your account to the workspace with the role the inviter chose.
      </p>

      <button
        type="button"
        onClick={acceptInvite}
        disabled={status === "loading" || status === "success"}
        className="btn btn-primary mt-6"
      >
        {status === "loading" ? "Accepting…" : "Accept invitation"}
      </button>

      <p aria-live="polite" className="mt-4 min-h-[1.25rem] text-sm">
        {message ? (
          <span
            className={
              status === "error"
                ? "text-[color:var(--danger)]"
                : "text-[color:var(--success)]"
            }
            role={status === "error" ? "alert" : undefined}
          >
            {message}
          </span>
        ) : null}
      </p>

      {needsSignIn ? (
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
          className="btn btn-secondary btn-sm mt-2"
        >
          Sign in to continue
        </Link>
      ) : null}

      {status === "success" ? (
        <Link href="/dashboard" className="btn btn-secondary btn-sm mt-2">
          Go to your workspaces
        </Link>
      ) : null}
    </div>
  );
}
