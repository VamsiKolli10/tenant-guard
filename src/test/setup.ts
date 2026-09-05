import { existsSync } from "node:fs";

import { config } from "dotenv";
import { afterAll, beforeEach } from "vitest";

if (existsSync(".env.test")) {
  config({ path: ".env.test" });
}
config();

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL for tests.");
}

import { prisma } from "@/server/db";

/**
 * Cleanup runs as a single TRUNCATE rather than a chain of deleteMany calls,
 * for two reasons that both come from hardening the application:
 *
 *  - Model queries now pass through the tenant guard, which refuses a
 *    tenant-scoped delete with no organization bound. Raw SQL sits below the
 *    Prisma client extension, so it is unaffected.
 *  - "AuditLog" carries an append-only trigger that rejects row DELETEs.
 *    TRUNCATE does not fire row-level triggers, so the audit table can still
 *    be reset between tests without weakening the guarantee in production.
 */
const TABLES = [
  "AuditLog",
  "Invitation",
  "Task",
  "Membership",
  "Organization",
  "EmailVerificationToken",
  "PasswordResetToken",
  "AuthRateLimit",
  "User",
];

beforeEach(async () => {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
