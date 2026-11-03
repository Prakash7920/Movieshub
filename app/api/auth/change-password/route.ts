import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "Choose a password different from your current password.",
  path: ["newPassword"],
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string } | undefined;
    if (!sessionUser?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const ip = getClientIp(request.headers);
    const userLimit = await consumeRateLimit("change-password-user", sessionUser.id, 5, 60 * 60);
    const ipLimit = ip ? await consumeRateLimit("change-password-ip", ip, 10, 60 * 60) : { allowed: true };
    if (!userLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json({ error: "Too many password-change attempts. Please try again later." }, {
        status: 429,
        headers: { "Retry-After": String(userLimit.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }

    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid current and new password." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true, provider: true, isBanned: true },
    });
    if (!user || user.isBanned || user.provider !== "CREDENTIALS" || !user.passwordHash ||
        !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionUser.id },
        data: { passwordHash, passwordChangedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: sessionUser.id } }),
    ]);

    return NextResponse.json({ message: "Password updated. Please sign in again." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to change your password right now." }, { status: 503 });
  }
}
