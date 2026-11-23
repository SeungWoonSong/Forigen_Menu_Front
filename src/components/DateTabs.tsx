"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Language } from "../types/menu";
import { businessDayLabel, dateLabel, dateTabLabel, initialMenuDates, menuState, menuWeekDates, pickDefaultDate } from "../lib/menu";
import type { MenuRequest, MenuRequests } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { cn } from "../lib/utils";
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
  const results = requests[language] ?? noResults;
  const copy = menuCopy[language];
  const closedToday = !initialDates.includes(today);
  const upcomingBusinessDay = initialDates[0];
  const initialReady = initialDates.every(date => results[date]);
  const defaultDate = pickDefaultDate(initialDates, today, initialReady ? results : noResults);
  const selected = selection ?? defaultDate;

  useEffect(() => {
    for (const date of dates) {
      const key = `${language}-${date}`;
      if (results[date] || pending.current.has(key)) continue;

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

  function moveWeek(offset: number) {
    const nextDates = menuWeekDates(dates[0], offset);
    setDates(nextDates);
    setSelection(nextDates.includes(today) ? today : nextDates[0]);
  }

  useImperativeHandle(ref, () => ({
    goToToday: () => {
      setDates(initialDates);
      setSelection(initialReady ? defaultDate : undefined);
    },
  }), [defaultDate, initialDates, initialReady]);

  const businessLabel = copy.nextBusiness(businessDayLabel(upcomingBusinessDay, language));
  function retry(date: string) {
    setSelection(date);
    setRequests(current => ({ ...current, [language]: { ...current[language], [date]: undefined } }));
  }

  return (
    <Tabs value={selected} onValueChange={setSelection} activationMode="manual" className="space-y-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={copy.earlier} className="h-9 w-8 shrink-0 bg-card"
          onClick={() => moveWeek(-1)}><ChevronLeft size={17} aria-hidden="true" /></Button>
        <TabsList aria-label={copy.dates} className="grid h-9 min-w-0 flex-1 grid-cols-5 gap-0 border bg-card p-[3px]">
          {dates.map(date => {
            const isToday = date === today;
            const state = menuState(date, today, results[date]);
            const visibleLabel = dateTabLabel(date, language);
            const label = [
              visibleLabel,
              dateLabel(date, language, true),
              isToday && copy.today,
              state === "empty" && copy.noMenu,
              state === "menu" && copy.available,
            ].filter(Boolean).join(" · ");
            return (
              <TabsTrigger key={date} value={date} aria-label={label} aria-current={isToday ? "date" : undefined}
                className={cn(
                  "h-7 min-w-0 px-0 py-0 text-xs aria-[current=date]:font-bold focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:bg-[hsl(var(--menu-accent))] data-[state=active]:text-[hsl(var(--menu-accent-foreground))]",
                  state === "empty" ? "text-muted-foreground" : "text-foreground",
                )}>
                <span className={isToday ? "relative after:absolute after:bottom-0 after:right-0 after:h-px after:w-3 after:rounded-full after:bg-current" : undefined}>
                  {visibleLabel}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button type="button" variant="outline" size="icon" aria-label={copy.later} className="h-9 w-8 shrink-0 bg-card"
          onClick={() => moveWeek(1)}><ChevronRight size={17} aria-hidden="true" /></Button>
      </div>

      {closedToday && (
        <aside className="rounded-xl bg-muted px-3 py-2 text-xs text-secondary-foreground">
          <span className="font-semibold">{copy.closed}</span>{" · "}
          {selected === upcomingBusinessDay ? businessLabel : (
            <button type="button" onClick={() => { setDates(initialDates); setSelection(upcomingBusinessDay); }}
              className="rounded-sm text-left underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {businessLabel}
            </button>
          )}
        </aside>
      )}

      {dates.map(date => {
        const result = results[date];
        const state = !selection && !initialReady ? "loading" : menuState(date, today, result);
        const action = state === "error" ? { label: copy.retry, onClick: () => retry(date) } : undefined;
        return (
          <TabsContent key={date} value={date} className="mt-0">
            {state === "menu" && result?.status === "ready"
              ? <MenuCard menu={result.menu} language={language} dinnerFirst={date === today && afterLunch} />
              : <MenuStatus state={state === "menu" ? "loading" : state} language={language} action={action} />}
          </TabsContent>
        );
      })}
    </Tabs>
  );
});
