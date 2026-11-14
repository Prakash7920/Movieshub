import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters long.").max(128),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().email("Please enter a valid email.").max(254),
  password: z.string().min(8, "Password must contain at least 8 characters.").max(128),
  confirmPassword: z.string().max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email.").max(254),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email(),
  languagePreference: z.enum(["en", "ta"]),
});
