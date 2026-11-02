
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),

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

const parsedEnv = baseEnvSchema.safeParse(process.env);

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
