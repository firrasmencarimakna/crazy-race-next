import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import { Press_Start_2P } from 'next/font/google'
import './globals.css';

export const metadata: Metadata = {
  title: "Crazy Race",
  description: "Answer • Race • Win",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-512x512.png",
  },
};

const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400'
})


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/gameforsmartlogo.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/background/1.webp" type="image/webp" fetchPriority="high" />
      </head>
      <body className={pressStart.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
