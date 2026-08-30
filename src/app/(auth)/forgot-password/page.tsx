"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setError(body.error || "Unable to request a reset link.");
      return;
    }
    setMessage(body.data?.message || "Check your email for a reset link.");
  };

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl shadow-black/5">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Reset your password</h1>
          <p className="text-sm text-[color:var(--muted)]">We will send a one-hour reset link if the account exists.</p>
        </div>
        <label className="flex flex-col gap-2 text-sm">
          Email
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2" />
        </label>
        {message ? <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--surface)] disabled:opacity-60">{isSubmitting ? "Sending…" : "Send reset link"}</button>
        <p className="text-center text-sm"><Link href="/signin" className="text-[color:var(--accent)]">Back to sign in</Link></p>
      </div>
    </form>
  );
}
