"use client";

import { useState } from "react";

/**
 * Two-step confirmation for destructive actions, as the PRD requires.
 *
 * Deliberately not `window.confirm`: a native dialog blocks the page, cannot be
 * styled or made to read well with a screen reader, and gives no way to name
 * what is being destroyed. Here the confirmation replaces the trigger in place,
 * announces itself, and can be dismissed with Escape or the cancel button.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  question,
  className = "btn btn-danger btn-sm",
}: {
  label: string;
  confirmLabel: string;
  question: string;
  className?: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setIsConfirming(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span
      className="inline-flex flex-wrap items-center gap-2"
      role="alertdialog"
      aria-label={question}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsConfirming(false);
        }
      }}
    >
      <span className="text-xs text-[color:var(--muted-strong)]">{question}</span>
      <button type="submit" className="btn btn-danger btn-sm" autoFocus>
        {confirmLabel}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setIsConfirming(false)}
      >
        Cancel
      </button>
    </span>
  );
}
