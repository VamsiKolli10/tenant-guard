import { z } from "zod";

import { consumeAuthRateLimit } from "@/server/auth-rate-limit";
import { issuePasswordResetToken } from "@/server/auth-tokens";
import { sendPasswordReset } from "@/server/email";
import { jsonError, jsonOk } from "@/server/api";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid email address.");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const limit = await consumeAuthRateLimit({
    action: "password-reset",
    identifier: email,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (limit.allowed) {
    const issued = await issuePasswordResetToken(email);
    if (issued) {
      try {
        await sendPasswordReset(issued.user.email, issued.token);
      } catch (error) {
        // An unconfigured or failing mailer must not change the response.
        // Previously this threw, so a 500 meant "this account exists" while a
        // 200 meant it did not — an enumeration oracle triggered by an
        // operational fault.
        console.error("password-reset.send_failed", error);
      }
    }
  }

  return jsonOk({
    message: "If an account exists, a password-reset email has been sent.",
  });
}
