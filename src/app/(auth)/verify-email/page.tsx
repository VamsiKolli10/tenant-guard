"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerificationResult() {
  const token = useSearchParams().get("token") || "";
  const [message, setMessage] = useState(
    token ? "Verifying your email…" : "This verification link is invalid.",
  );
  const [failed, setFailed] = useState(!token);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      setFailed(!response.ok);
      setMessage(response.ok ? "Your email is verified." : body.error || "Unable to verify email.");
    });
  }, [token]);

  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-xl shadow-black/5">
      <h1 className="font-display text-2xl">Email verification</h1>
      <p className={`mt-4 text-sm ${failed ? "text-red-700" : "text-[color:var(--muted)]"}`}>{message}</p>
      <p className="mt-6 text-sm"><Link href="/signin" className="text-[color:var(--accent)]">Continue to sign in</Link></p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<p>Verifying your email…</p>}><VerificationResult /></Suspense>;
}
