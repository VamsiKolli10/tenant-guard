import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { getSessionUserId } from "@/server/session";
import {
  createOrganization,
  listOrganizationsForUser,
} from "@/server/services/organizations";

const orgSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const orgs = await listOrganizationsForUser(userId);
  return jsonOk(orgs);
}

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

  const parsed = orgSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid organization details.");
  }

  const org = await createOrganization({
    name: parsed.data.name,
    ownerId: userId,
  });

  return jsonOk(org, 201);
}
