import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import AdminMovies from "@/components/admin/admin-movies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) redirect("/auth/login?callbackUrl=%2Fadmin");
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true, isBanned: true } });
  if (!user || user.isBanned || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
    return <main className="page-shell py-20"><h1 className="text-3xl font-bold text-white">Admin access required</h1><p className="mt-3 text-gray-400">Your account does not have an administrator role.</p></main>;
  }
  return <AdminMovies />;
}
