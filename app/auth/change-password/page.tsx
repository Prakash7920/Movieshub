import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) redirect("/auth/login?callbackUrl=%2Fauth%2Fchange-password");

  return (
    <main className="page-shell py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-card/80 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-red-200">Account security</p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Change password</h1>
        <p className="mt-3 text-gray-400">Changing your password signs out existing sessions. Sign in again with your new password.</p>
        <div className="mt-8"><ChangePasswordForm /></div>
      </section>
    </main>
  );
}
