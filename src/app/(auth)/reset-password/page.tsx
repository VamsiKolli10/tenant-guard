"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Unable to reset password.");
      return;
    }
    setMessage("Your password has been updated.");
  };

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl shadow-black/5">
      <div className="space-y-6">
        <h1 className="text-center font-display text-2xl">Choose a new password</h1>
        <label className="flex flex-col gap-2 text-sm">New password<input type="password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2" /></label>
        {message ? <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={!token} className="w-full rounded-full bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--surface)] disabled:opacity-60">Update password</button>
        <p className="text-center text-sm"><Link href="/signin" className="text-[color:var(--accent)]">Return to sign in</Link></p>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p>Loading reset form…</p>}><ResetPasswordForm /></Suspense>;
}
