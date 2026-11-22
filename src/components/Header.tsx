"use client";

import type { Language } from "../types/menu";
import { LANGUAGES, PENGUIN } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

export const LANGUAGE_SWITCH_ID = "menu-language";

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onTodayClick: () => void;
}

export function Header({ language, onLanguageChange, onTodayClick }: HeaderProps) {
  const copy = menuCopy[language];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onTodayClick}
          aria-label={`Gasan Menu · ${copy.today}`}
          className="flex items-center gap-1.5 rounded-lg text-sm font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5 sm:text-lg"
        >
          <Image src={PENGUIN.mascot} alt="" width={38} height={38} className="max-[359px]:w-8" priority />
          Gasan Menu
        </button>

        <div className="flex items-center gap-1 sm:gap-3">
          <div role="group" aria-label={copy.languages} className="flex items-center rounded-xl border bg-card p-0.5">
            {(Object.keys(LANGUAGES) as Language[]).map(code => (
              <button
                key={code}
                id={`${LANGUAGE_SWITCH_ID}-${code}`}
                type="button"
                lang={code}
                aria-label={LANGUAGES[code].name}
                aria-pressed={language === code}
                onClick={() => onLanguageChange(code)}
                className="h-9 min-w-8 rounded-lg px-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-[hsl(var(--menu-accent))] aria-pressed:text-[hsl(var(--menu-accent-foreground))] sm:min-w-10"
              >
                {LANGUAGES[code].short}
              </button>
            ))}
          </div>
          <ThemeToggle label={copy.theme} />
        </div>
      </div>
    </header>
  );
}
