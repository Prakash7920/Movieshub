import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/lib/subscriptions/plans";

export type UserEntitlements = {
  plan: SubscriptionPlanId;
  isPremium: boolean;
  adFree: boolean;
  premiumCatalog: boolean;
  maxPlaybackQuality: "SD" | "HD";
  offlineDownloads: false;
  subscriptionStatus: "ACTIVE" | "TRIALING" | "FREE";
  validUntil: Date | null;
};

export async function getUserEntitlements(userId: string, now = new Date()): Promise<UserEntitlements> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });

  if (!user || user.isBanned) {
    return freeEntitlements();
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: "PREMIUM",
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
      startDate: { lte: now },
    },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    select: { status: true, endDate: true },
  });

  if (!subscription) {
    return freeEntitlements();
  }

  const plan = SUBSCRIPTION_PLANS.PREMIUM;
  return {
    plan: "PREMIUM",
    isPremium: true,
    adFree: plan.entitlements.adFree,
    premiumCatalog: plan.entitlements.premiumCatalog,
    maxPlaybackQuality: plan.entitlements.maxPlaybackQuality,
    offlineDownloads: false,
    subscriptionStatus: subscription.status,
    validUntil: subscription.endDate,
  };
}

function freeEntitlements(): UserEntitlements {
  const plan = SUBSCRIPTION_PLANS.FREE;
  return {
    plan: "FREE",
    isPremium: false,
    adFree: plan.entitlements.adFree,
    premiumCatalog: plan.entitlements.premiumCatalog,
    maxPlaybackQuality: plan.entitlements.maxPlaybackQuality,
    offlineDownloads: false,
    subscriptionStatus: "FREE",
    validUntil: null,
  };
}
