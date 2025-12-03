import { NextResponse } from 'next/server';

const API_URL = 'https://menu.api.sungwoonsong.com';

// Server-side in-memory cache
interface ServerCacheEntry {
  data: unknown;
  timestamp: number;
  isEmpty: boolean;
}

const serverCache = new Map<string, ServerCacheEntry>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const EMPTY_CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour for empty menus

// Clean up old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of serverCache.entries()) {
    const duration = entry.isEmpty ? EMPTY_CACHE_DURATION : CACHE_DURATION;
    if (now - entry.timestamp > duration) {
      serverCache.delete(key);
    }
  }
}

// Check if menu data is empty
function isMenuEmpty(data: { lunch?: unknown[]; dinner?: unknown[]; salad?: unknown; dessert?: unknown }): boolean {
  return (!data.lunch || data.lunch.length === 0) && 
         (!data.dinner || data.dinner.length === 0) && 
         !data.salad && 
         !data.dessert;
}

export const GET = async (
  request: Request,
  { params }: { params: { date: string } }
) => {
  try {
    const { date } = params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const cacheKey = `${date}-${lang}`;
    const now = Date.now();
    
    // Check server-side cache first
    const cached = serverCache.get(cacheKey);
    if (cached) {
      const duration = cached.isEmpty ? EMPTY_CACHE_DURATION : CACHE_DURATION;
      if (now - cached.timestamp <= duration) {
        // Return cached data with cache headers
        const maxAge = Math.floor((duration - (now - cached.timestamp)) / 1000);
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
            'X-Cache': 'HIT',
          },
        });
      }
      serverCache.delete(cacheKey);
    }
    
    // Fetch from backend with Next.js cache
    const response = await fetch(`${API_URL}/api/menu/${date}?lang=${lang}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Next.js built-in cache - revalidate every hour
      next: { revalidate: 3600 },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch menu');
    }
    
    const data = await response.json();
    const isEmpty = isMenuEmpty(data);
    
    // Store in server cache
    serverCache.set(cacheKey, {
      data,
      timestamp: now,
      isEmpty,
    });
    
    // Cleanup old entries occasionally (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupCache();
    }
    
    // Return with cache headers for CDN/browser caching
    const cacheDuration = isEmpty ? 3600 : 21600; // 1 hour for empty, 6 hours for full
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}, stale-while-revalidate=60`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu', details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store', // Don't cache errors
        },
      }
    );
  }
}
