"use client";

import { signOut } from "next-auth/react";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Log out
    </button>
  );
}
