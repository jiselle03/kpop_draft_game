import '@/styles/globals.css'

import { type Metadata } from 'next'
import { Geist } from 'next/font/google'

import { GameSessionProvider } from '@/app/_components/providers/game-session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TRPCReactProvider } from '@/trpc/react'

export const metadata: Metadata = {
  title: 'K-Pop Draft Game',
  description: 'Create or join a K-pop draft and build your idol roster.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <TRPCReactProvider>
          <ThemeProvider>
            <GameSessionProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
            </GameSessionProvider>
          </ThemeProvider>
        </TRPCReactProvider>
        <Toaster duration={4000} richColors />
      </body>
    </html>
  )
}
