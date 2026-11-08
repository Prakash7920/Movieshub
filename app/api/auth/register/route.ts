import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || null;
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    try {
      if (ip && !(await consumeAuthRateLimit(`register-ip:${ip}`, 5))) {
        return NextResponse.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      console.error("Registration rate limiter unavailable; rejecting request.");
      return NextResponse.json(
        { error: "Registration is temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

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

    try {
      if (!(await consumeAuthRateLimit(`register-email:${normalizedEmail}`, 3))) {
        return NextResponse.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      console.error("Registration rate limiter unavailable; rejecting request.");
      return NextResponse.json(
        { error: "Registration is temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
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

    return NextResponse.json(
      { message: "Account created successfully.", user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 },
    );
  }
}
