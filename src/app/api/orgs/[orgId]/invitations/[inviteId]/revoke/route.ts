import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";

type Params = {
  params: { orgId: string; inviteId: string };
};

export async function POST(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const invitation = await inviteService.revokeInvite({
      orgId: params.orgId,
      actorUserId: userId,
      inviteId: params.inviteId,
    });

    return jsonOk(invitation);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to revoke invite.";
    return jsonError(message, 404);
  }
}
