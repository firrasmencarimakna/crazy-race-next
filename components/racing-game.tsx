'use client'; // Karena game memerlukan client-side rendering

import { useEffect, useRef } from 'react';

export default function RacingGame({ onGameEnd }: { onGameEnd?: (score: number) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Opsional: Kirim event ke parent (quiz) saat game selesai, via postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'gameEnd') {
        onGameEnd?.(event.data.score); // Integrasi dengan game-state.ts atau websocket
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onGameEnd]);

  return (
    <div className="w-full h-[600px] md:h-[800px]"> {/* Sesuaikan ukuran */}
      <iframe
        ref={iframeRef}
        src="/racing-game/index.html"
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin" // Aman untuk game JS
        onLoad={() => console.log('Game loaded')} // Opsional: track loading
      />
    </div>
  );
}