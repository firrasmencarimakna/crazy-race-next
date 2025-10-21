"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Activity, Trophy, Clock as ClockIcon, Zap, Star } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"

// Background GIFs
const backgroundGifs = [
  "/assets/gif/host/1.gif",
  "/assets/gif/host/2.gif",
  "/assets/gif/host/3.gif",
  "/assets/gif/host/4.gif",
  "/assets/gif/host/5.gif",
  "/assets/gif/host/7.gif",
]

// Mapping warna mobil ke file GIF mobil
const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

type FinalScore = {
  score: number
  correct: number
  accuracy: string
  duration: number
  totalQuestions: number
}

export default function ResultsPage() {
  const router = useRouter()

  const [finalScore, setFinalScore] = useState<FinalScore | null>(null)
  const [nickname, setNickname] = useState("")
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data dari localStorage
  useEffect(() => {
    const loadResults = () => {
      setLoading(true)
      try {
        const savedScoreStr = localStorage.getItem('tryout_final_score')
        if (!savedScoreStr) {
          throw new Error("No results found. Complete a tryout first.")
        }
        const savedScore: FinalScore = JSON.parse(savedScoreStr)
        setFinalScore(savedScore)

        const savedNickname = localStorage.getItem('tryout_nickname') || ''
        setNickname(savedNickname)

        // Optional: Clear progress setelah load (untuk reset game baru)
        localStorage.removeItem('tryout_progress')
        localStorage.removeItem('tryout_settings')

        console.log('Results loaded:', savedScore)
      } catch (err: any) {
        console.error("Error loading results:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [])

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  if (loading) {
    return <LoadingRetro />
  }

  if (error || !finalScore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0a2a]">
        <Card className="p-8 text-center text-red-500 max-w-md w-full">
          <h2 className="text-2xl mb-4">Error: {error || "No results available"}</h2>
          <Button onClick={() => router.push('/tryout')} className="bg-[#00ffff] border-white pixel-button">
            Back to Tryout
          </Button>
        </Card>
      </div>
    )
  }

  const { score, correct, accuracy, duration, totalQuestions } = finalScore
  const percentage = parseFloat(accuracy)
  const timeMinutes = Math.floor(duration / 60)
  const timeSeconds = duration % 60

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      {/* Preload semua GIF */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
      ))}
      {Object.values(carGifMap).map((gif, idx) => (
        <link key={`car-${idx}`} rel="preload" href={gif} as="image" />
      ))}

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

      {/* Overlay Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-4xl mx-auto pt-8 px-4">
        {/* Judul Utama */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            RESULT
          </h1>
          <div className="text-xl text-white pixel-text">
            {/* {nickname || "Player"} */}
          </div>
        </div>

        {/* Results Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card py-8">
            <CardHeader className="text-center">
              <div className="relative flex items-center justify-center mb-6">

              </div>
      
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div
                  className="text-center p-4 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 rounded-xl glow-cyan-subtle"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-4xl font-bold text-[#00ffff] mb-2 glow-cyan">{correct}/{totalQuestions}</div>
                  <div className="text-sm text-white pixel-text glow-cyan">Correct Answers</div>
                  {/* <Star className="w-8 h-8 text-[#ffd700] mx-auto mt-2" /> */}
                </motion.div>

                <motion.div
                  className="text-center p-4 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 rounded-xl glow-pink-subtle"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-4xl font-bold text-[#ff6bff] mb-2 glow-cyan">{accuracy}%</div>
                  <div className="text-sm text-white pixel-text glow-cyan">Accuracy</div>
                  {/* <Zap className="w-8 h-8 text-[#ff6bff] mx-auto mt-2 animate-pulse" /> */}
                </motion.div>

                <motion.div
                  className="text-center p-4 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 rounded-xl glow-green"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-4xl font-bold text-[#00ffff] mb-2 glow-cyan">{timeMinutes}:{timeSeconds.toString().padStart(2, '0')}</div>
                  <div className="text-sm text-white pixel-text glow-cyan">Time Used</div>
                  {/* <ClockIcon className="w-8 h-8 text-[#00ff00] mx-auto mt-2" /> */}
                </motion.div>
              </div>

              {/* Progress Bar for Accuracy */}
              <div className="mt-8">
                {/* <div className="flex justify-between text-sm text-white mb-2">
                  <span>Accuracy Progress</span>
                  <span>{accuracy}%</span>
                </div> */}
                <div className="w-full bg-[#1a0a2a]/60 rounded-full h-4 border-2 border-[#ff6bff]/50">
                  <motion.div
                    className="bg-gradient-to-r from-[#00ffff] to-[#ff6bff] h-4 rounded-full glow-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </CardContent>

            <CardHeader className="text-center pt-4">
              <div className="text-lg text-gray-300 pixel-text">
                Great job! Ready for the next challenge?
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-x-4 flex flex-col sm:flex-row justify-center gap-4">
          {/* <Button 
            onClick={() => {
              localStorage.clear() // Clear all tryout data for new game
              router.push('/tryout')
            }}
            className="bg-[#00ffff] border-4 border-white pixel-button-large hover:bg-[#33ffff] glow-cyan px-8 py-3 flex-1 max-w-xs"
          >
            <span className="pixel-text text-lg">NEW TRYOUT</span>
          </Button> */}
          <Link href="/">
            <Button className="bg-[#ff6bff] border-4 border-white pixel-button-large hover:bg-[#ff8aff] glow-pink px-8 py-3 flex-1 max-w-xs">
              <span className="pixel-text text-lg">HOME</span>
            </Button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .pixel-font {
          font-family: 'Press Start 2P', cursive, monospace;
          image-rendering: pixelated;
        }
        .pixel-text {
          image-rendering: pixelated;
          text-shadow: 2px 2px 0px #000;
        }
        .pixel-button-large {
          image-rendering: pixelated;
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }
        .pixel-button-large:hover {
          transform: translate(3px, 3px);
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
        }
        .pixel-card {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .glow-cyan {
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-cyan-subtle {
          filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5));
        }
        .glow-pink-subtle {
          filter: drop-shadow(0 0 5px rgba(255, 107, 255, 0.5));
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-gold {
          filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}