import { prisma } from "@/server/db";
import { createUser } from "@/server/services/users";

type CreateUserInput = Parameters<typeof createUser>[0];

/**
 * A user who has completed email verification.
 *
 * Sign-in and invite acceptance both require a verified address, so most tests
 * want this rather than the raw `createUser`. Use `createUser` directly only
 * when the unverified state is what is under test.
 */
export async function createVerifiedUser(input: CreateUserInput) {
  const user = await createUser(input);

  return prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
}
