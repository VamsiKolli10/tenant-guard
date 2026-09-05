import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { consumeAuthRateLimit } from "@/server/auth-rate-limit";
import { prisma } from "@/server/db";
import { getRequestContext } from "@/server/request-context";
import { verifyPassword } from "@/server/password";

export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: AuthOptions = {
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
    updateAge: 60 * 60,
  },
  jwt: {
    maxAge: 12 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const { ip } = await getRequestContext();

        // Two dimensions, mirroring the registration route. Limiting on email
        // alone let anyone lock a known account out for the whole window with
        // five wrong guesses, so the email budget is now generous enough to
        // absorb a user's own mistakes while the IP budget does the throttling.
        const [emailLimit, ipLimit] = await Promise.all([
          consumeAuthRateLimit({
            action: "credentials-login",
            identifier: `email:${email}`,
            limit: 20,
            windowMs: 15 * 60 * 1000,
          }),
          consumeAuthRateLimit({
            action: "credentials-login",
            identifier: `ip:${ip ?? "unknown"}`,
            limit: 10,
            windowMs: 15 * 60 * 1000,
          }),
        ]);

        if (!emailLimit.allowed || !ipLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        // An unverified address is not proof of ownership. Gating here keeps an
        // attacker who registers someone else's email from reaching any tenant.
        if (!user.emailVerifiedAt) {
          throw new Error(EMAIL_NOT_VERIFIED);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        return token;
      }

      // On every subsequent request, check the token against the user's
      // session cut-off. This costs one primary-key lookup per session check —
      // deliberate: stateless JWTs cannot otherwise be revoked, and a password
      // reset that leaves existing sessions alive is worse than the query.
      if (token.userId) {
        const record = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { sessionsValidAfter: true },
        });

        const issuedAt = typeof token.iat === "number" ? token.iat * 1000 : 0;
        const revoked =
          !record ||
          (record.sessionsValidAfter &&
            issuedAt < record.sessionsValidAfter.getTime());

        if (revoked) {
          // NextAuth v4's jwt callback cannot return null to drop a session, so
          // strip the identity instead. `getSessionUserId` then returns null and
          // every guarded route treats the caller as signed out.
          delete token.userId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
