'use client';

import { useEffect, useRef } from 'react';

export default function RacingGame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      console.log('Game iframe loaded');
    }
  }, []);

  return (
    <div className="w-full h-screen flex justify-center items-center">
      <iframe
        ref={iframeRef}
        src="/racing-game/v1.straight.html"
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups"
        title="Racing Game"
      />
    </div>
  );
}