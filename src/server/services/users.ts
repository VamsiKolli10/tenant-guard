import { prisma } from "@/server/db";
import { hashPassword } from "@/server/password";
import type { DbClient } from "@/server/services/types";

type CreateUserInput = {
  email: string;
  name?: string;
  password: string;
};

export async function createUser(
  input: CreateUserInput,
  db: DbClient = prisma,
) {
  const email = input.email.toLowerCase().trim();
  const passwordHash = await hashPassword(input.password);

  return db.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash,
    },
  });
}
