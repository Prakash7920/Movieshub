"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const schema = z.object({ email: z.string().email("Please enter a valid email address.").max(254) });

export function ResendVerificationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to process your request.");
      setMessage(data.message || "If an unverified account exists, a verification link will be sent.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Email</label>
        <input type="email" autoComplete="email" {...register("email")} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white" />
        {errors.email && <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>}
      </div>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading} className="min-h-11 w-full bg-red-600 hover:bg-red-500">
        {loading ? "Sending..." : "Resend verification email"}
      </Button>
    </form>
  );
}
