import Link from "next/link";
import { Film, Home, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="page-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold text-white">
            M
          </div>
          <div>
            <div className="text-base font-semibold text-white">{t.brand}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{t.tagline}</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {t[labelKey]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/auth/login"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-red-500/50 hover:text-red-200"
          >
            {t.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
