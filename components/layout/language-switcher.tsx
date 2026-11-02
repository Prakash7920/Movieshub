"use client";

import { Globe2 } from "lucide-react";
import { languageLabels } from "@/lib/translations";
import { useLanguage } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-gray-200">
      <Globe2 className="h-4 w-4 text-accent" />
      <select
        aria-label="Select language"
        className="bg-transparent pr-1 text-sm text-white outline-none"
        value={language}
        onChange={(event) => setLanguage(event.target.value as "en" | "ta")}
      >
        {Object.entries(languageLabels).map(([value, label]) => (
          <option key={value} value={value} className="bg-slate-900 text-white">
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
