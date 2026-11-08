import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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
        if (!email || !password) return null;

        try {
          if (!(await consumeAuthRateLimit(`login-email:${email}`, 5))) return null;

          const forwarded = req.headers["x-vercel-forwarded-for"] ??
            req.headers["x-forwarded-for"] ??
            req.headers["x-real-ip"];
          const clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
          if (clientIp && !(await consumeAuthRateLimit(`login-ip:${clientIp}`, 30))) return null;
        } catch (error) {
          // Fail closed if the shared database-backed limiter is unavailable.
          console.error("Login rate limiter unavailable; rejecting authentication attempt.");
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.isBanned || !user.passwordHash) return null;
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
          select: { passwordChangedAt: true, isBanned: true },
        });
        if (!account || account.isBanned || (account.passwordChangedAt && token.iat * 1000 < account.passwordChangedAt.getTime())) {
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
