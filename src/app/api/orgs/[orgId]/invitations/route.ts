import { Role } from "@prisma/client";
import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { sendOrganizationInvitation } from "@/server/email";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { inviteService } from "@/services/invitations";
import { orgService } from "@/services/organizations";

type Params = {
  params: Promise<{ orgId: string }>;
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
  const { orgId } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const invites = await inviteService.listInvites({
      orgId,
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
  const { orgId } = await params;
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
      orgId,
      actorUserId: userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    const inviteLink = `${getAppUrl()}/invite/${token}`;
    let emailSent = false;

    if (invitation.email) {
      try {
        const organization = await orgService.getOrg({ orgId, userId });
        await sendOrganizationInvitation({
          to: invitation.email,
          token,
          organizationName: organization.name,
        });
        emailSent = true;
      } catch (error) {
        console.error("Unable to send invitation email.", error);
      }
    }

    return jsonOk(
      {
        invitation,
        inviteLink,
        emailSent,
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
