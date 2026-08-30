import { expect, it } from "vitest";

import { consumeAuthRateLimit } from "@/server/auth-rate-limit";

it("blocks authentication attempts after the configured limit", async () => {
  const input = {
    action: "credentials-login" as const,
    identifier: "rate-limit@example.com",
    limit: 2,
    windowMs: 15 * 60 * 1000,
  };

  const first = await consumeAuthRateLimit(input);
  const second = await consumeAuthRateLimit(input);
  const third = await consumeAuthRateLimit(input);

  expect(first).toMatchObject({ allowed: true, remaining: 1 });
  expect(second).toMatchObject({ allowed: true, remaining: 0 });
  expect(third.allowed).toBe(false);
  expect(third.retryAfterSeconds).toBeGreaterThan(0);
});
