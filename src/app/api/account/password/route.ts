import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { consumeAuthRateLimit } from "@/server/auth-rate-limit";
import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/password";
import { getSessionUserId } from "@/server/session";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

/**
 * Change the signed-in user's password.
 *
 * Requires the current password even though the caller is authenticated: it
 * stops someone who finds an unlocked laptop from taking the account over, and
 * it is the reason this is safe to expose without a second factor.
 *
 * Unlike the reset flow this deliberately does NOT stamp `sessionsValidAfter`.
 * The user is present and voluntarily rotating a password; evicting their other
 * devices would be surprising. A reset — where the premise is that someone else
 * may be signed in — does evict them.
 */
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Your new password must be at least 12 characters.");
  }

  const limit = await consumeAuthRateLimit({
    action: "password-change",
    identifier: `user:${userId}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return jsonError("Too many attempts. Try again shortly.", 429);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return jsonError("This account has no password set.", 400);
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return jsonError("Your current password is not correct.", 403);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return jsonOk({ message: "Password updated." });
}
