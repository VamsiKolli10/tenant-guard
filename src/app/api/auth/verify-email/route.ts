import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { verifyEmailWithToken } from "@/server/auth-tokens";
import { InvalidTokenError } from "@/server/errors";

const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid verification link.");
  }

  try {
    await verifyEmailWithToken(parsed.data.token);
    return jsonOk({ message: "Email verified." });
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      return jsonError(error.message, 400);
    }
    throw error;
  }
}
