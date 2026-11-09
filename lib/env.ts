import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const isCi = process.env.CI === "true";

const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),

  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  RATE_LIMIT_SECRET: z.union([z.string().min(32), z.literal("")]).optional(),
  CRON_SECRET: z.union([z.string().min(32), z.literal("")]).optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false", ""]).optional().transform((value) => value === "true"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  PAYMENT_KEY_ID: z.string().optional(),
  PAYMENT_KEY_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  MEDIA_SIGNING_SECRET: z.string().optional(),
  AI_API_KEY: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

  DEMO_MODE: z
    .enum(["true", "false", ""])
    .optional()
    .transform((value) => {
      if (value === undefined) return !isProduction;
      return value === "true";
    }),
});

const productionEnvSchema = baseEnvSchema.superRefine((value, context) => {
  const required = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const;

  for (const key of required) {
    if (!value[key]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: "Required in production.",
      });
    }
  }

  // CI builds use loopback-only URLs for their isolated test database and browser.
  // This exception is limited to CI; deployed production still requires HTTPS.
  const allowCiLoopbackHttp = isCi && process.env.CI === "true";
  for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    const urlValue = value[key];
    if (!urlValue) continue;
    try {
      const parsed = new URL(urlValue);
      const isHttps = parsed.protocol === "https:";
      const isCiLoopbackHttp =
        allowCiLoopbackHttp &&
        parsed.protocol === "http:" &&
        (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
      if (!isHttps && !isCiLoopbackHttp) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Must use HTTPS in production (HTTP loopback is permitted only in CI).",
        });
      }
    } catch {
      // The base schema reports malformed URLs.
    }
  }
});

const parsedEnv = (isProduction ? productionEnvSchema : baseEnvSchema).safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid server environment configuration: ${parsedEnv.error.issues
      .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      .join(", ")}`
  );
}

const env = {
  ...parsedEnv.data,
  NODE_ENV: nodeEnv,
  NEXTAUTH_URL: parsedEnv.data.NEXTAUTH_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: parsedEnv.data.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const isProductionEnv = isProduction;
export const isDemoModeEnabled = env.DEMO_MODE;
export { env };
export default env;
