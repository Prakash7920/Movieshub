import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getSessionRevocationId } from "@/lib/security/session-revocation";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.MOVIESHUB_E2E === "true"
    ? false
    : process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://") === true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/auth/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || email.length > 254 || !password || password.length > 128) return null;

        try {
          const emailLimit = await consumeRateLimit("login-email", email, 10, 15 * 60);
          const headers = req.headers ?? {};
          const realIp = headers["x-real-ip"];
          const forwardedFor = headers["x-forwarded-for"];
          const ip = typeof realIp === "string" && realIp.trim()
            ? realIp.trim()
            : typeof forwardedFor === "string"
              ? forwardedFor.split(",").map((part: string) => part.trim()).filter(Boolean).at(-1)
              : undefined;
          const ipLimit = ip
            ? await consumeRateLimit("login-ip", ip, 30, 15 * 60)
            : { allowed: true };
          if (!emailLimit.allowed || !ipLimit.allowed) return null;
        } catch {
          // Fail closed when the shared limiter is unavailable.
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.isBanned || !user.passwordHash) return null;
        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.isEmailVerified) return null;
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.avatarUrl };
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      const tokenId = token ? getSessionRevocationId(token) : null;
      const userId = typeof token?.sub === "string" ? token.sub : null;
      if (tokenId && userId && typeof token?.exp === "number") {
        try {
          await prisma.revokedSessionToken.upsert({
            where: { tokenId },
            create: { tokenId, userId, expiresAt: new Date(token.exp * 1000) },
            update: { expiresAt: new Date(token.exp * 1000) },
          });
        } catch (error) {
          logSafeError("Session revocation write failed", error);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      const tokenId = getSessionRevocationId(token);
      if (tokenId) {
        const revoked = await prisma.revokedSessionToken.findUnique({
          where: { tokenId },
          select: { id: true },
        });
        if (revoked) delete token.sub;
      }
      if (token.sub && typeof token.iat === "number") {
        const account = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true, isBanned: true, isEmailVerified: true },
        });
        if (!account || account.isBanned ||
            (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !account.isEmailVerified) ||
            (account.passwordChangedAt && token.iat * 1000 < account.passwordChangedAt.getTime())) {
          delete token.sub;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      return session;
    },
  },
};