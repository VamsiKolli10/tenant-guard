import { jsonError, jsonOk } from "@/server/api";
import { getSessionUserId } from "@/server/session";
import { AuthorizationError } from "@/server/errors";
import { membershipService } from "@/services/memberships";

type Params = {
  params: { orgId: string };
};

export async function GET(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const members = await membershipService.listMembers({
      orgId: params.orgId,
      userId,
    });

    return jsonOk(members);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to load members.";
    return jsonError(message, 400);
  }
}
