import "server-only";

import { createHmac } from "node:crypto";

import { prisma } from "@/server/db";
import type { DbClient } from "@/server/services/types";

type ConsumeRateLimitInput = {
  action:
    | "credentials-login"
    | "register"
    | "password-reset"
    | "verify-email-resend"
    | "password-change";
  identifier: string;
  limit: number;
  windowMs: number;
};

function hashIdentifier(action: string, identifier: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for authentication rate limits.");
  }

  return createHmac("sha256", secret)
    .update(`${action}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export async function consumeAuthRateLimit(
  input: ConsumeRateLimitInput,
  db: DbClient = prisma,
) {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / input.windowMs) * input.windowMs,
  );
  const expiresAt = new Date(windowStart.getTime() + input.windowMs * 2);
  const keyHash = hashIdentifier(input.action, input.identifier);

  await db.authRateLimit.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const record = await db.authRateLimit.upsert({
    where: {
      action_keyHash_windowStart: {
        action: input.action,
        keyHash,
        windowStart,
      },
    },
    create: {
      action: input.action,
      keyHash,
      windowStart,
      expiresAt,
    },
    update: {
      count: { increment: 1 },
      expiresAt,
    },
  });

  return {
    allowed: record.count <= input.limit,
    limit: input.limit,
    remaining: Math.max(0, input.limit - record.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStart.getTime() + input.windowMs - now.getTime()) / 1000),
    ),
  };
}
