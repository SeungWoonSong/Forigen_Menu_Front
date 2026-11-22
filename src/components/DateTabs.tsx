"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Language } from "../types/menu";
import { dateLabel, dateTabLabel, initialMenuDates, isClosedDay, menuState, nextBusinessDay, pickDefaultDate, shiftDay } from "../lib/menu";
import type { MenuRequest, MenuRequests } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { getDayMenu } from "../services/menuService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { MenuCard } from "./MenuCard";
import { MenuStatus } from "./MenuStatus";

export interface DateTabsRef {
  goToToday: () => void;
}

interface DateTabsProps {
  language: Language;
  today: string;
  afterLunch: boolean;
}

const noResults: MenuRequests = {};

export const DateTabs = forwardRef<DateTabsRef, DateTabsProps>(function DateTabs(
  { language, today, afterLunch }, ref,
) {
  const [initialDates] = useState(() => initialMenuDates(today));
  const [dates, setDates] = useState(initialDates);
  const [selection, setSelection] = useState<string>();
  const [requests, setRequests] = useState<Partial<Record<Language, MenuRequests>>>({});
  const pending = useRef(new Set<string>());
  const list = useRef<HTMLDivElement>(null);
  const results = requests[language] ?? noResults;
  const copy = menuCopy[language];
  const closedToday = isClosedDay(today);
  const upcomingBusinessDay = nextBusinessDay(today);
  const tomorrow = shiftDay(today, 1);
  const initialReady = initialDates.every(date => isClosedDay(date) || results[date]);
  const defaultDate = initialReady
    ? pickDefaultDate(initialDates, today, results)
    : closedToday ? upcomingBusinessDay : today;
  const selected = selection ?? defaultDate;

  useEffect(() => {
    for (const date of dates) {
      const key = `${language}-${date}`;
      if (isClosedDay(date) || results[date] || pending.current.has(key)) continue;

      pending.current.add(key);
      const settle = (result: MenuRequest) => {
        pending.current.delete(key);
        setRequests(current => ({ ...current, [language]: { ...current[language], [date]: result } }));
      };
      getDayMenu(date, language).then(
        menu => settle({ status: "ready", menu }),
        () => settle({ status: "error" }),
      );
    }
  }, [dates, language, results]);

  useEffect(() => {
    if (initialReady) setSelection(current => current ?? defaultDate);
  }, [initialReady, defaultDate]);

  useLayoutEffect(() => {
    const strip = list.current;
    const active = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;

    const inset = parseFloat(getComputedStyle(strip).scrollPaddingInlineStart);
    strip.scrollLeft += active.getBoundingClientRect().left - strip.getBoundingClientRect().left - inset;
  }, [selected, dates, language, initialReady]);

  useEffect(() => {
    const strip = list.current;
    if (!strip) return;

    // Start-aligned snapping can leave a partial label at the opposite edge.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.parentElement?.toggleAttribute("data-clipped", entry.intersectionRatio < 1);
      }
    }, { root: strip, threshold: 1 });
    strip.querySelectorAll("[data-date-label]").forEach(label => observer.observe(label));
    return () => observer.disconnect();
  }, [dates]);

  function navigate(date: string) {
    setDates(current => {
      if (current.includes(date)) return current;
      const earlier: string[] = [];
      const later: string[] = [];
      for (let day = shiftDay(current[0], -1); day >= date; day = shiftDay(day, -1)) earlier.unshift(day);
      for (let day = shiftDay(current[current.length - 1], 1); day <= date; day = shiftDay(day, 1)) later.push(day);
      return [...earlier, ...current, ...later];
    });
    setSelection(date);
  }

  useImperativeHandle(ref, () => ({
    goToToday: () => setSelection(initialReady ? defaultDate : undefined),
  }), [defaultDate, initialReady]);

  const businessLabel = (date: string) => copy.nextBusiness(dateLabel(date, language));
  function retry(date: string) {
    setSelection(date);
    setRequests(current => ({ ...current, [language]: { ...current[language], [date]: undefined } }));
  }

  return (
    <Tabs value={selected} onValueChange={navigate} activationMode="manual" className="space-y-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={copy.earlier} className="h-9 w-8 shrink-0 bg-card"
          onClick={() => navigate(shiftDay(selected, -1))}><ChevronLeft size={17} aria-hidden="true" /></Button>
        <TabsList ref={list} aria-label={copy.dates} className="h-auto min-w-0 bg-card ring-1 ring-inset ring-border">
          {dates.map(date => {
            const available = menuState(date, today, results[date]) === "menu";
            return (
              <TabsTrigger key={date} value={date} aria-current={date === today ? "date" : undefined}
                className="group relative h-7 flex-1 gap-1.5 px-2 py-0 text-xs aria-[current=date]:font-bold focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:bg-[hsl(var(--menu-accent))] data-[state=active]:text-[hsl(var(--menu-accent-foreground))] data-[state=inactive]:aria-[current=date]:text-foreground sm:px-1.5">
                <span data-date-label className="group-data-[clipped]:opacity-0">{dateTabLabel(date, language, today, tomorrow)}</span>
                {available && <><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--menu-available))] group-data-[clipped]:opacity-0" /><span className="sr-only">{copy.available}</span></>}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button type="button" variant="outline" size="icon" aria-label={copy.later} className="h-9 w-8 shrink-0 bg-card"
          onClick={() => navigate(shiftDay(selected, 1))}><ChevronRight size={17} aria-hidden="true" /></Button>
      </div>

      {closedToday && selected !== today && (
        <aside className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl bg-muted px-4 py-3 text-sm text-secondary-foreground">
          <span className="font-semibold">{copy.closed} <span aria-hidden="true">·</span></span>
          <button type="button" onClick={() => navigate(upcomingBusinessDay)}
            className="rounded-sm text-left underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {businessLabel(upcomingBusinessDay)}
          </button>
        </aside>
      )}

      {dates.map(date => {
        const result = results[date];
        const state = !selection && !initialReady ? "loading" : menuState(date, today, result);
        const businessDate = nextBusinessDay(date);
        const action = state === "closed" ? { label: businessLabel(businessDate), onClick: () => navigate(businessDate) } :
          state === "error" ? { label: copy.retry, onClick: () => retry(date) } : undefined;
        return (
          <TabsContent key={date} value={date} className="mt-0">
            {state === "menu" && result?.status === "ready"
              ? <MenuCard menu={result.menu} language={language} dinnerFirst={date === today && afterLunch} />
              : <MenuStatus state={state === "menu" ? "loading" : state} language={language} closedToday={date === today} action={action} />}
          </TabsContent>
        );
      })}
    </Tabs>
  );
});
