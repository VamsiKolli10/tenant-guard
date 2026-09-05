"use client";

import { useSyncExternalStore } from "react";

type Mode = "date" | "datetime";

type Props = {
  /** ISO 8601 string. Always pass the raw instant, never a pre-formatted date. */
  iso: string;
  /** "date" for a calendar day, "datetime" when the time of day matters. */
  mode?: Mode;
  className?: string;
};

/** Nothing to subscribe to: the value only differs between server and client. */
const subscribe = () => () => {};

/**
 * Renders an instant in the *viewer's* timezone and locale.
 *
 * Formatting a Date inside a server component uses the server's timezone, not
 * the reader's. In development the server is the developer's own machine, so it
 * looks correct and is easy to miss; deployed to a host running UTC, every user
 * everywhere would see UTC. For an audit trail whose job is answering "when did
 * this happen", that silently misleads.
 *
 * `useSyncExternalStore` is the sanctioned way to render one thing on the server
 * and another on the client: React uses the server snapshot for SSR and
 * hydration, then switches to the client snapshot. That avoids both a hydration
 * mismatch and the setState-in-effect pattern.
 *
 * The server snapshot is the ISO date portion — unambiguous and locale-neutral,
 * so the pre-hydration paint is still correct, just not localised.
 */
export function FormattedDate({ iso, mode = "date", className }: Props) {
  const text = useSyncExternalStore(
    subscribe,
    () => {
      const value = new Date(iso);
      return mode === "datetime"
        ? value.toLocaleString()
        : value.toLocaleDateString();
    },
    () => iso.slice(0, 10),
  );

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
