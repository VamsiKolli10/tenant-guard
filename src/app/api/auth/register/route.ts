import { Prisma } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { consumeAuthRateLimit } from "@/server/auth-rate-limit";
import { issueEmailVerificationToken } from "@/server/auth-tokens";
import { prisma } from "@/server/db";
import { sendEmailVerification } from "@/server/email";
import { createUser } from "@/server/services/users";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(12).max(128),
});

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001")
  );
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid JSON payload.");
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid registration details.");
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = forwardedFor || req.headers.get("x-real-ip") || "unknown";
    const [emailLimit, ipLimit] = await Promise.all([
      consumeAuthRateLimit({
        action: "register",
        identifier: `email:${email}`,
        limit: 3,
        windowMs: 60 * 60 * 1000,
      }),
      consumeAuthRateLimit({
        action: "register",
        identifier: `ip:${clientIp}`,
        limit: 10,
        windowMs: 60 * 60 * 1000,
      }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfterSeconds = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds,
      );
      return Response.json(
        { error: "Too many registration attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("Email already registered.", 409);
    }

    const user = await createUser({
      email,
      name: parsed.data.name,
      password: parsed.data.password,
    });

    const verificationToken = await issueEmailVerificationToken(user.id);
    let verificationEmailSent = true;
    try {
      await sendEmailVerification(user.email, verificationToken);
    } catch (error) {
      verificationEmailSent = false;
      console.error("Unable to send verification email.", error);
    }

    return jsonOk(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationEmailSent,
      },
      201,
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return jsonError(
        "Database is unavailable. Check DATABASE_URL and make sure PostgreSQL is running.",
        503,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Email already registered.", 409);
    }

    throw error;
  }
}
