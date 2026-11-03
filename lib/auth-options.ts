import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production",
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
          const ip = req.headers["x-real-ip"]?.trim() ||
            req.headers["x-forwarded-for"]?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
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
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
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