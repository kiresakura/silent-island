import type { Metadata, Viewport } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-tc',
})

export const metadata: Metadata = {
  title: '靜默之島 — Silent Island',
  description: '白色恐怖歷史模擬桌遊 — 一場關於選擇與代價的沉默之旅',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hant">
      <body className={`${notoSansTC.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
