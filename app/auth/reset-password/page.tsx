import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-card/80 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Account security</p>
        <h1 className="mt-3 text-4xl font-black text-white">Create a new password</h1>
        <p className="mt-3 text-gray-400">Choose a strong password you have not used on NexaFilm before.</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-gray-400">Loading reset form...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
        <div className="mt-5 text-center text-sm text-gray-400">
          <Link href="/auth/login" className="text-red-300 hover:text-red-200">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
