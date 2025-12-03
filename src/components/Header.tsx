"use client"

import { Language, LANGUAGES } from "@/services/menuService"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Globe } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

interface HeaderProps {
  language: Language
  onLanguageChange: (lang: Language) => void
  onTodayClick?: () => void
}

const languageFlags: Record<Language, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
  zh: "🇨🇳",
  sv: "🇸🇪",
}

export function Header({ language, onLanguageChange, onTodayClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-2xl mx-auto flex h-14 items-center justify-between px-4">
        <motion.button
          onClick={onTodayClick}
          className="flex items-center gap-2.5 group cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="relative"
            whileHover={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/mascot.png"
              alt="Menu Penguin"
              width={38}
              height={38}
              className="drop-shadow-md"
            />
          </motion.div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-lg tracking-tight hidden sm:block bg-gradient-to-r from-[#4A4A4A] to-[#8B7355] bg-clip-text text-transparent group-hover:from-[#8B7355] group-hover:to-[#4A4A4A] transition-all duration-300">
              Gasan Menu
            </span>
            <span className="font-bold text-lg tracking-tight sm:hidden bg-gradient-to-r from-[#4A4A4A] to-[#8B7355] bg-clip-text text-transparent">
              Menu
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:block -mt-0.5">
              by Sungwoon
            </span>
          </div>
        </motion.button>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline-block">
                  {LANGUAGES[language]}
                </span>
                <span className="sm:hidden">{languageFlags[language]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.entries(LANGUAGES) as [Language, string][]).map(
                ([code, name]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => onLanguageChange(code)}
                    className={language === code ? "bg-accent" : ""}
                  >
                    <span className="mr-2">{languageFlags[code]}</span>
                    {name}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

