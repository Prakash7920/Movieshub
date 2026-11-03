import Link from "next/link";

export default function SubscriptionFailurePage() {
  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Payment not connected</p>
        <h1 className="mt-4 text-3xl font-bold text-white">No payment was processed here</h1>
        <p className="mt-4 text-gray-300">
          NexaFilm does not currently have a payment gateway connected. This page does not indicate a declined transaction or change your subscription status.
        </p>
        <Link href="/subscription" className="mt-8 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
          Return to plans
        </Link>
      </div>
    </div>
  );
}
