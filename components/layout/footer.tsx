"use client";

import Link from "next/link";

import { Globe2 } from "lucide-react";
import { languageLabels } from "@/lib/translations";
import { useLanguage } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-200">
      <Globe2 className="h-4 w-4 text-accent" />
      <select aria-label="Select language" className="bg-transparent pr-1 text-sm text-white outline-none" value={language} onChange={(event) => setLanguage(event.target.value as "en" | "ta")}>
        {Object.entries(languageLabels).map(([value, label]) => (
          <option key={value} value={value} className="bg-slate-900 text-white">{label}</option>
        ))}
      </select>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
      <p>© {new Date().getFullYear()} NexaFilm. One Platform. Every Language. Endless Stories. Sample catalogue only; playback is unavailable until distribution rights are verified.</p>
      <nav aria-label="Legal" className="mt-4 flex justify-center gap-5 text-xs text-gray-400">
        <Link className="transition hover:text-white" href="/privacy">Privacy Policy</Link>
        <Link className="transition hover:text-white" href="/terms">Terms of Service</Link>
        <a className="transition hover:text-white" href="mailto:supportnexafilm@gmail.com">Contact</a>
      </nav>
    </footer>
  );
}
