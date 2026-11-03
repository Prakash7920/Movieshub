import { NextResponse } from "next/server";
import { logSafeError } from "@/lib/security/safe-log";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getUserEntitlements } from "@/lib/subscriptions/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) {
    return NextResponse.json(
      { error: "Sign in to view your subscription." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const entitlements = await getUserEntitlements(sessionUser.id);
    return NextResponse.json(
      { entitlements },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    logSafeError("Subscription status lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load subscription status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
