import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { orgService } from "@/services/organizations";

type Params = {
  params: { orgId: string };
};

export async function GET(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const org = await orgService.getOrg({
      orgId: params.orgId,
      userId,
    });

    return jsonOk(org);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    if (error instanceof NotFoundError) {
      return jsonError(error.message, 404);
    }
    const message =
      error instanceof Error ? error.message : "Unable to load organization.";
    return jsonError(message, 400);
  }
}
