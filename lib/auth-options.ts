import type { NextAuthOptions } from "next-auth";
import { randomUUID } from "node:crypto";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getSessionRevocationId } from "@/lib/security/session-revocation";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

/**
 * Preview-only authentication diagnostics.
 * These records deliberately exclude email, password, password hash, IP,
 * user ID, request headers, tokens, and provider response data.
 */
function authDiagnostic(stage: string, details: Record<string, string | number | boolean>): void {
  if (process.env.VERCEL_ENV === "preview") {
    console.info("[AUTH_DIAGNOSTIC]", { stage, ...details });
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.MOVIESHUB_E2E === "true"
    ? false
    : process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://") === true,
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
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
        if (!email || email.length > 254 || !password || password.length > 128) {
          authDiagnostic("input_rejected", { validEmailShape: Boolean(email && email.length <= 254), passwordPresent: Boolean(password), passwordWithinLimit: Boolean(password && password.length <= 128) });
          return null;
        }

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
          const sharedEmailAllowed = await consumeAuthRateLimit("login-email:" + email, 5);
          const sharedIpAllowed = ip
            ? await consumeAuthRateLimit("login-ip:" + ip, 30)
            : true;
          const ipLimit = ip
            ? await consumeRateLimit("login-ip", ip, 30, 15 * 60)
            : { allowed: true };
          authDiagnostic("rate_limit_checked", {
            emailAllowed: emailLimit.allowed,
            ipAllowed: ipLimit.allowed,
            ipLimitApplied: Boolean(ip),
          });
          if (!sharedEmailAllowed || !sharedIpAllowed || !emailLimit.allowed || !ipLimit.allowed) {
            authDiagnostic("login_rejected", { reason: "rate_limit" });
            return null;
          }
        } catch (error) {
          logSafeError("Login rate-limit check failed", error);
          authDiagnostic("login_rejected", { reason: "rate_limit_service_error" });
          // Fail closed when the shared limiter is unavailable.
          return null;
        }

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          logSafeError("Login account lookup failed", error);
          authDiagnostic("login_rejected", { reason: "database_lookup_error" });
          return null;
        }

        if (!user) {
          authDiagnostic("login_rejected", { reason: "account_not_found" });
          return null;
        }
        if (user.isBanned) {
          authDiagnostic("login_rejected", { reason: "account_banned" });
          return null;
        }
        if (!user.passwordHash) {
          authDiagnostic("login_rejected", { reason: "password_hash_missing", provider: user.provider });
          return null;
        }
        const verificationRequired = process.env.REQUIRE_EMAIL_VERIFICATION === "true";
        if (verificationRequired && !user.isEmailVerified) {
          authDiagnostic("login_rejected", { reason: "email_not_verified", verificationRequired: true });
          return null;
        }

        let validPassword = false;
        try {
          validPassword = await bcrypt.compare(password, user.passwordHash);
        } catch (error) {
          logSafeError("Login password comparison failed", error);
          authDiagnostic("login_rejected", { reason: "password_compare_error" });
          return null;
        }
        authDiagnostic("password_checked", { validPassword });
        if (!validPassword) {
          authDiagnostic("login_rejected", { reason: "password_mismatch" });
          return null;
        }

        authDiagnostic("login_authorized", { role: user.role, verificationRequired, emailVerified: user.isEmailVerified });
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
      if (token.sub && typeof token.sid !== "string") token.sid = randomUUID();
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
