"use client";

import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ((window as any).pwaPromptHandled) return;
    (window as any).pwaPromptHandled = true;

    // HAPUS: if (alreadyDismissed) return;  // Biar selalu add listener, capture event

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWAInstallPrompt = e;

      // TAMBAH: Cek dismissed HANYA buat show prompt, bukan buat capture
      const alreadyDismissed = localStorage.getItem("pwaDismissed");
      if (!alreadyDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log("User response:", outcome);

    // TAMBAH: Set dismissed kalau accepted (konsisten sama button)
    if (outcome === "accepted") {
      localStorage.setItem("pwaDismissed", "true");
    }
    // Opsional: Kalau mau set dismissed juga di "dismissed" (biar gak spam small prompt lagi), tambah sini
    // else if (outcome === "dismissed") {
    //   localStorage.setItem("pwaDismissed", "true");
    // }

    setShowPrompt(false);
    setDeferredPrompt(null);
    (window as any).deferredPWAInstallPrompt = null;  // Clear selalu, karena invalid
  };

  const handleDismiss = () => {
    localStorage.setItem("pwaDismissed", "true");
    setShowPrompt(false);
    // HAPUS clear deferred di sini? Gak usah, biar button tetep bisa (udah di-handle di useEffect)
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-3 right-3 bg-[#1a0a2a] text-white border border-[#00ffff] rounded-lg p-3 z-50 shadow-md text-sm sm:text-base">
      <p className="mb-1 font-semibold leading-tight">Install Crazy Race?</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleInstall}
          className="px-2.5 py-1 bg-[#00ffff] text-[#1a0a2a] rounded font-bold hover:bg-[#00ffff]/80 cursor-pointer text-xs sm:text-sm"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-2.5 py-1 border border-[#00ffff] rounded hover:bg-[#00ffff]/20 cursor-pointer text-xs sm:text-sm"
        >
          Later
        </button>
      </div>
    </div>
  );
}