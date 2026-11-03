import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <main className="page-shell py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-card/80 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Account verification</p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Verify your email</h1>
        <p className="mt-3 text-gray-400">We are checking your secure, single-use verification link.</p>
        <div className="mt-8"><Suspense fallback={<p className="text-gray-400">Loading verification...</p>}><VerifyEmailForm /></Suspense></div>
      </section>
    </main>
  );
}
