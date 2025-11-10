"use client";

import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/contexts/authContext';
import { useEffect, useState } from "react";
import AuthGate from '@/components/authGate';
import ClientProviders from './ClientProvider';
import './globals.css';
import { getI18nInstance } from "@/lib/i18n";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const i18n = getI18nInstance();
  const [isClient, setIsClient] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    setIsClient(true);
    const savedLang = localStorage.getItem("language");
    if (savedLang && i18n.language !== savedLang && typeof i18n.changeLanguage === "function") {
      i18n.changeLanguage(savedLang);
    }
    setCurrentLang(i18n.language);
  }, [i18n]);

  useEffect(() => {
    if (isClient && i18n.language) {
      document.documentElement.lang = i18n.language;
      setCurrentLang(i18n.language);
    }
  }, [i18n.language, isClient]);

  if (!isClient) {
    return <div className="bg-black min-h-screen" />;
  }

  return (
    <AuthProvider>
      <ClientProviders>
        <AuthGate>{children}</AuthGate>
      </ClientProviders>
    </AuthProvider>
  );
}
