"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl shadow-black/5"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Welcome back</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Sign in to access your organizations.
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--surface)] transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-[color:var(--muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[color:var(--accent)]">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
