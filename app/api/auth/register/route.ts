import { NextResponse } from "next/server";
import { logSafeError } from "@/lib/security/safe-log";
import { hasValidJsonContentType, isSameOriginRequest } from "@/lib/security/request-guards";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { createOneTimeToken } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";
import { getClientIp } from "@/lib/security/client-identity";
import { getPublicAppUrl, sendTransactionalEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

function isEmailUniqueConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.some((field) => String(field).toLowerCase() === "email");
  }
  if (typeof target === "string" && target.toLowerCase().includes("email")) {
    return true;
  }

  const constraint = error.meta?.constraint;
  return typeof constraint === "string" && constraint.toLowerCase().includes("email");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!(await hasValidJsonContentType(request))) {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration details." },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(request.headers);

    try {
      const sharedIpAllowed = ip ? await consumeAuthRateLimit("register-ip:" + ip, 5) : true;
      const sharedEmailAllowed = await consumeAuthRateLimit("register-email:" + normalizedEmail, 3);
      if (!sharedIpAllowed || !sharedEmailAllowed) {
        return NextResponse.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": String(15 * 60), "Cache-Control": "no-store" } },
        );
      }
      const emailLimit = await consumeRateLimit("register-email", normalizedEmail, 3, 60 * 60);
      const ipLimit = ip
        ? await consumeRateLimit("register-ip", ip, 8, 15 * 60)
        : { allowed: true, retryAfterSeconds: 900 };
      if (!emailLimit.allowed || !ipLimit.allowed) {
        const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
        return NextResponse.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
        );
      }
    } catch {
      return NextResponse.json({ error: "Registration is temporarily unavailable. Please try again." }, { status: 503 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "If registration can be completed, further instructions will be sent to that email address." },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        provider: "CREDENTIALS",
        profiles: {
          create: { displayName: name.trim(), languagePreference: "en" },
        },
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const appUrl = getPublicAppUrl();
    if (appUrl) {
      const oneTimeToken = createOneTimeToken();
      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: oneTimeToken.tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const verificationUrl = `${appUrl}/auth/verify-email#token=${oneTimeToken.token}`;
      const delivery = await sendTransactionalEmail({
        to: normalizedEmail,
        subject: "Verify your NexaFilm email",
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2>Welcome to NexaFilm</h2><p>Confirm your email address to complete your account setup.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours and can be used only once. If you did not create this account, you can ignore this email.</p><p style="color:#666;font-size:12px">NexaFilm · One Platform. Every Language. Endless Stories.</p></div>`,
      });
      if (!delivery.sent) {
        await prisma.emailVerificationToken.deleteMany({ where: { tokenHash: oneTimeToken.tokenHash } });
      }
    }

    return NextResponse.json(
      { message: "If registration can be completed, further instructions will be sent to that email address." },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      isEmailUniqueConflict(error)
    ) {
      return NextResponse.json(
        { message: "If registration can be completed, further instructions will be sent to that email address." },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    logSafeError("Registration failed", error);
    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 },
    );
  }
}
