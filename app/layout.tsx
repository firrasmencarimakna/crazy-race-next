// app/layout.tsx
import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';  // Import komponen client baru

export const metadata: Metadata = {
  title: 'Crazy Race',
  description: 'Answer • Race • Win',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">  {/* Default lang ke 'en', akan di-update oleh client */}
      <ClientLayout>{children}</ClientLayout>
    </html>
  );
}