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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
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
      setError("Account created, but sign-in failed.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl shadow-black/5"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Create your account</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Start with one org and invite your team.
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2"
            />
          </label>
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
              minLength={8}
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
          className="w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>

        <p className="text-center text-sm text-[color:var(--muted)]">
          Already have access?{" "}
          <Link href="/signin" className="text-[color:var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
