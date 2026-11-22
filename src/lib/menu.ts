import { addDays, format, isWeekend, parse } from "date-fns";
import { enUS, ko, sv, zhCN } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import type { DayMenu, Language, MenuItem, SideItem } from "../types/menu";

export const PENGUIN = {
  mascot: "/mascot.png",
  welcome: "/SayHi.png",
  loading: "/Loading.png",
  closed: "/SayHi.png",
  unpublished: "/mascot.png",
  empty: "/NoMenu.png",
  error: "/penguin/error.png",
  spicy: "/penguin/spicy.png",
  howtoeat: "/penguin/howtoeat.png",
} as const;

export const LANGUAGES = {
  ko: { name: "한국어", short: "KO" },
  en: { name: "English", short: "EN" },
  zh: { name: "中文", short: "中" },
  sv: { name: "Svenska", short: "SV" },
} as const;

export function selectLanguage(saved: string | null, browserLanguages: readonly string[]): Language {
  const supported = (value: string | null): value is Language =>
    value !== null && Object.prototype.hasOwnProperty.call(LANGUAGES, value);
  if (supported(saved)) return saved;
  return browserLanguages
    .map(locale => locale.toLowerCase().split("-")[0])
    .find(supported) ?? "en";
}

const locales = { ko, en: enUS, zh: zhCN, sv };
const longDate = { ko: "M월 d일 (EEEE)", en: "EEEE, MMMM d", zh: "M月d日 EEEE", sv: "EEEE d MMMM" };
const shortDate = { ko: "M/d (EEE)", en: "M/d EEE", zh: "M/d EEE", sv: "d/M EEE" };
const KST = "Asia/Seoul";

export function dateInKorea(now: Date) {
  return formatInTimeZone(now, KST, "yyyyMMdd");
}

export function timeInKorea(now: Date) {
  return formatInTimeZone(now, KST, "HH:mm");
}

const parseDay = (date: string) => parse(date, "yyyyMMdd", new Date(2000, 0, 1));

export function dateLabel(date: string, language: Language, short = false) {
  return format(parseDay(date), (short ? shortDate : longDate)[language], { locale: locales[language] });
}

export function shiftDay(date: string, offset: number) {
  return format(addDays(parseDay(date), offset), "yyyyMMdd");
}

export function isClosedDay(date: string) {
  return isWeekend(parseDay(date));
}

export function nextBusinessDay(date: string) {
  let next = shiftDay(date, 1);
  while (isClosedDay(next)) next = shiftDay(next, 1);
  return next;
}

export function initialMenuDates(today: string) {
  const center = isClosedDay(today) ? nextBusinessDay(today) : today;
  let start = center;
  let end = center;
  for (let i = 0; i < 2; i++) {
    do { start = shiftDay(start, -1); } while (isClosedDay(start));
    end = nextBusinessDay(end);
  }
  const dates: string[] = [];
  for (let date = start; date <= end; date = shiftDay(date, 1)) dates.push(date);
  return dates;
}

export type MenuRequest = { status: "ready"; menu: DayMenu } | { status: "error" };
export type MenuRequests = Partial<Record<string, MenuRequest>>;

export function hasMenu(menu: DayMenu) {
  return Boolean(menu.lunch.length || menu.dinner.length || menu.salad || menu.dessert);
}

export function menuState(date: string, today: string, result?: MenuRequest) {
  if (isClosedDay(date)) return "closed";
  if (!result) return "loading";
  if (result.status === "error") return "error";
  if (hasMenu(result.menu)) return "menu";
  return date > today ? "unpublished" : "empty";
}

export function pickDefaultDate(dates: string[], today: string, results: MenuRequests) {
  const state = menuState(today, today, results[today]);
  if (state === "menu" || state === "error" || state === "loading") return today;
  const upcoming = dates.find(date => date > today && menuState(date, today, results[date]) === "menu");
  if (upcoming) return upcoming;
  if (state === "closed") return nextBusinessDay(today);
  return [...dates].reverse().find(date => date < today && menuState(date, today, results[date]) === "menu") ?? today;
}

export function cornerLabel(corner: string, language: Language) {
  const match = /^코너\s*(\d+)$/.exec(corner.trim());
  if (!match) return corner;
  const number = match[1];
  return { ko: `코너${number}`, en: `Corner ${number}`, zh: `${number}号窗口`, sv: `Disk ${number}` }[language];
}

const staples = new Set(["밥", "쌀밥", "백미밥", "현미밥", "잡곡밥", "흑미밥", "김치", "배추김치", "깍두기", "석박지", "섞박지"]);

export function isStaple(originalName?: string) {
  return originalName ? staples.has(originalName.trim()) : false;
}

export function sideItems(item: MenuItem): SideItem[] {
  return item.sub_items?.length ? item.sub_items : item.sub_menus.map(name => ({ name }));
}

export function extraMenuChips(item: MenuItem, kind: "selfService" | "salad") {
  const name = item.name.trim();
  const entries = kind === "selfService" ? [name, ...item.sub_menus] : item.sub_menus;
  return [...new Set(entries.map(entry => entry.trim()))]
    .filter(entry => entry && (kind !== "salad" || entry !== name));
}
