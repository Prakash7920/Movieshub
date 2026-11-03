"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getSession, signOut } from "next-auth/react";
import { Film, Home, LayoutDashboard, ShieldCheck, Sparkles, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/footer";
import { useLanguage } from "@/components/providers/language-provider";

const navItems = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/movies", labelKey: "movies", icon: Film },
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/assistant", labelKey: "assistant", icon: Sparkles },
  { href: "/admin", labelKey: "admin", icon: ShieldCheck },
] as const;

export function Navbar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getSession().then((session) => {
      const sessionUser = session?.user as unknown as { id?: string } | undefined;
      if (active) setIsLoggedIn(Boolean(sessionUser?.id));
    }).catch(() => {
      if (active) setIsLoggedIn(false);
    });

    return () => {
      active = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setLogoutError(null);
    try {
      const response = await fetch("/api/auth/revoke-session", { method: "POST", cache: "no-store" });
      if (!response.ok && response.status !== 401) {
        throw new Error("Secure logout could not be completed.");
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setIsSigningOut(false);
      setLogoutError("Secure logout could not be completed. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="page-shell flex items-center justify-between gap-2 py-3">
        <Link href="/" aria-label="NexaFilm home" className="flex min-w-0 shrink items-center gap-2">
          <Image src="/nexafilm-mark.svg" alt="" width={40} height={40} priority className="h-9 w-9 shrink-0" />
          <div>
            <div className="truncate text-sm font-semibold text-white sm:text-base">{t.brand}</div>
            <div className="hidden text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:block">{t.tagline}</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map(({ href, labelKey, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white">
              <Icon className="h-4 w-4" />
              {t[labelKey]}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            href="/admin"
            aria-label="Admin"
            title="Admin"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 p-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 md:hidden max-[380px]:hidden"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          {isLoggedIn ? (
            <button
              type="button"
              aria-label={isSigningOut ? "Logging out" : "Logout"}
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-2 text-sm font-medium text-white transition hover:border-red-500/50 hover:text-red-200 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{isSigningOut ? "Logging out..." : "Logout"}</span>
            </button>
          ) : (
            <Link href="/auth/login" className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:border-red-500/50 hover:text-red-200 sm:px-4 sm:text-sm">{t.login}</Link>
          )}
        </div>
      </div>
      {logoutError && (
        <div className="page-shell pb-2">
          <p role="alert" className="text-xs text-red-300">{logoutError}</p>
        </div>
      )}
    </header>
  );
}
