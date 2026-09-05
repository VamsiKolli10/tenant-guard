"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that disables itself while its form is in flight.
 *
 * Without this, a server action that takes a moment looks like it did nothing,
 * and the natural response is to click again — which submits twice. For a
 * create action that means two records.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
