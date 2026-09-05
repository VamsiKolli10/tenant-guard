import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { prisma } from "@/server/db";
import { getSessionUserId } from "@/server/session";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

/**
 * Update the signed-in user's display name.
 *
 * Not tenant-scoped: a user is a global record, and this only ever touches the
 * caller's own row — the id comes from the session, never from the payload.
 */
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter a name between 1 and 80 characters.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true },
  });

  return jsonOk(user);
}
