import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Server components cannot read the pathname directly, and `usePathname()` in
  // a client component is not resolved during a layout's server render — which
  // produced a hydration mismatch on the workspace tabs and broke client
  // interactivity for everything below them. Passing the path as a header lets
  // the layout resolve the active tab on the server, so the markup matches.
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
