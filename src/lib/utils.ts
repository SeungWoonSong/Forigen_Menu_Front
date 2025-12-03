import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Korea Standard Time (UTC+9)
const KST_TIMEZONE = "Asia/Seoul"

/**
 * Get current date in KST timezone
 */
export function getKSTDate(): Date {
  return toZonedTime(new Date(), KST_TIMEZONE)
}

/**
 * Format a date to YYYYMMDD string in KST timezone
 */
export function formatDateKST(date: Date, formatStr: string = "yyyyMMdd"): string {
  const kstDate = toZonedTime(date, KST_TIMEZONE)
  return format(kstDate, formatStr)
}

/**
 * Get today's date string in YYYYMMDD format (KST)
 */
export function getTodayKST(): string {
  return formatDateKST(new Date())
}

