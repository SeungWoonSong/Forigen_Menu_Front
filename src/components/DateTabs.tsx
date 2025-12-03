"use client"

import { DayMenu } from "@/types/menu"
import { Language, getAdditionalDays } from "@/services/menuService"
import { format, parse } from "date-fns"
import { ko, enUS, zhCN, sv } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MenuCard, MenuCardSkeleton, EmptyMenuCard } from "./MenuCard"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DateTabsProps {
  initialDays: DayMenu[]
  language: Language
  today: string
}

export interface DateTabsRef {
  goToToday: () => void
}

const locales = {
  ko,
  en: enUS,
  zh: zhCN,
  sv,
}

export const DateTabs = forwardRef<DateTabsRef, DateTabsProps>(function DateTabs(
  { initialDays, language, today },
  ref
) {
  const [days, setDays] = useState<DayMenu[]>(initialDays)
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [isLoadingLeft, setIsLoadingLeft] = useState(false)
  const [isLoadingRight, setIsLoadingRight] = useState(false)
  const tabsListRef = useRef<HTMLDivElement>(null)

  // Find the index of today in the current days array
  const todayIndex = days.findIndex(d => d.date === today)
  
  // Track if initial scroll has happened
  const hasInitialScrolled = useRef(false)

  // Expose goToToday method via ref
  useImperativeHandle(ref, () => ({
    goToToday: () => {
      setSelectedDate(today)
      // Scroll to today tab
      if (tabsListRef.current && todayIndex >= 0) {
        const container = tabsListRef.current
        const tabs = container.querySelectorAll('[role="tab"]')
        const todayTab = tabs[todayIndex] as HTMLElement
        
        if (todayTab) {
          const containerWidth = container.offsetWidth
          const tabOffset = todayTab.offsetLeft
          const tabWidth = todayTab.offsetWidth
          const scrollPosition = tabOffset - (containerWidth / 2) + (tabWidth / 2)
          
          container.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
          })
        }
      }
    }
  }), [today, todayIndex])

  // Update days when initialDays change (language change)
  useEffect(() => {
    setDays(initialDays)
    // Reset selected date to today if available
    const todayExists = initialDays.some(d => d.date === today)
    if (todayExists) {
      setSelectedDate(today)
    } else if (initialDays.length > 0) {
      // Find the middle day
      const middleIndex = Math.floor(initialDays.length / 2)
      setSelectedDate(initialDays[middleIndex].date)
    }
    // Reset scroll flag when language changes
    hasInitialScrolled.current = false
  }, [initialDays, today])

  const formatTabDate = (dateStr: string) => {
    const date = parse(dateStr, "yyyyMMdd", new Date())
    const locale = locales[language]

    switch (language) {
      case "ko":
        return format(date, "M/d (EEE)", { locale })
      case "zh":
        return format(date, "M/d EEE", { locale })
      case "sv":
        return format(date, "d/M EEE", { locale })
      default:
        return format(date, "M/d EEE", { locale })
    }
  }

  const getTodayLabel = () => {
    switch (language) {
      case "ko": return "오늘"
      case "zh": return "今天"
      case "sv": return "Idag"
      default: return "Today"
    }
  }

  // Load more days to the left (past)
  const loadMoreLeft = useCallback(async () => {
    if (isLoadingLeft || days.length === 0) return
    
    setIsLoadingLeft(true)
    try {
      const firstDate = parse(days[0].date, "yyyyMMdd", new Date())
      const newDays = await getAdditionalDays(firstDate, "before", 2, language)
      setDays(prev => [...newDays, ...prev])
    } catch (error) {
      console.error("Failed to load more days:", error)
    } finally {
      setIsLoadingLeft(false)
    }
  }, [days, language, isLoadingLeft])

  // Load more days to the right (future)
  const loadMoreRight = useCallback(async () => {
    if (isLoadingRight || days.length === 0) return
    
    setIsLoadingRight(true)
    try {
      const lastDate = parse(days[days.length - 1].date, "yyyyMMdd", new Date())
      const newDays = await getAdditionalDays(lastDate, "after", 2, language)
      setDays(prev => [...prev, ...newDays])
    } catch (error) {
      console.error("Failed to load more days:", error)
    } finally {
      setIsLoadingRight(false)
    }
  }, [days, language, isLoadingRight])

  // Scroll to center on today only on initial mount or language change
  useEffect(() => {
    if (tabsListRef.current && todayIndex >= 0 && !hasInitialScrolled.current) {
      const container = tabsListRef.current
      const tabs = container.querySelectorAll('[role="tab"]')
      const todayTab = tabs[todayIndex] as HTMLElement
      
      if (todayTab) {
        const containerWidth = container.offsetWidth
        const tabOffset = todayTab.offsetLeft
        const tabWidth = todayTab.offsetWidth
        const scrollPosition = tabOffset - (containerWidth / 2) + (tabWidth / 2)
        
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        })
        
        hasInitialScrolled.current = true
      }
    }
  }, [todayIndex, days])

  const selectedMenu = days.find(d => d.date === selectedDate)

  return (
    <Tabs value={selectedDate} onValueChange={setSelectedDate} className="w-full">
      <div className="relative flex items-center gap-2 mb-4">
        {/* Left navigation button */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={loadMoreLeft}
          disabled={isLoadingLeft}
        >
          {isLoadingLeft ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Tabs list */}
        <TabsList ref={tabsListRef} className="flex-1 justify-center">
          {days.map((day) => (
            <TabsTrigger
              key={day.date}
              value={day.date}
              className={cn(
                "min-w-[80px] sm:min-w-[100px] group",
                day.date === today &&
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              )}
            >
              <span className="flex flex-col items-center gap-1">
                <span className="text-xs sm:text-sm">{formatTabDate(day.date)}</span>
                {day.date === today && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary group-data-[state=active]:bg-primary-foreground transition-colors" />
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Right navigation button */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={loadMoreRight}
          disabled={isLoadingRight}
        >
          {isLoadingRight ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {days.map((day) => (
          <TabsContent key={day.date} value={day.date} className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {day.lunch.length > 0 ||
              day.dinner.length > 0 ||
              day.salad ||
              day.dessert ? (
                <MenuCard menu={day} />
              ) : (
                <EmptyMenuCard language={language} />
              )}
            </motion.div>
          </TabsContent>
        ))}
      </AnimatePresence>
    </Tabs>
  )
})

export function DateTabsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mascot Loading Animation */}
      <div className="flex flex-col items-center justify-center py-6">
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/Loading.png"
            alt="Loading..."
            width={140}
            height={140}
            className="drop-shadow-lg"
            priority
          />
        </motion.div>
      </div>
      
      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 h-12 bg-muted animate-pulse rounded-xl" />
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
      </div>
      <MenuCardSkeleton />
    </div>
  )
}

