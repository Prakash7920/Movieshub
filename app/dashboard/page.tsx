import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { ArrowRight, Bookmark, History, Settings2, ShieldCheck } from "lucide-react";
import { WatchlistContent } from "@/components/movies/watchlist";
import { authOptions } from "@/lib/auth-options";
import { getUserEntitlements } from "@/lib/subscriptions/entitlements";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  const entitlements = sessionUser?.id
    ? await getUserEntitlements(sessionUser.id).catch((error) => {
        console.error("Dashboard subscription lookup failed:", error);
        return null;
      })
    : null;

  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">MoviesHub preview</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">My Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">Your movie library synced to your account.</p>
        </div>
        <Link href="/movies" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500">
          Explore movies <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7" aria-labelledby="subscription-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-red-200">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em]">My plan</p>
            </div>
            <h2 id="subscription-heading" className="mt-2 text-2xl font-bold text-white">
              {entitlements ? (entitlements.plan === "PREMIUM" ? "Premium" : "Free") : sessionUser?.id ? "Status unavailable" : "Sign in to view your plan"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              {entitlements
                ? entitlements.isPremium
                  ? "Your account currently has Premium entitlements. Secure streaming and downloads are not enabled yet."
                  : "You are on the Free plan. Premium checkout is not available yet, and no payment has been taken."
                : sessionUser?.id
                  ? "We couldn't load your plan right now. Please refresh the page later."
                  : "Your plan details are private to your signed-in account."}
            </p>
          </div>
          {entitlements ? (
            <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200">
              {entitlements.subscriptionStatus === "TRIALING" ? "Trial" : entitlements.isPremium ? "Active" : "Free plan"}
            </span>
          ) : null}
        </div>
        {entitlements?.validUntil ? (
          <p className="mt-4 text-xs text-gray-500">
            Current access valid until {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(entitlements.validUntil)}.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/subscription" className="inline-flex items-center gap-2 rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10">
            View plans <ArrowRight className="h-4 w-4" />
          </Link>
          {!sessionUser?.id ? (
            <Link href="/auth/login" className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5">
              Sign in
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard href="/dashboard/watchlist" icon={<Bookmark className="h-5 w-5" />} title="My Watchlist" description="View and manage the movies you saved." />
        <DashboardCard href="/dashboard/history" icon={<History className="h-5 w-5" />} title="Watch History" description="View your saved history entries and preview progress." />
        <DashboardCard href="/dashboard/settings" icon={<Settings2 className="h-5 w-5" />} title="Settings" description="Account settings are a preview in this version." />
      </div>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Saved movies</h2>
            <p className="mt-1 text-sm text-gray-400">Your account watchlist.</p>
          </div>
          <Link href="/dashboard/watchlist" className="text-sm font-medium text-red-300 hover:text-red-200">Manage watchlist →</Link>
        </div>
        <WatchlistContent />
      </section>
      <p className="mt-6 text-xs leading-5 text-gray-500">Subscription information is loaded securely for your signed-in account. Payments, streaming, and secure video access remain disabled until the required backend and content rights are verified.</p>
    </div>
  );
}

function DashboardCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-red-500/40 hover:bg-white/[0.07]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-200">{icon}</div>
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
    </Link>
  );
}
