import "server-only";

type RequestContext = {
  ip: string | null;
  userAgent: string | null;
};

const EMPTY: RequestContext = { ip: null, userAgent: null };

function firstForwardedFor(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

/**
 * Best-effort capture of the caller's network identity for audit records.
 *
 * Reads Next's ambient request headers rather than threading ip/userAgent
 * through every service signature. Outside a request scope — tests, seed
 * scripts, background jobs — `headers()` throws and we record nulls, which is
 * the honest answer for an event with no HTTP caller.
 *
 * Note that `x-forwarded-for` is only as trustworthy as the proxy in front of
 * the app; treat the recorded IP as a correlation aid, not as identity.
 */
export async function getRequestContext(): Promise<RequestContext> {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();

    return {
      ip:
        firstForwardedFor(headerList.get("x-forwarded-for")) ??
        headerList.get("x-real-ip") ??
        null,
      userAgent: headerList.get("user-agent"),
    };
  } catch {
    return EMPTY;
  }
}
