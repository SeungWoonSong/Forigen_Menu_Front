import Image from "next/image";
import { Moon, Salad, Soup, Sun } from "lucide-react";
import { useId } from "react";
import type { DayMenu, Language, MenuItem } from "../types/menu";
import { cornerLabel, dateLabel, displayOriginalName, extraMenuChips, extraMenuMeal, PENGUIN, sideItems, timeInKorea } from "../lib/menu";
import { menuCopy } from "../lib/menu-copy";
import { DietaryTags } from "./DietaryTags";
import { SideChips } from "./SideChips";

function PenguinTip({ image, label, text }: { image: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Image src={image} alt="" width={40} height={40} className="shrink-0" />
      <p className="menu-speech min-w-0 rounded-xl px-3 py-2 text-sm leading-relaxed">
        <span className="font-semibold">{label}</span>
        {" · "}<span>{text}</span>
      </p>
    </div>
  );
}

function DishCard({ item, language }: { item: MenuItem; language: Language }) {
  const copy = menuCopy[language];
  const { info } = item;
  const detail = info?.detail || item.description;
  const originalName = displayOriginalName(item, language);
  const isHot = info?.spice === 3;

  return (
    <article className="min-w-0 space-y-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      {(item.corner_name || originalName || isHot) && (
        <div className={`flex justify-between gap-3 ${isHot ? "items-center" : "items-baseline"}`}>
          {item.corner_name && <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            {cornerLabel(item.corner_name, language)}
          </span>}
          {originalName && <span lang="ko" className={`ml-auto text-right text-xs text-muted-foreground ${isHot ? "min-w-0 break-words" : ""}`}>{originalName}</span>}
          {isHot && <Image src={PENGUIN.spicy} alt="" aria-hidden="true" width={44} height={44}
            className={`-my-2.5 shrink-0 ${originalName ? "" : "ml-auto"}`} />}
        </div>
      )}
      <div className="space-y-1.5">
        <h4 className="text-xl font-semibold leading-tight sm:text-2xl">{item.name}</h4>
        {info?.summary && <p className="text-sm font-semibold leading-relaxed">{info.summary}</p>}
        {detail && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">{detail}</p>}
      </div>
      <DietaryTags info={info} language={language} />
      {(info?.similar_to || info?.how_to_eat) && (
        <aside className="space-y-2">
          {info.similar_to && <PenguinTip image={PENGUIN.mascot} label={copy.similar} text={info.similar_to} />}
          {info.how_to_eat && <PenguinTip image={PENGUIN.howtoeat} label={copy.howToEat} text={info.how_to_eat} />}
        </aside>
      )}
      <SideChips items={sideItems(item)} language={language} />
    </article>
  );
}

function ExtraMenu({ item, kind, language }: { item: MenuItem; kind: "selfService" | "salad"; language: Language }) {
  const Icon = kind === "selfService" ? Soup : Salad;
  const chips = extraMenuChips(item, kind);
  return (
    <section className="space-y-2 rounded-2xl border bg-card p-4 sm:p-5">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={17} aria-hidden="true" className="text-muted-foreground" />
        {menuCopy[language][kind]}
      </h4>
      {kind === "salad" && <h5 className="text-base font-semibold">{item.name}</h5>}
      {chips.length > 0 && <ul className="flex flex-wrap gap-1.5">
        {chips.map(name => <li key={name} className="rounded-md border bg-muted px-2.5 py-1 text-xs">{name}</li>)}
      </ul>}
    </section>
  );
}

export function MenuCard({ menu, language, dinnerFirst }: { menu: DayMenu; language: Language; dinnerFirst: boolean }) {
  const headingId = useId();
  const copy = menuCopy[language];
  const order = dinnerFirst ? (["dinner", "lunch"] as const) : (["lunch", "dinner"] as const);
  const updatedAt = menu.updated_at ? new Date(menu.updated_at) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl font-semibold sm:text-3xl">{dateLabel(menu.date, language)}</h2>
        {updatedAt && Number.isFinite(updatedAt.getTime()) &&
          <time dateTime={menu.updated_at} className="text-xs text-muted-foreground">{copy.updated(timeInKorea(updatedAt))}</time>}
      </div>
      {order.map(meal => {
        const Icon = meal === "lunch" ? Sun : Moon;
        return (
          <section key={meal} aria-labelledby={`${headingId}-${meal}`} className="space-y-2.5">
            <h3 id={`${headingId}-${meal}`} className="flex items-center gap-2.5 text-lg font-semibold">
              <Icon size={18} aria-hidden="true" className="text-muted-foreground" />
              {copy[meal]}
            </h3>
            {menu[meal].length ? menu[meal].map(item => <DishCard key={item.id} item={item} language={language} />) :
              <p className="px-1 text-sm text-muted-foreground">{copy.noMeal}</p>}
            {menu.salad && extraMenuMeal(menu.salad) === meal && <ExtraMenu item={menu.salad} kind="salad" language={language} />}
            {menu.dessert && extraMenuMeal(menu.dessert) === meal && <ExtraMenu item={menu.dessert} kind="selfService" language={language} />}
          </section>
        );
      })}
    </div>
  );
}
