import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CalendarDays, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) redirect("/auth/login?callbackUrl=%2Fdashboard%2Fsettings");

  const account = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, username: true, email: true, provider: true, isEmailVerified: true, createdAt: true },
  });
  if (!account) redirect("/auth/login");

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-gray-400">Review your NexaFilm account information and security status.</p>
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-200"><UserRound className="h-5 w-5" /></div>
            <div><h2 className="font-semibold text-white">Profile information</h2><p className="text-sm text-gray-400">Your registered account details</p></div>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Full name</dt><dd className="mt-1 text-white">{account.name || "Not provided"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Username</dt><dd className="mt-1 text-white">{account.username || "Not set"}</dd></div>
            <div><dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500"><Mail className="h-3.5 w-3.5" /> Email address</dt><dd className="mt-1 break-all text-white">{account.email}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Sign-in method</dt><dd className="mt-1 text-white">{account.provider === "CREDENTIALS" ? "Email and password" : account.provider}</dd></div>
            <div><dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500"><CalendarDays className="h-3.5 w-3.5" /> Member since</dt><dd className="mt-1 text-white">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(account.createdAt)}</dd></div>
          </dl>
        </section>
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-200"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="font-semibold text-white">Account security</h2><p className="text-sm text-gray-400">Current verification status</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4">
            <div><p className="text-sm font-medium text-white">Email verification</p><p className="mt-1 text-xs text-gray-400">Your registered email address</p></div>
            <span className={account.isEmailVerified ? "rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300" : "rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-300"}>{account.isEmailVerified ? "Verified" : "Not verified"}</span>
          </div>
          <Link href="/auth/forgot-password" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/10"><KeyRound className="h-4 w-4" /> Reset password</Link>
        </section>
        <p className="mt-6 text-xs leading-5 text-gray-500">Profile editing and account deletion are not enabled in this preview. Your account details are shown read-only; no changes have been made.</p>
        <Link href="/dashboard" className="mt-6 inline-flex text-sm font-medium text-red-300 hover:text-red-200">← Back to dashboard</Link>
      </div>
    </div>
  );
}
