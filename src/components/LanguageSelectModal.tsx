"use client"

import { Language, LANGUAGES } from "@/services/menuService"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { motion } from "framer-motion"
import Image from "next/image"

interface LanguageSelectModalProps {
  open: boolean
  onSelect: (lang: Language) => void
}

const languageFlags: Record<Language, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
  zh: "🇨🇳",
  sv: "🇸🇪",
}

const languageDescriptions: Record<Language, string> = {
  ko: "한국어로 메뉴를 확인합니다",
  en: "View menu in English",
  zh: "用中文查看菜单",
  sv: "Visa menyn på svenska",
}

export function LanguageSelectModal({ open, onSelect }: LanguageSelectModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showClose={false} className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <motion.div 
            className="mx-auto mb-2"
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Image
              src="/SayHi.png"
              alt="Penguin saying hi"
              width={150}
              height={150}
              className="drop-shadow-lg"
              priority
            />
          </motion.div>
          <DialogTitle className="text-2xl">Welcome to Gasan Menu</DialogTitle>
          <DialogDescription className="text-base">
            Please select your preferred language
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-6">
          {(Object.entries(LANGUAGES) as [Language, string][]).map(
            ([code, name], index) => (
              <motion.button
                key={code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelect(code)}
                className="group relative flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:bg-accent hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="text-4xl">{languageFlags[code]}</span>
                <span className="font-semibold text-lg">{name}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {languageDescriptions[code]}
                </span>
              </motion.button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

