import type { Metadata } from 'next'
import { Inter, Noto_Sans_KR } from 'next/font/google'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "@/components/theme-provider"
import './globals.css'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://menu.sungwoonsong.com'),
  title: 'Gasan Menu by Sungwoon ',
  description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. ',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Gasan Menu by Sungwoon ',
    description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. ',
    url: 'https://menu.sungwoonsong.com',
    siteName: 'Gasan Menu by Sungwoon ',
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
    title: 'Gasan Menu by Sungwoon ',
    description: 'No need to overThink it—Gasan\'s everyday meals are now available in four languages! Always easy to check, always ready for you. ',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansKR.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
