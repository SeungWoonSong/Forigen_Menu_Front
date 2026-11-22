import { parseISO } from "date-fns";
import type { DayMenu, Ingredient, Language, MenuInfo, MenuItem, SideItem, SpiceLevel } from "../types/menu";
import { hasMenu } from "../lib/menu";
import { ingredientLabels } from "../lib/menu-copy";
import { readPreference, writePreference } from "../lib/browser-storage";

interface CachedMenu {
  data: DayMenu;
  timestamp: number;
  isEmpty: boolean;
}

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const EMPTY_CACHE_DURATION = 5 * 60 * 1000;
const memoryCache = new Map<string, CachedMenu>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

const ingredients = new Set<string>(Object.keys(ingredientLabels));

function normalizeIngredients(value: unknown): Ingredient[] | undefined {
  if (!Array.isArray(value)) return;
  return value.filter((key): key is Ingredient => typeof key === "string" && ingredients.has(key));
}

function normalizeDietaryInfo(value: Record<string, unknown>) {
  const { spice, contains, may_contain, vegan } = value;
  const spiceLevel: SpiceLevel | undefined = spice === 0 || spice === 1 || spice === 2 || spice === 3 ? spice : undefined;
  return {
    spice: spiceLevel,
    contains: normalizeIngredients(contains),
    may_contain: normalizeIngredients(may_contain),
    vegan: typeof vegan === "boolean" ? vegan : undefined,
  };
}

function normalizeMenuInfo(value: unknown): MenuInfo | undefined {
  if (!isRecord(value)) return;
  return {
    ...normalizeDietaryInfo(value),
    summary: optionalText(value.summary),
    detail: optionalText(value.detail),
    similar_to: optionalText(value.similar_to),
    how_to_eat: optionalText(value.how_to_eat),
    vegetarian: typeof value.vegetarian === "boolean" ? value.vegetarian : undefined,
  };
}

function normalizeSideItems(value: unknown): SideItem[] | undefined {
  if (!Array.isArray(value)) return;
  return value.flatMap(item => {
    if (!isRecord(item) || typeof item.name !== "string") return [];
    return [{
      name: item.name,
      original_name: optionalText(item.original_name),
      summary: optionalText(item.summary),
      ...normalizeDietaryInfo(item),
    }];
  });
}

function normalizeMenuItem(value: unknown, index = 0): MenuItem | undefined {
  if (!isRecord(value) || typeof value.name !== "string" || !Array.isArray(value.sub_menus)) return;
  return {
    id: typeof value.id === "number" && Number.isFinite(value.id) ? value.id : -(index + 1),
    name: value.name,
    meal_type: optionalText(value.meal_type) ?? "",
    corner_name: optionalText(value.corner_name) ?? "",
    description: optionalText(value.description) ?? "",
    sub_menus: value.sub_menus.filter((name): name is string => typeof name === "string"),
    original_name: optionalText(value.original_name),
    info: normalizeMenuInfo(value.info),
    sub_items: normalizeSideItems(value.sub_items),
  };
}

export function normalizeDayMenu(value: unknown, date: string, language: Language): DayMenu | undefined {
  if (!isRecord(value) || !Array.isArray(value.lunch) || !Array.isArray(value.dinner)) return;
  const lunch = value.lunch.map(normalizeMenuItem);
  const dinner = value.dinner.map(normalizeMenuItem);
  if (!lunch.every(item => item !== undefined) || !dinner.every(item => item !== undefined)) return;

  const updatedAt = optionalText(value.updated_at);
  return {
    // The requested tab and language remain authoritative for the view and cache.
    date,
    language,
    lunch,
    dinner,
    salad: normalizeMenuItem(value.salad) ?? null,
    dessert: normalizeMenuItem(value.dessert) ?? null,
    updated_at: updatedAt && updatedAt.includes("T") && Number.isFinite(parseISO(updatedAt).getTime()) ? updatedAt : undefined,
  };
}

function getCachedMenu(key: string, date: string, language: Language): DayMenu | undefined {
  let cached = memoryCache.get(key);
  if (!cached) {
    const stored = readPreference(key);
    if (!stored) return;
    try {
      const entry: unknown = JSON.parse(stored);
      if (!isRecord(entry) || typeof entry.timestamp !== "number" || !Number.isFinite(entry.timestamp)) return;
      const data = normalizeDayMenu(entry.data, date, language);
      if (data) cached = { data, timestamp: entry.timestamp, isEmpty: !hasMenu(data) };
    } catch {
      return;
    }
  }
  if (!cached) return;
  const duration = cached.isEmpty ? EMPTY_CACHE_DURATION : CACHE_DURATION;
  if (Date.now() - cached.timestamp <= duration) {
    memoryCache.set(key, cached);
    return cached.data;
  }
  memoryCache.delete(key);
}

export async function getDayMenu(date: string, language: Language): Promise<DayMenu> {
  const key = `menu-v2-day-${date}-${language}`;
  const cached = getCachedMenu(key, date, language);
  if (cached) return cached;

  // Cache confirmed menus and confirmed empty dates only.
  const response = await fetch(`/api/menu/${date}?lang=${language}`);
  if (!response.ok) throw new Error(`Menu request failed with HTTP ${response.status}`);
  const data = normalizeDayMenu(await response.json(), date, language);
  if (!data) throw new Error("Invalid menu response");

  const entry: CachedMenu = { data, timestamp: Date.now(), isEmpty: !hasMenu(data) };
  memoryCache.set(key, entry);
  writePreference(key, JSON.stringify(entry));
  return data;
}
