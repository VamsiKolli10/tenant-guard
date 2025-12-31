import { Role } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";

type Params = {
  params: { orgId: string };
};

const inviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export async function GET(_: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const invites = await inviteService.listInvites({
      orgId: params.orgId,
      actorUserId: userId,
    });
    return jsonOk(invites);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to load invites.";
    return jsonError(message, 400);
  }
}

export async function POST(req: Request, { params }: Params) {
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

  const parsed = inviteSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid invitation details.");
  }

  try {
    const { invitation, token } = await inviteService.createInvite({
      orgId: params.orgId,
      actorUserId: userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    const inviteLink = `${getAppUrl()}/invite/${token}`;

    return jsonOk(
      {
        invitation,
        inviteLink,
      },
      201,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to create invite.";
    return jsonError(message, 400);
  }
}
