type TransactionalEmail = { to: string; subject: string; html: string };
export type EmailDeliveryResult = { sent: true } | { sent: false; reason: "not_configured" | "provider_rejected" | "network_error" };
export async function sendTransactionalEmail(message: TransactionalEmail): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }), signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { sent: true } : { sent: false, reason: "provider_rejected" };
  } catch { return { sent: false, reason: "network_error" }; }
}
export function getPublicAppUrl(): string | null {
  const raw = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
  try { const url = new URL(raw); if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null; return url.origin; }
  catch { return null; }
}
