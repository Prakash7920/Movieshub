import { ResendVerificationForm } from "@/components/auth/resend-verification-form";

export default function ResendVerificationPage() {
  return (
    <main className="page-shell py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-card/80 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Account verification</p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Resend verification</h1>
        <p className="mt-3 text-gray-400">Enter your email address. If an unverified account exists, we will send a fresh link.</p>
        <div className="mt-8"><ResendVerificationForm /></div>
      </section>
    </main>
  );
}
