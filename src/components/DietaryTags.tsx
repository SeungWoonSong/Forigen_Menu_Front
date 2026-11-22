import { Flame, Leaf } from "lucide-react";
import type { Ingredient, Language, MenuInfo } from "../types/menu";
import { ingredientLabels, menuCopy } from "../lib/menu-copy";

export function DietaryTags({ info, language }: { info?: MenuInfo; language: Language }) {
  if (!info) return null;
  const copy = menuCopy[language];
  const ingredientList = (keys: Ingredient[] = []) =>
    [...new Set(keys)].map(key => ingredientLabels[key]?.[language]).filter(Boolean).join(", ");
  const contains = ingredientList(info.contains);
  const mayContain = ingredientList(info.may_contain);
  const spice = info.spice === undefined ? undefined : copy.spice[info.spice];
  if (!spice && !contains && !mayContain && !info.vegetarian && !info.vegan) return null;
  const tag = "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {spice && <span className={`${tag} border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200`}>
        <Flame size={13} aria-hidden="true" />{spice}
      </span>}
      {info.vegetarian && <span className={`${tag} text-emerald-800 dark:text-emerald-200`}><Leaf size={13} aria-hidden="true" />{copy.vegetarian}</span>}
      {info.vegan && <span className={`${tag} text-emerald-800 dark:text-emerald-200`}><Leaf size={13} aria-hidden="true" />{copy.vegan}</span>}
      {contains && <span className={`${tag} bg-muted`}>{copy.contains(contains)}</span>}
      {mayContain && <span className={`${tag} border-dashed text-muted-foreground`}>{copy.mayContain(mayContain)}</span>}
      <span className="text-xs text-muted-foreground">{copy.estimated}</span>
    </div>
  );
}
