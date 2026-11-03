"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPrice,
  getSubscriptionPriceLabel,
  type SubscriptionBillingCycle,
  type SubscriptionPlanId,
} from "@/lib/subscriptions/plans";

export default function SubscriptionPage() {
  const [billing, setBilling] = useState<SubscriptionBillingCycle>("MONTHLY");

  const handleCheckout = (plan: SubscriptionPlanId) => {
    // Checkout intentionally remains disabled until authenticated order creation,
    // gateway integration, signature verification, and webhook reconciliation exist.
    if (plan === "FREE") {
      window.location.assign("/auth/register");
    }
  };

  const freePlan = SUBSCRIPTION_PLANS.FREE;
  const premiumPlan = SUBSCRIPTION_PLANS.PREMIUM;

  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Plans & pricing</p>
        <h1 className="mt-3 text-4xl font-black text-white">Choose your NexaFilm plan</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-400">Choose monthly or annual billing. Prices shown are planned catalogue prices; paid checkout is not open yet.</p>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-card/80 p-1">
          <button type="button" aria-pressed={billing === "MONTHLY"} className={`rounded-full px-4 py-2 text-sm ${billing === "MONTHLY" ? "bg-red-600 text-white" : "text-gray-300"}`} onClick={() => setBilling("MONTHLY")}>Monthly</button>
          <button type="button" aria-pressed={billing === "YEARLY"} className={`rounded-full px-4 py-2 text-sm ${billing === "YEARLY" ? "bg-red-600 text-white" : "text-gray-300"}`} onClick={() => setBilling("YEARLY")}>Yearly</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlanCard plan={freePlan} billing={billing} onSelect={() => handleCheckout("FREE")} />
        <PlanCard plan={premiumPlan} billing={billing} onSelect={() => handleCheckout("PREMIUM")} />
      </div>

      <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
          <h2 className="font-semibold text-white">Payments are not enabled yet</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-300">No payment will be collected and no Premium entitlement will be granted from this page. We will enable checkout only after the authenticated order API, payment-provider test integration, verified webhooks, and subscription access checks pass validation.</p>
      </div>
    </div>
  );
}

function PlanCard({ plan, billing, onSelect }: {
  plan: (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanId];
  billing: SubscriptionBillingCycle;
  onSelect: () => void;
}) {
  const isPremium = plan.id === "PREMIUM";
  const price = getSubscriptionPrice(plan.id, billing);
  const priceLabel = getSubscriptionPriceLabel(plan.id, billing);

  return (
    <section className={`rounded-[1.75rem] border p-6 ${isPremium ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-card/70"}`}>
      <p className="text-sm uppercase tracking-[0.22em] text-red-200">{plan.name}</p>
      <h2 className="mt-3 text-4xl font-bold text-white">{priceLabel}</h2>
      <p className="mt-1 text-sm text-gray-500">{price === 0 ? "Always free" : billing === "YEARLY" ? "per year" : "per month"}</p>
      <p className="mt-4 text-sm text-gray-300">{plan.description}</p>
      <ul className="mt-5 space-y-3 text-sm text-gray-200">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button type="button" className={`mt-6 w-full ${isPremium ? "bg-red-600 hover:bg-red-500" : ""}`} variant={isPremium ? "default" : "secondary"} disabled={isPremium} onClick={onSelect}>
        {isPremium ? "Premium checkout coming soon" : "Create a free account"}
      </Button>
      {isPremium && <p className="mt-3 text-center text-xs text-gray-500">No charge is made on this preview page.</p>}
    </section>
  );
}
