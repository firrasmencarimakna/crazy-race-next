import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'Crazy Race',
  description: 'Answer • Race • Win',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" fetchPriority='high'/>
        <link rel="prefetch" as="image" href="/gameforsmartlogo.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/background/1.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/background/host/10.webp" type="image/webp" fetchPriority="high" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
