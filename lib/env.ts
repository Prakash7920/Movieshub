
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  RATE_LIMIT_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false", ""]).optional().transform((value) => value === "true"),

  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

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
      if (value === undefined) {
        return !isProduction;
      }

      return value === "true";
    }),
});

const productionSchema = baseEnvSchema.superRefine((value, context) => {
  if (!isProduction) return;
  for (const key of ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    if (!value[key]) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Required in production." });
  }
  for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    const url = value[key];
    if (url && !url.startsWith("https://")) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Production URL must use HTTPS." });
  }
  if (value.RATE_LIMIT_SECRET && value.RATE_LIMIT_SECRET.length < 32) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["RATE_LIMIT_SECRET"], message: "Must contain at least 32 characters." });
  }
});
const parsedEnv = productionSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid server environment configuration: ${parsedEnv.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".") || "value"}: ${issue.message}`
      )
      .join(", ")}`
  );
}

const env = {
  ...parsedEnv.data,

  NODE_ENV: nodeEnv,

  NEXTAUTH_URL:
    parsedEnv.data.NEXTAUTH_URL ??
    "http://localhost:3000",

  NEXT_PUBLIC_APP_URL:
    parsedEnv.data.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
};

export const isProductionEnv = isProduction;

export const isDemoModeEnabled = env.DEMO_MODE;

export { env };

export default env;
