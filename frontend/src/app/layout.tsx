import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Open Running App',
  description: 'Join local running sessions and run together',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col selection:bg-brand-500/30">
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  )
}

