import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { AuthorizationError } from "@/server/errors";
import { getSessionUserId } from "@/server/session";
import { auditService } from "@/services/audit";

type Params = {
  params: { orgId: string };
};

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(req: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("Unauthorized.", 401);
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("Invalid query parameters.");
  }

  try {
    const logs = await auditService.list({
      orgId: params.orgId,
      userId,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    return jsonOk(logs);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error.message, 403);
    }
    const message =
      error instanceof Error ? error.message : "Unable to load audit log.";
    return jsonError(message, 400);
  }
}
