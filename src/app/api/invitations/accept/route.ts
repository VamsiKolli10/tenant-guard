import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";

const acceptSchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid JSON payload.");
  }

  const parsed = acceptSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid invite token.");
  }

  try {
    const membership = await inviteService.acceptInvite({
      token: parsed.data.token,
      userId,
    });
    return jsonOk(membership);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to accept invite.";
    return jsonError(message, 400);
  }
}
