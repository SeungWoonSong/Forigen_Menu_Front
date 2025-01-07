import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '🍽️ Sungwoon\'s Super Friendly Menu 🌏',
  description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. 😄',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: '🍽️ Sungwoon\'s Super Friendly Menu 🌏',
    description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. 😄',
    url: 'https://menu.sungwoonsong.com',
    siteName: 'Sungwoon\'s Super Friendly Menu',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Weekly Menu Preview',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '🍽️ Sungwoon\'s Super Friendly Menu 🌏',
    description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. 😄',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
