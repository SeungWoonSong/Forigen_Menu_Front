import { WeekMenu, DayMenu } from '@/types/menu';
import { format, addDays, subDays, isWeekend } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Korea Standard Time (UTC+9)
const KST_TIMEZONE = "Asia/Seoul";

// Format date in KST timezone
function formatKST(date: Date, formatStr: string): string {
  const kstDate = toZonedTime(date, KST_TIMEZONE);
  return format(kstDate, formatStr);
}

// Use relative URL to go through Next.js API route (avoids CORS issues)
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return ''; // Client-side: use relative URL
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

export type Language = 'ko' | 'en' | 'zh' | 'sv';

export const LANGUAGES = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  sv: 'Svenska'
};

interface CachedData {
  data: DayMenu;
  timestamp: number;
  isEmpty: boolean; // Track if this was an empty menu
}

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const EMPTY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for empty menus: upcoming days fill in once the backend crawls them

// Bump the version to drop everything browsers cached under older keys.
const CACHE_PREFIX = 'menu-v2-day-';
const LEGACY_CACHE_PREFIX = 'menu-day-';

// In-memory cache for current session (avoids repeated localStorage parsing)
const memoryCache = new Map<string, { data: DayMenu; timestamp: number; isEmpty: boolean }>();

function getDayCacheKey(date: string, language: Language): string {
  return `${CACHE_PREFIX}${date}-${language}`;
}

// Older builds cached an empty menu whenever a request failed, so entries under
// the legacy prefix can hide real menus. Remove them once per page load.
let legacyCacheCleared = false;
function clearLegacyMenuCache() {
  if (legacyCacheCleared || typeof window === 'undefined') return;
  legacyCacheCleared = true;
  const legacyKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LEGACY_CACHE_PREFIX)) legacyKeys.push(key);
  }
  legacyKeys.forEach(key => localStorage.removeItem(key));
}

function isMenuEmpty(menu: DayMenu): boolean {
  return menu.lunch.length === 0 && 
         menu.dinner.length === 0 && 
         !menu.salad && 
         !menu.dessert;
}

function getFromDayCache(date: string, language: Language): DayMenu | null {
  const key = getDayCacheKey(date, language);
  const now = Date.now();
  
  // Check memory cache first (fastest)
  const memoryCached = memoryCache.get(key);
  if (memoryCached) {
    const duration = memoryCached.isEmpty ? EMPTY_CACHE_DURATION : CACHE_DURATION;
    if (now - memoryCached.timestamp <= duration) {
      return memoryCached.data;
    }
    memoryCache.delete(key);
  }
  
  // Check localStorage (persistent)
  if (typeof window === 'undefined') return null;
  
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const { data, timestamp, isEmpty }: CachedData = JSON.parse(cached);
    const duration = isEmpty ? EMPTY_CACHE_DURATION : CACHE_DURATION;

    if (now - timestamp > duration) {
      localStorage.removeItem(key);
      return null;
    }

    // Store in memory cache for faster subsequent access
    memoryCache.set(key, { data, timestamp, isEmpty });
    return data;
  } catch {
    return null;
  }
}

function setToDayCache(date: string, language: Language, data: DayMenu) {
  const key = getDayCacheKey(date, language);
  const isEmpty = isMenuEmpty(data);
  const timestamp = Date.now();
  
  // Always update memory cache
  memoryCache.set(key, { data, timestamp, isEmpty });
  
  // Update localStorage (persistent)
  if (typeof window === 'undefined') return;
  
  const cacheData: CachedData = {
    data,
    timestamp,
    isEmpty
  };

  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    // localStorage might be full, clear old entries
    console.warn('localStorage full, clearing old menu cache');
    clearOldMenuCache();
    try {
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch {
      // Still failed, just use memory cache
    }
  }
}

// Clear old menu cache entries when localStorage is full
function clearOldMenuCache() {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove oldest half of menu cache entries
  keysToRemove
    .sort()
    .slice(0, Math.ceil(keysToRemove.length / 2))
    .forEach(key => localStorage.removeItem(key));
}

