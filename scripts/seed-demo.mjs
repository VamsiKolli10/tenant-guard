import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env" });
config();

const prisma = new PrismaClient();

const demoEmail = process.env.DEMO_EMAIL || "demo@tenantguard.dev";
const demoPassword = process.env.DEMO_PASSWORD || "Demo123!";
const demoOrgName = process.env.DEMO_ORG_NAME || "Tenant Guard Demo";

async function seed() {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail.toLowerCase() },
    update: {
      name: "Demo Admin",
      passwordHash,
    },
    create: {
      email: demoEmail.toLowerCase(),
      name: "Demo Admin",
      passwordHash,
    },
  });

  let org = await prisma.organization.findFirst({
    where: { name: demoOrgName },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: demoOrgName,
        createdById: user.id,
      },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: org.id,
      },
    },
    update: {
      role: "ADMIN",
    },
    create: {
      orgId: org.id,
      userId: user.id,
      role: "ADMIN",
    },
  });

  const existingTasks = await prisma.task.count({
    where: { orgId: org.id },
  });

  if (existingTasks === 0) {
    await prisma.task.create({
      data: {
        orgId: org.id,
        title: "Welcome to Tenant Guard",
        description: "Seeded task for your demo org.",
        status: "TODO",
        priority: "MEDIUM",
        createdByUserId: user.id,
      },
    });

    await prisma.task.create({
      data: {
        orgId: org.id,
        title: "Invite a teammate",
        description: "Create an invite link and onboard a manager.",
        status: "IN_PROGRESS",
        priority: "LOW",
        createdByUserId: user.id,
      },
    });
  }

  console.log("Demo data ready:");
  console.log(`- Org: ${org.name}`);
  console.log(`- Admin email: ${demoEmail}`);
  console.log(`- Admin password: ${demoPassword}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
