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

  useEffect(() => {
    let active = true;

    getSession().then((session) => {
      if (active) setIsLoggedIn(Boolean(session?.user));
    }).catch(() => {
      if (active) setIsLoggedIn(false);
    });

    return () => {
      active = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="page-shell flex items-center justify-between gap-2 py-3">
        <Link href="/" aria-label="NexaFilm home" className="flex min-w-0 shrink items-center gap-2">
          <Image
            src="/nexafilm-logo.svg"
            alt="NexaFilm — One Platform. Every Language. Endless Stories."
            width={210}
            height={53}
            priority
            className="h-auto w-[128px] shrink-0 sm:w-[170px] lg:w-[190px]"
          />
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
    </header>
  );
}
