"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const planData = [
  { name: "Free", price: 0, description: "Selected free movies and standard quality.", features: ["Up to 5 free titles", "Ads enabled", "Standard quality"] },
  { name: "Premium", price: 299, description: "Ad-free streaming and premium catalog access.", features: ["Ad-free viewing", "Premium movies", "Full HD", "Watchlist + profiles", "Priority support"] },
];

export function SubscriptionCard({ plan, yearly }: { plan: "Free" | "Premium"; yearly: boolean }) {
  const isPremium = plan === "Premium";
  const price = isPremium ? (yearly ? 2399 : 299) : 0;
  const unit = yearly ? "/year" : "/month";

  return (
    <div className={`rounded-[1.75rem] border p-6 ${isPremium ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-card/70"}`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-red-200">{plan}</p>
          <h3 className="mt-3 text-3xl font-bold text-white">₹{price}</h3>
        </div>
        {isPremium && <Sparkles className="h-6 w-6 text-yellow-400" />}
      </div>

      <p className="text-sm text-gray-300">{planData[isPremium ? 1 : 0].description}</p>

      <ul className="mt-5 space-y-3 text-sm text-gray-200">
        {planData[isPremium ? 1 : 0].features.map((feature) => (
          <li key={feature} className="flex items-center gap-3"><Check className="h-4 w-4 text-red-400" /> {feature}</li>
        ))}
      </ul>

      <Button className={`mt-6 w-full ${isPremium ? "bg-red-600 hover:bg-red-500" : "bg-white/5 hover:bg-white/10"}`}>
        {isPremium ? "Upgrade to Premium" : "Start free"}
      </Button>
      <p className="mt-3 text-center text-xs text-gray-500">Billed as {isPremium ? `${price}${unit}` : "₹0"}</p>
    </div>
  );
}

export function SubscriptionPageContent() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Choose your plan</p>
        <h1 className="mt-3 text-4xl font-black text-white">MoviesHub subscription</h1>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-card/70 p-1">
          <button className={`rounded-full px-4 py-2 text-sm ${!yearly ? "bg-red-600 text-white" : "text-gray-300"}`} type="button" onClick={() => setYearly(false)}>
            Monthly
          </button>
          <button className={`rounded-full px-4 py-2 text-sm ${yearly ? "bg-red-600 text-white" : "text-gray-300"}`} type="button" onClick={() => setYearly(true)}>
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionCard plan="Free" yearly={yearly} />
        <SubscriptionCard plan="Premium" yearly={yearly} />
      </div>

      <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 p-6">
        <div className="flex items-center gap-3 text-white">
          <ShieldCheck className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-semibold">Safe checkout</h2>
        </div>
        <p className="mt-3 text-gray-300">
          This payment flow uses a secure abstraction layer. No card details are stored in the app. Production checkout will integrate with a real payment gateway through environment variables.
        </p>
      </div>
    </div>
  );
}

export function PaymentSuccessState({ planName }: { planName: string }) {
  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</div>
        <h1 className="text-3xl font-black text-white">Payment successful</h1>
        <p className="mt-3 text-gray-300">Your {planName} subscription is active. Enjoy ad-free streaming and premium access.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white">Go to dashboard</Link>
          <Link href="/movies" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white">Browse movies</Link>
        </div>
      </div>
    </div>
  );
}

export function PaymentFailureState({ reason }: { reason?: string }) {
  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-red-500/30 bg-red-500/5 p-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-300">!</div>
        <h1 className="text-3xl font-black text-white">Payment failed</h1>
        <p className="mt-3 text-gray-300">{reason ?? "We couldn’t process your payment. Please try again or use a different method."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/subscription" className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white">Retry payment</Link>
          <Link href="/support" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white">Contact support</Link>
        </div>
      </div>
    </div>
  );
}

