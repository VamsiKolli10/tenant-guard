"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResendForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(
        payload.data?.message ??
          "If that address needs verification, a new link has been sent.",
      );
    } catch {
      setMessage("The request failed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card p-8">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Resend verification</h1>
          <p className="text-sm text-[color:var(--muted)]">
            You need a verified email address before you can sign in.
          </p>
        </div>

        <div className="field-label">
          <label htmlFor="resend-email">Email</label>
          <input
            id="resend-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? "Sending…" : "Send a new link"}
        </button>

        <p aria-live="polite" className="min-h-[1.25rem] text-center text-sm text-[color:var(--muted)]">
          {message}
        </p>

        <p className="text-center text-sm">
          <Link href="/signin" className="text-[color:var(--accent)] underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-sm">Loading…</div>}>
      <ResendForm />
    </Suspense>
  );
}
