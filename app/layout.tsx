import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/authContext'
import AuthGate from '@/components/authGate'
import './globals.css'

export const metadata: Metadata = {
  title: 'Crazy Race',
  description: 'Answer • Race • Win',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <link rel="prefetch" as="image" href="/gameforsmartlogo.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/background/1.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/background/host/10.webp" type="image/webp" fetchPriority="high" />
        <link rel="prefetch" as="image" href="/racing-game/images/sprites.png" type="image/png" fetchPriority="high" />
      </head>
      <body>
        <AuthProvider>
          <AuthGate>
          {children}
          </AuthGate>
        </AuthProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}