"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsSubmitting(true);
    setServerMessage("");
    setServerError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error ?? "Unable to create your account. Please try again.");
        return;
      }

      setServerMessage("Account created successfully! You can now log in.");
    } catch {
      setServerError("Could not connect to the server. Please check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Full name</label>
        <input
          {...register("name")}
          autoComplete="name"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
        />
        {errors.name && <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-300">Email</label>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
        />
        {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-300">Password</label>
        <input
          type="password"
          {...register("password")}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
        />
        {errors.password && <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-300">Confirm password</label>
        <input
          type="password"
          {...register("confirmPassword")}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
        />
        {errors.confirmPassword && (
          <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {serverError}
        </p>
      )}

      {serverMessage && (
        <p role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
          {serverMessage} <a href="/auth/login" className="underline">Go to login</a>
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-500"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
