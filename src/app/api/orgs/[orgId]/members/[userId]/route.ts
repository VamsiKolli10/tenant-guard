import { Role } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { membershipService } from "@/services/memberships";

type Params = {
  params: { orgId: string; userId: string };
};

const roleSchema = z.object({
  role: z.nativeEnum(Role),
});

export async function PATCH(req: Request, { params }: Params) {
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

  const parsed = roleSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid role.");
  }

  try {
    const updated = await membershipService.changeRole({
      orgId: params.orgId,
      userId,
      memberUserId: params.userId,
      role: parsed.data.role,
    });

    return jsonOk(updated);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to update member.";
    return jsonError(message, 404);
  }
}
