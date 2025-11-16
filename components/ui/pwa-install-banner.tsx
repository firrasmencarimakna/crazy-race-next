"use client";

interface PWAInstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export default function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-[#1a0a2a] text-white border-2 border-[#00ffff] rounded-lg p-4 z-50 shadow-lg animate-fade-in-up">
      <p className="mb-2 font-semibold leading-tight">Install Crazy Race for a better experience!</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onInstall}
          className="px-3 py-1.5 bg-[#00ffff] text-[#1a0a2a] rounded-md font-bold hover:bg-opacity-80 transition-colors text-sm"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 border border-[#00ffff] rounded-md hover:bg-white/10 transition-colors text-sm"
        >
          Later
        </button>
      </div>
    </div>
  );
}
