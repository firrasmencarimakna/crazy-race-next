import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { usePreloader } from '@/components/preloader'
import LoadingRetro from '@/components/loadingRetro'

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
  const isLoaded = usePreloader()

  if (!isLoaded) return <LoadingRetro />

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
