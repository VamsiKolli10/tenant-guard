import { z } from "zod";

import { jsonError, jsonOk } from "@/server/api";
import { prisma } from "@/server/db";
import { createUser } from "@/server/services/users";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Invalid JSON payload.");
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid registration details.");
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already registered.", 409);
  }

  const user = await createUser({
    email,
    name: parsed.data.name,
    password: parsed.data.password,
  });

  return jsonOk(
    { id: user.id, email: user.email, name: user.name },
    201,
  );
}