export function hasMenu(menu: DayMenu): boolean {
  return !isMenuEmpty(menu);
}

// The tab to open by default: today if it has a menu, otherwise the next day
// that has one (weekends, holidays), otherwise the most recent day that had one.
export function pickDefaultDate(days: DayMenu[], today: string): string {
  const todayMenu = days.find(d => d.date === today);
  if (todayMenu && hasMenu(todayMenu)) return today;
  const upcoming = days.find(d => d.date > today && hasMenu(d));
  if (upcoming) return upcoming.date;
  const past = [...days].reverse().find(d => d.date < today && hasMenu(d));
  if (past) return past.date;
  if (todayMenu) return today;
  return days.length > 0 ? days[Math.floor(days.length / 2)].date : today;
}

// Fetch a single day menu
export async function getDayMenu(date: Date, language: Language): Promise<DayMenu> {
  const formattedDate = formatKST(date, 'yyyyMMdd');

  clearLegacyMenuCache();

  // Check cache first (memory + localStorage)
  const cached = getFromDayCache(formattedDate, language);
  if (cached) {
    return cached;
  }

  // A failed request must surface as an error. Returning (and caching) an empty
  // menu here made outages look like "no menu today" long after they ended.
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/menu/${formattedDate}?lang=${language}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch menu for ${formattedDate}`);
  }

  const dayMenu: DayMenu = await response.json();
  setToDayCache(formattedDate, language, dayMenu);
  return dayMenu;
}

// Get the nearest weekday (skip weekends)
function getNearestWeekday(date: Date, direction: 'forward' | 'backward'): Date {
  let result = date;
  while (isWeekend(result)) {
    result = direction === 'forward' ? addDays(result, 1) : subDays(result, 1);
  }
  return result;
}

// Get N weekdays before a date
function getWeekdaysBefore(date: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = subDays(date, 1);
  
  while (dates.length < count) {
    if (!isWeekend(current)) {
      dates.unshift(current);
    }
    current = subDays(current, 1);
  }
  
  return dates;
}

// Get N weekdays after a date
function getWeekdaysAfter(date: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = addDays(date, 1);
  
  while (dates.length < count) {
    if (!isWeekend(current)) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }
  
  return dates;
}

// Fetch menu centered around a specific date with ±N days
export async function getCenteredMenu(
  centerDate: Date = new Date(),
  daysBefore: number = 2,
  daysAfter: number = 2,
  language: Language = 'en'
): Promise<WeekMenu> {
  // On a weekend, centre on the coming Monday: that is the next menu people want.
  const adjustedCenter = getNearestWeekday(centerDate, 'forward');
  
  // Get dates before and after
  const datesBefore = getWeekdaysBefore(adjustedCenter, daysBefore);
  const datesAfter = getWeekdaysAfter(adjustedCenter, daysAfter);
  
  // Combine all dates
  const allDates = [...datesBefore, adjustedCenter, ...datesAfter];
  
  // Fetch all menus in parallel
  const dayMenus = await Promise.all(
    allDates.map(date => getDayMenu(date, language))
  );
  
  return { days: dayMenus };
}

// Fetch additional days (for lazy loading when scrolling)
export async function getAdditionalDays(
  referenceDate: Date,
  direction: 'before' | 'after',
  count: number,
  language: Language
): Promise<DayMenu[]> {
  const dates = direction === 'before' 
    ? getWeekdaysBefore(referenceDate, count)
    : getWeekdaysAfter(referenceDate, count);
  
  const dayMenus = await Promise.all(
    dates.map(date => getDayMenu(date, language))
  );
  
  return dayMenus;
}

// Legacy function for backward compatibility
export async function getWeeklyMenu(date: Date = new Date(), language: Language = 'en'): Promise<WeekMenu> {
  return getCenteredMenu(date, 2, 2, language);
}
