"use client"
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function LoadingRetroScreen({ progress = 0 }: { progress?: number }) {
  const backgroundGifs = [

    "/assets/background/host/10.webp",

  ];

  const tips = [
    "Initializing neural net...",
    "Syncing with the cyber grid...",
    "Hacking the mainframe...",
    "Loading nitro boosters...",
    "Preparing race tracks...",
    "Calibrating speedometers...",
    "Uploading trivia database...",
    "Overclocking processors...",
    "Decrypting victory codes...",
    "Booting retro engines..."
  ];

  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length);
    }, 5000);

    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => {
      clearInterval(bgInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        html {
          overflow: hidden !important;
        }
      `}</style>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen relative pixel-font overflow-hidden"
        >
          {/* Background */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBgIndex}
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${backgroundGifs[currentBgIndex]})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </AnimatePresence>

          {/* CRT and Noise Effects */}
          <div className="crt-effect absolute inset-0 z-10"></div>
          <div className="noise-effect absolute inset-0 z-20"></div>

          {/* Main Loading Container */}
          <div className="pixel-border-large p-8 text-center relative z-30 w-full max-w-md mx-auto">
            {/* Title */}
            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-2xl md:text-4xl text-[#00ffff] pixel-text glow-cyan mb-6"
            >
              Loading
            </motion.p>

            {/* Progress Percentage */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-6"
            >
              <p className="text-lg text-[#ff6bff] pixel-text glow-pink mb-2">
                {Math.round(progress)}%
              </p>
            </motion.div>

            {/* Progress Bar */}
            <div className="relative mb-8">
              <div className="w-full h-4 bg-[#1a0a2a]/80 border-2 border-[#00ffff]/50 rounded pixel-border-small"></div>
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00ffff] to-[#ff6bff] rounded glow-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Animated Pixel Bars (decorative) */}
            <div className="flex gap-1 justify-center mb-8">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scaleY: [1, 1.5, 1],
                    backgroundColor: ["#00ffff", "#ff6bff", "#00ffff"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5,
                    delay: i * 0.1,
                  }}
                  className="w-2 h-6 bg-[#00ffff] rounded"
                />
              ))}
            </div>

            {/* Rotating Tip */}
            <AnimatePresence mode="wait">
              <motion.p
                key={currentTipIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-[#ff6bff] pixel-text glow-pink-subtle italic"
              >
                {tips[currentTipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      <style jsx>{`
        .pixel-border-large {
          border: 4px solid #00ffff;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
          box-shadow: 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .pixel-border-large::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 2px solid #ff6bff;
          z-index: -1;
        }
        .crt-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
          background-size: 100% 4px;
          z-index: 10;
          pointer-events: none;
          animation: scanline 8s linear infinite;
        }
        .noise-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%20200%20200%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27noiseFilter%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.65%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%23noiseFilter)%27%20opacity%3D%270.1%27%2F%3E%3C%2Fsvg%3E");
          z-index: 20;
          pointer-events: none;
        }
        .glow-cyan {
          animation: glow-cyan 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-pink {
          animation: glow-pink 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 10px #ff6bff);
        }
        .glow-pink-subtle {
          animation: glow-pink 2s ease-in-out infinite;
          filter: drop-shadow(0 0 5px #ff6bff);
        }
        .pixel-font {
          font-family: 'Press Start 2P', cursive, monospace;
          image-rendering: pixelated;
        }
        .pixel-text {
          image-rendering: pixelated;
          text-shadow: 2px 2px 0px #000;
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes glow-cyan {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes glow-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </>
  )
}