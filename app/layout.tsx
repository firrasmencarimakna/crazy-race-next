"use client";

import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/authContext'
import './globals.css'
import AuthGate from '@/components/authGate'
import ClientProviders from './ClientProvider';// ✅ Ganti path sesuai, pakai 's' seperti proyek lama
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

// ... metadata jika perlu

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { i18n } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [currentLang, setCurrentLang] = useState("en"); // ✅ State untuk stabil hydration

  useEffect(() => {
    setIsClient(true);
    const savedLang = localStorage.getItem("language");
    if (savedLang && i18n.language !== savedLang) { // ✅ Pastikan tanpa () – ini string comparison
      i18n.changeLanguage(savedLang);
    }
    setCurrentLang(i18n.language); // ✅ Sync ke state
  }, [i18n]);

  useEffect(() => {
    if (isClient && i18n.language) {
      document.documentElement.lang = i18n.language;
      setCurrentLang(i18n.language);
    }
  }, [i18n.language, isClient]);

  // Gabung preload dari kedua kode (opsional, untuk performa)
  const preloadImages = [
    "/gameforsmartlogo.webp",
    "/assets/background/1.webp",
    // ... tambah dari proyek lama jika perlu
  ];

  return (
    <html lang={currentLang}> {/* ✅ Pakai state, bukan direct i18n.language */}
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        {preloadImages.map((src) => (
          <link key={src} rel="preload" as="image" href={src} type="image/webp" fetchPriority="high" />
        ))}
      </head>
      <body className={`${GeistSans.className} ${GeistMono.className} antialiased`}>
        <AuthProvider>
          <ClientProviders> {/* ✅ Tambahin ini! Wrap seperti proyek lama */}
            <AuthGate>
              {children}
            </AuthGate>
            {/* Tambah Toaster dari proyek lama jika perlu */}
          </ClientProviders>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}