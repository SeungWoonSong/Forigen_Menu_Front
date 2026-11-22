"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Language, SideItem } from "../types/menu";
import { isStaple } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { cn } from "../lib/utils";
import { DietaryTags } from "./DietaryTags";

const narrowViewport = "(max-width: 639px)";
function subscribeToViewport(callback: () => void) {
  const media = window.matchMedia(narrowViewport);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const isNarrow = () => window.matchMedia(narrowViewport).matches;

function Details({ item, language, sheet }: { item: SideItem; language: Language; sheet?: boolean }) {
  return (
    <div className="space-y-2">
      <div>
        {sheet ? <Dialog.Title className="pr-8 text-xl font-semibold">{item.name}</Dialog.Title> :
          <p className="font-semibold">{item.name}</p>}
        {item.original_name && <p lang="ko" className="mt-0.5 text-sm text-muted-foreground">{item.original_name}</p>}
      </div>
      {sheet ? <Dialog.Description className="text-sm leading-relaxed">{item.summary}</Dialog.Description> :
        <p className="text-sm leading-relaxed">{item.summary}</p>}
      <DietaryTags info={item} language={language} />
      <p className="border-t pt-2 text-xs leading-relaxed text-muted-foreground">{menuCopy[language].allergy}</p>
    </div>
  );
}

function SideDetails({ item, language, className, narrow }: { item: SideItem; language: Language; className: string; narrow: boolean }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerClass = cn(className, "underline decoration-dotted underline-offset-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring");

  if (narrow) {
    return (
      <Dialog.Root>
        <Dialog.Trigger className={triggerClass}>{item.name}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="menu-side-sheet fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border bg-popover p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-xl">
            <Details item={item} language={language} sheet />
            <Dialog.Close aria-label={menuCopy[language].close} className="absolute right-4 top-4 rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Tooltip.Root open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <Tooltip.Trigger
        className={triggerClass}
        onClick={event => { event.preventDefault(); setTooltipOpen(true); }}
      >
        {item.name}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={8} collisionPadding={12} aria-label={`${item.summary} ${menuCopy[language].allergy}`}
          className="z-40 w-72 max-w-[var(--radix-tooltip-content-available-width)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
          <Details item={item} language={language} />
          <Tooltip.Arrow className="fill-popover" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function SideChips({ items, language }: { items: SideItem[]; language: Language }) {
  const narrow = useSyncExternalStore(subscribeToViewport, isNarrow, () => false);
  if (!items.length) return null;

  return (
    <Tooltip.Provider delayDuration={180}>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item, index) => {
          const className = cn("inline-block min-h-7 max-w-full whitespace-normal rounded-md border bg-muted px-2.5 py-1 text-left text-xs font-medium [overflow-wrap:anywhere]",
            isStaple(item.original_name) && "border-dashed bg-transparent text-muted-foreground");
          return (
            <li key={`${item.name}-${index}`} className="min-w-0 max-w-full">
              {item.summary ?
                <SideDetails item={item} language={language} className={className} narrow={narrow} /> :
                <span className={className}>{item.name}</span>}
            </li>
          );
        })}
      </ul>
    </Tooltip.Provider>
  );
}
