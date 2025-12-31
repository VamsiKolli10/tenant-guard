import { afterAll, beforeEach } from "vitest";

import { prisma } from "@/server/db";

beforeEach(async () => {
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
