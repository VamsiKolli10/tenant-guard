"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);
    if (result?.error) {
      // Sign-in is expected to fail here: the account exists but the address is
      // not verified yet. That is the normal path, not an error, so say so.
      setNeedsVerification(true);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="card p-8"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Create your account</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Start with one org and invite your team.
          </p>
        </div>

        <div className="space-y-4">
          <label className="field-label">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input"
            />
          </label>
          <label className="field-label">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
            />
          </label>
          <p className="text-xs text-[color:var(--muted)]">
            Use at least 12 characters.
          </p>
        </div>

        {error ? (
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
        ) : null}

        {needsVerification ? (
          <div role="status" className="alert alert-success flex-col items-start gap-2">
            <p>
              Account created. Check <strong>{email}</strong> for a verification
              link — you need to verify before signing in.
            </p>
            <Link
              href={`/resend-verification?email=${encodeURIComponent(email)}`}
              className="underline"
            >
              Did not get it? Send another link
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>

        <p className="text-center text-sm text-[color:var(--muted)]">
          Already have access?{" "}
          <Link href="/signin" className="text-[color:var(--accent)] underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
