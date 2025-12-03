"use client"

import { DayMenu as DayMenuType, MenuItem } from "@/types/menu"
import { format, parse } from "date-fns"
import { ko, enUS, zhCN, sv } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Sun, Moon, Salad, Cookie } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

interface MenuCardProps {
  menu: DayMenuType
}

const locales = {
  ko,
  en: enUS,
  zh: zhCN,
  sv,
}

const dateFormats = {
  ko: "M월 d일 (EEEE)",
  en: "MMMM d, EEEE",
  zh: "M月d日 EEEE",
  sv: "d MMMM, EEEE",
}

interface MealSectionProps {
  title: string
  icon: React.ReactNode
  items: MenuItem[]
  variant: "lunch" | "dinner" | "salad" | "dessert"
  emptyMessage: string
}

function MealSection({
  title,
  icon,
  items,
  variant,
  emptyMessage,
}: MealSectionProps) {
  const bgColors = {
    lunch: "bg-lunch/5 dark:bg-lunch/10",
    dinner: "bg-dinner/5 dark:bg-dinner/10",
    salad: "bg-salad/5 dark:bg-salad/10",
    dessert: "bg-dessert/5 dark:bg-dessert/10",
  }

  const borderColors = {
    lunch: "border-l-lunch",
    dinner: "border-l-dinner",
    salad: "border-l-salad",
    dessert: "border-l-dessert",
  }

  const textColors = {
    lunch: "text-lunch",
    dinner: "text-dinner",
    salad: "text-salad",
    dessert: "text-dessert",
  }

  return (
    <div className={`rounded-xl ${bgColors[variant]} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={textColors[variant]}>{icon}</span>
        <h3 className={`font-semibold ${textColors[variant]}`}>{title}</h3>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border-l-4 ${borderColors[variant]} pl-3 py-1`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground">{item.name}</h4>
                {item.corner_name && (
                  <Badge variant={variant} className="text-xs shrink-0">
                    {item.corner_name}
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 italic">
                  {item.description}
                </p>
              )}
              {item.sub_menus && item.sub_menus.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.sub_menus.map((subItem, subIndex) => (
                    <li
                      key={subIndex}
                      className="text-sm text-muted-foreground flex items-start gap-1.5"
                    >
                      <span className="text-muted-foreground/50">•</span>
                      {subItem}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  )
}

function SingleItemSection({
  title,
  icon,
  item,
  variant,
}: {
  title: string
  icon: React.ReactNode
  item: MenuItem
  variant: "salad" | "dessert"
}) {
  const bgColors = {
    salad: "bg-salad/5 dark:bg-salad/10",
    dessert: "bg-dessert/5 dark:bg-dessert/10",
  }

  const borderColors = {
    salad: "border-l-salad",
    dessert: "border-l-dessert",
  }

  const textColors = {
    salad: "text-salad",
    dessert: "text-dessert",
  }

  return (
    <div className={`rounded-xl ${bgColors[variant]} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={textColors[variant]}>{icon}</span>
        <h3 className={`font-semibold ${textColors[variant]}`}>{title}</h3>
      </div>

      <div className={`border-l-4 ${borderColors[variant]} pl-3 py-1`}>
        <h4 className="font-medium text-foreground">{item.name}</h4>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-1 italic">
            {item.description}
          </p>
        )}
        {item.sub_menus && item.sub_menus.length > 0 && (
          <ul className="mt-2 space-y-1">
            {item.sub_menus.map((subItem, subIndex) => (
              <li
                key={subIndex}
                className="text-sm text-muted-foreground flex items-start gap-1.5"
              >
                <span className="text-muted-foreground/50">•</span>
                {subItem}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function MenuCard({ menu }: MenuCardProps) {
  const date = parse(menu.date, "yyyyMMdd", new Date())
  const locale = locales[menu.language as keyof typeof locales] || enUS
  const dateFormat =
    dateFormats[menu.language as keyof typeof dateFormats] || dateFormats.en
  const formattedDate = format(date, dateFormat, { locale })

  const noMenuText = {
    ko: "메뉴가 없습니다",
    en: "No menu available",
    zh: "没有菜单",
    sv: "Ingen meny tillgänglig",
  }

  const mealLabels = {
    lunch: { ko: "점심", en: "Lunch", zh: "午餐", sv: "Lunch" },
    dinner: { ko: "저녁", en: "Dinner", zh: "晚餐", sv: "Middag" },
    salad: { ko: "샐러드", en: "Salad", zh: "沙拉", sv: "Sallad" },
    dessert: { ko: "디저트", en: "Dessert", zh: "甜点", sv: "Efterrätt" },
  }

  const lang = menu.language as keyof typeof noMenuText

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-center">{formattedDate}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MealSection
          title={mealLabels.lunch[lang] || "Lunch"}
          icon={<Sun className="h-5 w-5" />}
          items={menu.lunch}
          variant="lunch"
          emptyMessage={noMenuText[lang] || noMenuText.en}
        />

        {menu.salad && (
          <SingleItemSection
            title={mealLabels.salad[lang] || "Salad"}
            icon={<Salad className="h-5 w-5" />}
            item={menu.salad}
            variant="salad"
          />
        )}

        {menu.dessert && (
          <SingleItemSection
            title={mealLabels.dessert[lang] || "Dessert"}
            icon={<Cookie className="h-5 w-5" />}
            item={menu.dessert}
            variant="dessert"
          />
        )}

        <MealSection
          title={mealLabels.dinner[lang] || "Dinner"}
          icon={<Moon className="h-5 w-5" />}
          items={menu.dinner}
          variant="dinner"
          emptyMessage={noMenuText[lang] || noMenuText.en}
        />
      </CardContent>
    </Card>
  )
}

export function MenuCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="h-7 w-48 mx-auto bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function EmptyMenuCard({ language }: { language: string }) {
  const messages = {
    ko: "오늘은 메뉴가 없습니다",
    en: "No menu available today",
    zh: "今天没有菜单",
    sv: "Ingen meny tillgänglig idag",
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-10 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <Image
            src="/NoMenu.png"
            alt="No menu penguin"
            width={160}
            height={160}
            className="mb-2"
          />
        </motion.div>
        <p className="text-lg text-muted-foreground">
          {messages[language as keyof typeof messages] || messages.en}
        </p>
      </CardContent>
    </Card>
  )
}

