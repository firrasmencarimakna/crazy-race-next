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
  const [matrixChars, setMatrixChars] = useState<string[]>([]);

  // Matrix rain effect
  useEffect(() => {
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const newMatrixChars = Array.from({ length: 20 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    );
    setMatrixChars(newMatrixChars);

    const matrixInterval = setInterval(() => {
      setMatrixChars(prev => 
        prev.map(() => chars[Math.floor(Math.random() * chars.length)])
      );
    }, 100);

    return () => clearInterval(matrixInterval);
  }, []);

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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen relative pixel-font overflow-hidden"
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a2a] via-[#1a1a4a] to-[#2a2a6a]">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                animation: 'gridMove 20s linear infinite'
              }}
            />
          </div>

          {/* Background Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBgIndex}
              className="absolute inset-0 w-full h-full bg-cover bg-center mix-blend-overlay opacity-60"
              style={{ backgroundImage: `url(${backgroundGifs[currentBgIndex]})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </AnimatePresence>

          {/* Matrix Rain Effect */}
          <div className="absolute inset-0 overflow-hidden">
            {matrixChars.map((char, index) => (
              <motion.span
                key={index}
                className="absolute text-[#00ff00] text-xs opacity-30 pixel-font"
                style={{
                  left: `${(index * 5) % 100}%`,
                  top: `${-20 + (index * 2) % 120}%`,
                }}
                animate={{
                  y: ["0vh", "100vh"],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* CRT and Noise Effects */}
          <div className="crt-effect absolute inset-0 z-10"></div>
          <div className="noise-effect absolute inset-0 z-20"></div>
          <div className="vignette-effect absolute inset-0 z-15"></div>

          {/* Main Loading Container */}
          <motion.div 
            className="cyber-terminal p-8 text-center relative z-30 w-full max-w-2xl mx-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "backOut" }}
          >
            {/* Terminal Top Bar */}
            <div className="cyber-terminal-bar mb-6">
              <div className="flex justify-between items-center px-4 py-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-[#ff0066] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#ffcc00] rounded-full"></div>
                  <div className="w-3 h-3 bg-[#00cc66] rounded-full"></div>
                </div>
                <span className="text-[#00ffff] text-sm pixel-text">SYSTEM_BOOT.exe</span>
                <div className="w-10"></div>
              </div>
            </div>

            {/* Title with Glitch Effect */}
            <div className="relative mb-8">
              <motion.h1
                className="cyber-title text-4xl md:text-6xl text-[#00ffff] mb-4 pixel-text"
                animate={{ 
                  textShadow: [
                    "0 0 10px #00ffff, 0 0 20px #00ffff",
                    "2px 2px 0 #ff00ff, -2px -2px 0 #00ff00",
                    "0 0 10px #00ffff, 0 0 20px #00ffff"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                LOADING
              </motion.h1>
              
              {/* Glitch Layers */}
              <div className="cyber-glitch absolute top-0 left-0 w-full h-full"></div>
            </div>

            {/* Progress Section */}
            <div className="cyber-panel p-6 mb-6">
              {/* Progress Percentage */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-6"
              >
                <p className="text-2xl text-[#ff6bff] pixel-text glow-pink mb-2">
                  {Math.round(progress)}%
                </p>
                <p className="text-sm text-[#00ffff] pixel-text opacity-80">
                  SYSTEM_INITIALIZATION
                </p>
              </motion.div>

              {/* Cyber Progress Bar */}
              <div className="relative mb-8">
                <div className="cyber-progress-track">
                  <motion.div
                    className="cyber-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#00ffff] pixel-text mt-2">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Binary Code Animation */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(16)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="text-[#00ff00] text-xs pixel-font"
                    animate={{ 
                      opacity: [0.3, 1, 0.3],
                      content: ['"0"', '"1"', '"0"']
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  >
                    {Math.random() > 0.5 ? "1" : "0"}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Rotating Tip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
                className="cyber-console text-sm text-[#00ff00] pixel-text italic border-l-4 border-[#00ff00] pl-4 py-2 bg-[#00ff00]/10"
              >
                <span className="text-[#00ffff]">{">"}</span> {tips[currentTipIndex]}
              </motion.div>
            </AnimatePresence>

            {/* Scanning Line */}
            <motion.div
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent"
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <style jsx>{`
        .cyber-terminal {
          background: linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 50%, #2a2a6a 100%);
          border: 3px solid #00ffff;
          position: relative;
          box-shadow: 
            0 0 30px rgba(0, 255, 255, 0.5),
            inset 0 0 30px rgba(0, 255, 255, 0.1);
        }

        .cyber-terminal::before {
          content: '';
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border: 2px solid #ff00ff;
          z-index: -1;
          background: linear-gradient(135deg, transparent 0%, rgba(255, 0, 255, 0.1) 100%);
        }

        .cyber-terminal-bar {
          background: linear-gradient(90deg, #ff0066, #ffcc00, #00cc66);
          border: 2px solid #00ffff;
          position: relative;
        }

        .cyber-terminal-bar::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00ffff, transparent);
        }

        .cyber-title {
          position: relative;
          text-shadow: 3px 3px 0 #ff00ff, -3px -3px 0 #00ff00;
          animation: textGlow 2s ease-in-out infinite alternate;
        }

        .cyber-glitch {
          background: linear-gradient(45deg, transparent 45%, rgba(255, 0, 255, 0.2) 50%, transparent 55%);
          opacity: 0;
          animation: glitch 3s infinite;
          pointer-events: none;
        }

        .cyber-panel {
          background: rgba(10, 10, 42, 0.8);
          border: 2px solid #00ffff;
          position: relative;
          box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.2);
        }

        .cyber-progress-track {
          width: 100%;
          height: 20px;
          background: rgba(0, 255, 255, 0.1);
          border: 2px solid #00ffff;
          position: relative;
          overflow: hidden;
        }

        .cyber-progress-track::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(0, 255, 255, 0.3) 50%, 
            transparent 100%);
          animation: shine 2s infinite;
        }

        .cyber-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ffff, #ff00ff, #00ffff);
          background-size: 200% 100%;
          animation: gradientShift 2s infinite linear;
          position: relative;
        }

        .cyber-console {
          font-family: 'Courier New', monospace;
          text-shadow: 0 0 10px #00ff00;
          position: relative;
          overflow: hidden;
        }

        .cyber-console::after {
          content: '|';
          animation: blink 1s infinite;
          margin-left: 2px;
        }

        .crt-effect {
          background: 
            linear-gradient(rgba(18, 16, 16, 0.1) 50%, rgba(0, 0, 0, 0.25) 50%),
            linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 4px, 3px 100%;
          pointer-events: none;
          animation: scanline 6s linear infinite;
        }

        .noise-effect {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .vignette-effect {
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
          pointer-events: none;
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

        @keyframes textGlow {
          0% { text-shadow: 3px 3px 0 #ff00ff, -3px -3px 0 #00ff00; }
          100% { text-shadow: 4px 4px 0 #ff00ff, -4px -4px 0 #00ff00, 0 0 20px #00ffff; }
        }

        @keyframes glitch {
          0%, 100% { opacity: 0; transform: translateX(0); }
          5% { opacity: 0.3; transform: translateX(-5px); }
          10% { opacity: 0; transform: translateX(5px); }
          15% { opacity: 0.3; transform: translateX(-3px); }
          20% { opacity: 0; transform: translateX(3px); }
          50% { opacity: 0; }
        }

        @keyframes gradientShift {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .glow-pink {
          animation: glow-pink 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 10px #ff6bff);
        }

        @keyframes glow-pink {
          0%, 100% { text-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { text-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </>
  )
}