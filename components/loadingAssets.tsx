"use client"
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePreloader } from "./preloader";

export default function LoadingAssets() {
  const { isLoaded, progress } = usePreloader();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => prev + 5);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1a0a2a] via-[#2d1b69] to-[#0f0f23]/90 backdrop-blur-md overflow-hidden"
        >
          {/* Animated Background Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-[#00ffff] rounded-full opacity-40"
                animate={{
                  x: [0, Math.sin(i) * 100, 0],
                  y: [0, Math.cos(i) * 100, 0],
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="pixel-border-xl p-10 text-center relative z-10">
            {/* Rotating Pixel Spinner */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 0.1, ease: "linear" }}
              className="mx-auto mb-6 w-20 h-20 border-4 border-[#00ffff] border-t-transparent rounded-full relative"
            >
              <div className="absolute inset-0 border-4 border-[#ff6bff] border-t-transparent rounded-full animate-ping"></div>
            </motion.div>

            <motion.h1
              animate={{ 
                scale: [1, 1.1, 1],
                y: [0, -10, 0],
                opacity: [1, 0.7, 1],
                color: ["#00ffff", "#ff6bff", "#00ffff"]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.2,
                ease: "easeInOut"
              }}
              className="text-3xl md:text-5xl font-bold pixel-text glow-dual mb-4"
            >
              LOADING...
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-sm md:text-base text-[#ff6bff]/80 pixel-text mb-6"
            >
              {progress}% Assets Loaded
            </motion.p>

            {/* Real Progress Bar with Pixel Style */}
            <div className="relative w-64 h-4 bg-[#1a0a2a]/50 rounded-full border-2 border-[#00ffff]/50 mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00ffff] to-[#ff6bff] rounded-full shadow-glow relative"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Progress Glow Trail */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0" 
                     style={{ backgroundSize: '200% 100%', transform: `translateX(calc(-100% + ${progress}%))` }}
                ></div>
              </motion.div>
              {/* Pixel Dots on Progress */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-0 h-full w-1 bg-[#ff6bff] opacity-70"
                  style={{ left: `${(i + 1) * 20}%` }}
                  animate={{ scaleY: progress >= (i + 1) * 20 ? 1 : 0.3 }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>

            {/* Fallback Animated Bar (hidden when progress > 0) */}
            {progress === 0 && (
              <div className="flex gap-1 justify-center">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [1, 2, 1, 1.5, 1],
                      backgroundColor: ["#00ffff", "#ff6bff", "#00ffff", "#ff6bff"],
                      y: [0, -5, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.08,
                      ease: "easeInOut",
                    }}
                    className="w-2 h-12 bg-[#00ffff] rounded-sm shadow-glow"
                  />
                ))}
              </div>
            )}

            {/* Floating Dots */}
            <div className="absolute -inset-4 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-[#ff6bff] rounded-full"
                  animate={{
                    x: [0, Math.sin(i * Math.PI / 4) * 50, 0],
                    y: [0, Math.cos(i * Math.PI / 4) * 50, 0],
                    scale: [1, 0.5, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles = `
  .pixel-border-xl {
    border: 6px solid #00ffff;
    background: linear-gradient(135deg, rgba(26, 10, 42, 0.8), rgba(45, 27, 105, 0.8));
    box-shadow: 
      0 0 30px rgba(0, 255, 255, 0.5),
      inset 0 0 20px rgba(255, 107, 255, 0.2);
    position: relative;
    border-radius: 12px;
  }
  .pixel-border-xl::before {
    content: '';
    position: absolute;
    top: -12px;
    left: -12px;
    right: -12px;
    bottom: -12px;
    border: 3px solid #ff6bff;
    border-radius: 16px;
    z-index: -1;
    animation: pulse 2s infinite;
  }
  .pixel-border-xl::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid rgba(0, 255, 255, 0.3);
    border-radius: 12px;
    z-index: -1;
    animation: rotate 4s linear infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .pixel-text {
    font-family: 'Press Start 2P', monospace;
    text-shadow: 
      0 0 10px #00ffff, 
      0 0 20px #00ffff, 
      0 0 30px #ff6bff;
  }
  .glow-dual {
    filter: drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #ff6bff);
  }
  .shadow-glow {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  }
  .animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
`;

export function GlobalStyles() {
  return <style jsx global>{styles}</style>;
}