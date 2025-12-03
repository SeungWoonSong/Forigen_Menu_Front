"use client"

import { useState, useEffect, useRef } from "react"
import { getCenteredMenu, Language } from "@/services/menuService"
import { DayMenu } from "@/types/menu"
import { Header } from "@/components/Header"
import { EmptyMenuCard } from "@/components/MenuCard"
import { DateTabs, DateTabsSkeleton, DateTabsRef } from "@/components/DateTabs"
import { LanguageSelectModal } from "@/components/LanguageSelectModal"
import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTodayKST } from "@/lib/utils"

const LANGUAGE_STORAGE_KEY = "gasan-menu-language"

export default function Home() {
  const [days, setDays] = useState<DayMenu[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language | null>(null)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const dateTabsRef = useRef<DateTabsRef>(null)

  // Use KST timezone to ensure correct date in Korea
  const today = getTodayKST()
  
  // Go to today's menu
  const handleTodayClick = () => {
    dateTabsRef.current?.goToToday()
  }

  // Check for saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
    
    if (savedLanguage && ["ko", "en", "zh", "sv"].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    } else {
      // First visit - show language selection modal
      setShowLanguageModal(true)
    }
    setIsInitialized(true)
  }, [])

  // Handle language selection from modal
  const handleLanguageSelect = (lang: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    setLanguage(lang)
    setShowLanguageModal(false)
  }

  // Handle language change from header dropdown
  const handleLanguageChange = (lang: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    setLanguage(lang)
  }

  // Fetch menu when language is set
  useEffect(() => {
    if (!language) return

    const fetchMenu = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch centered menu (2 days before, today, 2 days after)
        const menu = await getCenteredMenu(new Date(), 2, 2, language)
        setDays(menu.days)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch menu")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenu()
  }, [language])

  // Show nothing until we check for saved language
  if (!isInitialized) {
    return null
  }

  // Show language selection modal for first-time visitors
  if (showLanguageModal) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <LanguageSelectModal open={true} onSelect={handleLanguageSelect} />
      </div>
    )
  }

  // Safety check - should not happen but TypeScript needs it
  if (!language) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header language={language} onLanguageChange={handleLanguageChange} onTodayClick={handleTodayClick} />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-8 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {language === "ko"
                  ? "오류가 발생했습니다"
                  : language === "zh"
                  ? "发生错误"
                  : language === "sv"
                  ? "Ett fel uppstod"
                  : "An error occurred"}
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                {language === "ko"
                  ? "다시 시도"
                  : language === "zh"
                  ? "重试"
                  : language === "sv"
                  ? "Försök igen"
                  : "Try again"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Header language={language} onLanguageChange={handleLanguageChange} onTodayClick={handleTodayClick} />

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <DateTabsSkeleton />
        ) : days.length > 0 ? (
          <DateTabs
            ref={dateTabsRef}
            initialDays={days}
            language={language}
            today={today}
          />
        ) : (
          <EmptyMenuCard language={language} />
        )}
      </main>

      <footer className="py-6 border-t">
        <div className="flex flex-col items-center gap-1.5">
          <a
            href="https://www.linkedin.com/in/sungwoonsong"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Made by Sungwoon Song
          </a>
          <p className="text-xs text-muted-foreground/60">
            Though I&apos;ve moved on from Ericsson, I hope this site helps my former colleagues enjoy their meals.
          </p>
        </div>
      </footer>
    </div>
  )
}
