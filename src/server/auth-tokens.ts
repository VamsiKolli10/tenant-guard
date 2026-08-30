import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/server/db";
import { InvalidTokenError } from "@/server/errors";
import { hashPassword } from "@/server/password";

function createToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueEmailVerificationToken(userId: string) {
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId, consumedAt: null },
    }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return token;
}

export async function verifyEmailWithToken(token: string) {
  const tokenHash = hashToken(token);

  return prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.consumedAt || record.expiresAt <= new Date()) {
      throw new InvalidTokenError();
    }

    const now = new Date();
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    return tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    });
  });
}

export async function issuePasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    return null;
  }

  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, consumedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  return { token, user };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashToken(token);
  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.consumedAt || record.expiresAt <= new Date()) {
      throw new InvalidTokenError();
    }

    const now = new Date();
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: now },
    });
    return tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
  });
}
