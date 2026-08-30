import { headers } from "next/headers";

import { prisma } from "@/server/db";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = (await headers()).get("x-request-id") || "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      database: "available",
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch {
    logger.error("health.database_unavailable", { requestId });
    return Response.json(
      {
        status: "degraded",
        database: "unavailable",
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 503 },
    );
  }
}
