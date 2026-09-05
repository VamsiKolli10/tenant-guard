"use client";

import { useEffect } from "react";

/**
 * The unexpected-error state the PRD requires. Deliberately says nothing about
 * the underlying failure — internal messages can carry organization or user
 * detail that has no business on a screen.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("workspace.render_failed", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="card p-8 text-center">
      <h2 className="font-display text-xl">Something went wrong</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--muted)]">
        This workspace could not be loaded. The problem has been logged. Try
        again, and if it persists, contact your administrator with the time it
        happened.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/dashboard" className="btn btn-secondary">
          Back to workspaces
        </a>
      </div>
    </div>
  );
}
