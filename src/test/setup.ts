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

beforeEach(async () => {
  await prisma.authRateLimit.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.task.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
