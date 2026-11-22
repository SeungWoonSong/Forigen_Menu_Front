"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Header, LANGUAGE_SWITCH_ID } from "../components/Header";
import { DateTabs } from "../components/DateTabs";
import type { DateTabsRef } from "../components/DateTabs";
import { MenuStatus } from "../components/MenuStatus";
import { readPreference, writePreference } from "../lib/browser-storage";
import { dateInKorea, LANGUAGES, PENGUIN, selectLanguage, timeInKorea } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import type { Language } from "../types/menu";

const LANGUAGE_KEY = "gasan-menu-language";
const WELCOME_KEY = "gasan-menu-welcome-dismissed";

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [showWelcome, setShowWelcome] = useState(false);
  const [now, setNow] = useState<Date>();
  const dateTabsRef = useRef<DateTabsRef>(null);
  const copy = menuCopy[language];

  useEffect(() => {
    const saved = readPreference(LANGUAGE_KEY);
    const selected = selectLanguage(saved, navigator.languages);
    setLanguage(selected);
    setShowWelcome(saved !== selected && readPreference(WELCOME_KEY) !== "yes");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function updateClock() {
      clearTimeout(timer);
      const current = new Date();
      setNow(current);
      const isoDate = dateInKorea(current).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
      const firstDinner = Date.parse(`${isoDate}T14:00:00+09:00`);
      const midnight = Date.parse(`${isoDate}T00:00:00+09:00`) + 86_400_000;
      const boundary = current.getTime() < firstDinner ? firstDinner : midnight;
      timer = setTimeout(updateClock, boundary - current.getTime());
    }
    updateClock();
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  function dismissWelcome() {
    writePreference(WELCOME_KEY, "yes");
    setShowWelcome(false);
  }

  function changeLanguage(chosen: Language) {
    writePreference(LANGUAGE_KEY, chosen);
    setLanguage(chosen);
    dismissWelcome();
  }

  const today = now && dateInKorea(now);

  return (
    <div className="flex min-h-screen flex-col">
      <Header language={language} onLanguageChange={changeLanguage} onTodayClick={() => dateTabsRef.current?.goToToday()} />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5 sm:px-6 sm:py-7">
        {showWelcome && (
          <aside className="flex items-start gap-2">
            <Image src={PENGUIN.welcome} alt="" width={48} height={48} className="shrink-0" />
            <div className="menu-speech flex flex-1 items-start justify-between gap-1 rounded-xl px-3 py-2 text-sm leading-relaxed">
              <p>{copy.welcome(LANGUAGES[language].name)}{" · "}
                <button type="button" className="rounded-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => document.getElementById(`${LANGUAGE_SWITCH_ID}-${language}`)?.focus()}>
                  {copy.change}
                </button>
              </p>
              <button type="button" onClick={dismissWelcome} aria-label={copy.close}
                className="shrink-0 rounded-md p-1 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </aside>
        )}
        {today && now
          ? <DateTabs key={today} ref={dateTabsRef} language={language} today={today} dinnerFirst={timeInKorea(now) >= "14:00"} />
          : <MenuStatus state="loading" language={language} />}
      </main>

      <footer className="border-t px-4 py-6 text-center">
        <a href="https://www.linkedin.com/in/sungwoonsong" target="_blank" rel="noopener noreferrer"
          className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Made by Sungwoon Song
        </a>
      </footer>
    </div>
  );
}
