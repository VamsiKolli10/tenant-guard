import { expect, it } from "vitest";

import {
  issueEmailVerificationToken,
  issuePasswordResetToken,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "@/server/auth-tokens";
import { prisma } from "@/server/db";
import { InvalidTokenError } from "@/server/errors";
import { verifyPassword } from "@/server/password";
import { createUser } from "@/server/services/users";

it("verifies an email with a one-time token", async () => {
  const user = await createUser({
    email: "verify@example.com",
    password: "password123",
  });
  const token = await issueEmailVerificationToken(user.id);

  const verified = await verifyEmailWithToken(token);
  expect(verified.emailVerifiedAt).toBeInstanceOf(Date);
  await expect(verifyEmailWithToken(token)).rejects.toThrow(InvalidTokenError);
});

it("resets a password without revealing whether another account exists", async () => {
  const user = await createUser({
    email: "reset@example.com",
    password: "password123",
  });

  expect(await issuePasswordResetToken("missing@example.com")).toBeNull();
  const issued = await issuePasswordResetToken(user.email);
  expect(issued).not.toBeNull();

  await resetPasswordWithToken(issued!.token, "a-new-secure-password");
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(await verifyPassword("a-new-secure-password", updated.passwordHash!)).toBe(true);
  await expect(
    resetPasswordWithToken(issued!.token, "another-secure-password"),
  ).rejects.toThrow(InvalidTokenError);
});
