"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setIsSubmitting(false);
    if (result?.error) {
      const unverified = result.error.includes("EMAIL_NOT_VERIFIED");
      setNeedsVerification(unverified);
      setError(
        unverified
          ? "Verify your email address before signing in."
          : "Invalid email or password.",
      );
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="card p-8"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Welcome back</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Sign in to access your organizations.
          </p>
        </div>

        <div className="space-y-4">
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
            />
          </label>
        </div>

        {error ? (
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
        ) : null}

        {needsVerification ? (
          <p className="text-center text-sm">
            <Link
              href={`/resend-verification?email=${encodeURIComponent(email)}`}
              className="text-[color:var(--accent)] underline"
            >
              Send a new verification link
            </Link>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-[color:var(--accent)] underline">
            Forgot your password?
          </Link>
        </p>

        <p className="text-center text-sm text-[color:var(--muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[color:var(--accent)] underline">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="card p-8 text-center text-sm text-[color:var(--muted)]">
          Loading sign in…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
