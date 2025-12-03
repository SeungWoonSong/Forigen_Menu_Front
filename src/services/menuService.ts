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
const EMPTY_CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour for empty menus (shorter to check for updates)

// In-memory cache for current session (avoids repeated localStorage parsing)
const memoryCache = new Map<string, { data: DayMenu; timestamp: number; isEmpty: boolean }>();

function getDayCacheKey(date: string, language: Language): string {
  return `menu-day-${date}-${language}`;
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
    if (key?.startsWith('menu-day-')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove oldest half of menu cache entries
  keysToRemove
    .sort()
    .slice(0, Math.ceil(keysToRemove.length / 2))
    .forEach(key => localStorage.removeItem(key));
}

// Fetch a single day menu
export async function getDayMenu(date: Date, language: Language): Promise<DayMenu> {
  const formattedDate = formatKST(date, 'yyyyMMdd');
  
  // Check cache first (memory + localStorage)
  const cached = getFromDayCache(formattedDate, language);
  if (cached) {
    return cached;
  }

  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/menu/${formattedDate}?lang=${language}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch menu for ${formattedDate}`);
    }
    
    const dayMenu = await response.json();
    // Cache the menu (including empty ones)
    setToDayCache(formattedDate, language, dayMenu);
    return dayMenu;
  } catch (error) {
    console.error(`Error fetching menu for ${formattedDate}:`, error);
    // Return empty menu for this day and cache it (shorter duration)
    const emptyMenu: DayMenu = {
      date: formattedDate,
      language,
      lunch: [],
      dinner: [],
      dessert: null,
      salad: null,
    };
    // Cache empty menu too (will have shorter cache duration)
    setToDayCache(formattedDate, language, emptyMenu);
    return emptyMenu;
  }
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
  // Adjust center date to nearest weekday if it's a weekend
  const adjustedCenter = getNearestWeekday(centerDate, 'backward');
  
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
