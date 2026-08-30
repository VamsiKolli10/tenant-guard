import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { resetPasswordWithToken } from "@/server/auth-tokens";
import { InvalidTokenError } from "@/server/errors";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(12).max(128),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid password-reset details.");
  }

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return jsonOk({ message: "Password updated." });
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      return jsonError(error.message, 400);
    }
    throw error;
  }
}
