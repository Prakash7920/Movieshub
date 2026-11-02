"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    setServerError("");

    try {
      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        setServerError("Email or password is incorrect. Please check your details and try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Unable to log in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Email</label>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white placeholder:text-gray-500"
          placeholder="you@example.com"
        />
        {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-300">Password</label>
        <input
          type="password"
          {...register("password")}
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white placeholder:text-gray-500"
          placeholder="••••••••"
        />
        {errors.password && <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-500"
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
