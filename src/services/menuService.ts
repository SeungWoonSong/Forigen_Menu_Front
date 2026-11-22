import type { DayMenu, Language, MenuItem } from "../types/menu";
import { hasMenu } from "../lib/menu";
import { readPreference, writePreference } from "../lib/browser-storage";

interface CachedMenu {
  data: DayMenu;
  timestamp: number;
  isEmpty: boolean;
}

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const EMPTY_CACHE_DURATION = 5 * 60 * 1000;
const memoryCache = new Map<string, CachedMenu>();

function isMenuItem(value: unknown): value is MenuItem {
  if (typeof value !== "object" || !value) return false;
  const item = value as Partial<MenuItem>;
  return typeof item.name === "string" && typeof item.corner_name === "string" &&
    typeof item.description === "string" && Array.isArray(item.sub_menus) &&
    item.sub_menus.every(name => typeof name === "string");
}

function isDayMenu(value: unknown, date: string, language: Language): value is DayMenu {
  if (typeof value !== "object" || !value) return false;
  const menu = value as Partial<DayMenu>;
  return menu.date === date && menu.language === language &&
    Array.isArray(menu.lunch) && menu.lunch.every(isMenuItem) &&
    Array.isArray(menu.dinner) && menu.dinner.every(isMenuItem) &&
    (menu.salad === null || isMenuItem(menu.salad)) &&
    (menu.dessert === null || isMenuItem(menu.dessert));
}

function getCachedMenu(key: string, date: string, language: Language): DayMenu | undefined {
  let cached = memoryCache.get(key);
  if (!cached) {
    const stored = readPreference(key);
    if (!stored) return;
    try {
      cached = JSON.parse(stored) ?? undefined;
    } catch {
      return;
    }
  }
  if (!cached || !isDayMenu(cached.data, date, language)) return;
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
  const data: unknown = await response.json();
  if (!isDayMenu(data, date, language)) throw new Error("Invalid menu response");

  const entry: CachedMenu = { data, timestamp: Date.now(), isEmpty: !hasMenu(data) };
  memoryCache.set(key, entry);
  writePreference(key, JSON.stringify(entry));
  return data;
}
