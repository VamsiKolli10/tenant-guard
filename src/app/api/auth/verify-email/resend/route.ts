import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { consumeAuthRateLimit } from "@/server/auth-rate-limit";
import { issueEmailVerificationToken } from "@/server/auth-tokens";
import { prisma } from "@/server/db";
import { sendEmailVerification } from "@/server/email";

const schema = z.object({ email: z.string().email() });

/**
 * Re-issues an email verification link.
 *
 * Without this, an account whose first verification email failed to arrive was
 * permanently unreachable: verification is required to sign in, and a token was
 * only ever issued at registration.
 *
 * Mirrors the password-reset request endpoint's disclosure behaviour — the
 * response is identical whether or not the address exists, and whether or not
 * it is already verified, so this cannot be used to enumerate accounts.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid email address.");
  }

  const email = parsed.data.email.trim().toLowerCase();

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwardedFor || req.headers.get("x-real-ip") || "unknown";

  const [emailLimit, ipLimit] = await Promise.all([
    consumeAuthRateLimit({
      action: "verify-email-resend",
      identifier: `email:${email}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    }),
    consumeAuthRateLimit({
      action: "verify-email-resend",
      identifier: `ip:${clientIp}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    }),
  ]);

  const generic = {
    message:
      "If that address needs verification, a new link has been sent. Check your inbox and spam folder.",
  };

  if (!emailLimit.allowed || !ipLimit.allowed) {
    // Deliberately the same body as success: a distinct 429 here would confirm
    // that the address exists to anyone probing it.
    return jsonOk(generic);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.emailVerifiedAt) {
    const token = await issueEmailVerificationToken(user.id);
    try {
      await sendEmailVerification(user.email, token);
    } catch (error) {
      console.error("verify-email.resend_failed", error);
    }
  }

  return jsonOk(generic);
}
