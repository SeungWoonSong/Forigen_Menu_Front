import { WeekMenu, DayMenu } from '@/types/menu';
import { format, addDays, isSunday, isWeekend } from 'date-fns';

// Dynamically determine API URL based on the current hostname
const API_URL = 'https://menu.api.sungwoonsong.com';

export type Language = 'ko' | 'en' | 'zh' | 'sv';

export const LANGUAGES = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  sv: 'Svenska'
};

interface CachedData {
  data: WeekMenu;
  timestamp: number;
}

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function getFromCache(key: string): WeekMenu | null {
  if (typeof window === 'undefined') return null;
  
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const { data, timestamp }: CachedData = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setToCache(key: string, data: WeekMenu) {
  if (typeof window === 'undefined') return;
  
  const cacheData: CachedData = {
    data,
    timestamp: Date.now()
  };

  localStorage.setItem(key, JSON.stringify(cacheData));
}

export async function getWeeklyMenu(date: Date = new Date(), language: Language = 'en'): Promise<WeekMenu> {
  const cacheKey = `menu-${format(date, 'yyyyMMdd')}-${language}`;
  const cachedData = getFromCache(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  // If it's Sunday, start from the next day (Monday)
  const startDate = isSunday(date) ? addDays(date, 1) : date;
  const days: DayMenu[] = [];
  let currentDate = startDate;
  
  // Continue fetching until we have 5 weekday menus
  while (days.length < 5) {
    // Skip weekends
    if (!isWeekend(currentDate)) {
      const formattedDate = format(currentDate, 'yyyyMMdd');
      
      try {
        const response = await fetch(`${API_URL}/api/menu/${formattedDate}?lang=${language}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch menu for ${formattedDate}`);
        }
        
        const dayMenu = await response.json();
        days.push(dayMenu);
      } catch (error) {
        console.error(`Error fetching menu for ${formattedDate}:`, error);
        // Add empty menu for this day
        days.push({
          date: formattedDate,
          language,
          lunch: [],
          dinner: [],
          dessert: null,
          salad: null,
        });
      }
    }
    currentDate = addDays(currentDate, 1);
  }
  
  const weeklyMenu = { days };
  setToCache(cacheKey, weeklyMenu);
  
  return weeklyMenu;
}
