export type SubscriptionPlanId = "FREE" | "PREMIUM";
export type SubscriptionBillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  monthlyPriceInr: number;
  yearlyPriceInr: number;
  features: string[];
  entitlements: {
    premiumCatalog: boolean;
    adFree: boolean;
    maxPlaybackQuality: "SD" | "HD";
    offlineDownloads: false;
  };
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    description: "Selected free titles with ad-supported viewing.",
    monthlyPriceInr: 0,
    yearlyPriceInr: 0,
    features: ["Selected free titles", "Ads where content rights permit", "Standard quality", "Watchlist and watch history"],
    entitlements: {
      premiumCatalog: false,
      adFree: false,
      maxPlaybackQuality: "SD",
      offlineDownloads: false,
    },
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    description: "Premium catalogue access with an ad-free viewing experience.",
    monthlyPriceInr: 299,
    yearlyPriceInr: 2399,
    features: ["Premium catalogue access", "Ad-free viewing where rights permit", "HD quality where available", "Multiple profiles (subject to account limits)"],
    entitlements: {
      premiumCatalog: true,
      adFree: true,
      maxPlaybackQuality: "HD",
      offlineDownloads: false,
    },
  },
};

export function getSubscriptionPrice(planId: SubscriptionPlanId, billingCycle: SubscriptionBillingCycle) {
  const plan = SUBSCRIPTION_PLANS[planId];
  return billingCycle === "YEARLY" ? plan.yearlyPriceInr : plan.monthlyPriceInr;
}

export function getSubscriptionPriceLabel(planId: SubscriptionPlanId, billingCycle: SubscriptionBillingCycle) {
  const price = getSubscriptionPrice(planId, billingCycle);
  return price === 0 ? "₹0" : `₹${price.toLocaleString("en-IN")}`;
}
