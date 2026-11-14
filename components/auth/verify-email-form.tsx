"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function VerifyEmailForm() {
  const params = useSearchParams();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Checking your verification link...");
  const [error, setError] = useState("");

  useEffect(() => {
    const fragmentToken = typeof window !== "undefined"
      ? new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token")
      : null;
    setToken(fragmentToken || params.get("token") || "");
  }, [params]);

  useEffect(() => {
    let active = true;
    setError("");
    setMessage("Checking your verification link...");
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError("This verification link is invalid. Request a new one.");
      setMessage("");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to verify your email.");
        if (active) setMessage(data.message || "Email verified successfully.");
      })
      .catch((reason: unknown) => {
        if (active) {
          setMessage("");
          setError(reason instanceof Error ? reason.message : "Unable to verify your email.");
        }
      });

    return () => { active = false; };
  }, [token]);

  return (
    <div className="space-y-4">
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Link href="/auth/login" className="inline-flex min-h-11 items-center underline">Continue to login</Link>
      <p className="text-sm text-gray-400">Need another link? <Link href="/auth/resend-verification" className="underline">Resend verification email</Link></p>
    </div>
  );
}
