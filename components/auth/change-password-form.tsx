"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("New password must be between 8 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to change password.");
      setMessage(data.message || "Password updated. Please sign in again.");
      await signOut({ callbackUrl: "/auth/login" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-300">Current password</label>
        <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white" required />
      </div>
      <div>
        <label className="mb-2 block text-sm text-gray-300">New password</label>
        <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white" required />
      </div>
      <div>
        <label className="mb-2 block text-sm text-gray-300">Confirm new password</label>
        <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white" required />
      </div>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading} className="min-h-11 w-full bg-red-600 hover:bg-red-500">
        {loading ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
