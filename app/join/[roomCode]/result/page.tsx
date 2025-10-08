// Updated results page: join/[roomCode]/results/page.tsx
// Key changes for compactness:
// - Reduced font sizes, paddings, and margins throughout to fit within viewport
// - Main card: Smaller icons, tighter spacing
// - Stats grid: Smaller cards with compact content
// - Breakdown: Inline layout for scores
// - Actions: Horizontal on all sizes, smaller buttons
// - Overall: Removed excessive mb-8, used mb-4; max-w-4xl retained but content squeezed
// - Retained theme, animations, and functionality

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Target, Clock, Star, Home, RotateCcw, Crown, Award } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import { breakOnCaps } from "@/utils/game"
import Image from "next/image"

// Background GIFs
const backgroundGifs = [
  "/assets/background/host/4.webp",
  // Add more GIFs if available
]

// Car GIF mappings
const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.webp",
  blue: "/assets/car/car2.webp",
  green: "/assets/car/car3.webp",
  yellow: "/assets/car/car4.webp",
  purple: "/assets/car/car5.webp",
  orange: "/assets/car/car5.webp",
}

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: string
  totalTime: string
  rank: number
  totalPlayers: number
  playerId: string
}

export default function PlayerResultsPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [playerId, setPlayerId] = useState<string>("")
  useEffect(() => {
    const pid = localStorage.getItem("playerId") || ""
    if (!pid) router.replace(`/join/${roomCode}`)
    else setPlayerId(pid)
  }, [roomCode, router])

  const [loading, setLoading] = useState(true)
  const [currentPlayerStats, setCurrentPlayerStats] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch room data
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('id')
          .eq('room_code', roomCode)
          .single()

        if (roomError || !roomData) {
          throw new Error('Failed to load room data')
        }

        // Fetch all players with completion = true
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, nickname, result, car')
          .eq('room_id', roomData.id)
          .eq('completion', true)

        if (playersError || !playersData || playersData.length === 0) {
          throw new Error('No completed players found')
        }

        // Find current player
        const currentPlayer = playersData.find((p: any) => p.id === playerId)
        if (!currentPlayer) {
          throw new Error('Player session not found')
        }

        // Parse result (assuming array with single object)
        const result = currentPlayer.result && currentPlayer.result[0] ? currentPlayer.result[0] : null
        if (!result) {
          throw new Error('No results recorded for player')
        }

        // Calculate rank
        const sortedPlayers = playersData
          .filter((p: any) => p.result && p.result[0])
          .map((p: any) => ({
            playerId: p.id,
            score: p.result[0].score || 0,
          }))
          .sort((a, b) => b.score - a.score)
        const rank = sortedPlayers.findIndex((p) => p.playerId === playerId) + 1

        // Format duration
        const totalSeconds = result.duration || 0
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        const totalTime = `${mins}:${secs.toString().padStart(2, '0')}`

        // Set current player stats
        setCurrentPlayerStats({
          nickname: currentPlayer.nickname,
          car: currentPlayer.car || 'blue',
          finalScore: result.score || 0,
          correctAnswers: result.correct || 0,
          totalQuestions: result.total_question || 0,
          accuracy: result.accuracy || '0.00',
          totalTime,
          rank,
          totalPlayers: sortedPlayers.length,
          playerId,
        })
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (roomCode && playerId) {
      fetchData()
    }
  }, [roomCode, playerId])

  // Background cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500 glow-yellow"
      case 2:
        return "text-gray-400 glow-silver"
      case 3:
        return "text-amber-600 glow-bronze"
      default:
        return "text-[#00ffff] glow-cyan"
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500 glow-yellow animate-neon-bounce" />
      case 2:
        return <Award className="h-8 w-8 text-gray-400 glow-silver animate-neon-bounce" />
      case 3:
        return <Award className="h-8 w-8 text-amber-600 glow-bronze animate-neon-bounce" />
      default:
        return <Star className="h-8 w-8 text-[#00ffff] glow-cyan animate-neon-bounce" />
    }
  }

  if (loading) {
    return (
      <LoadingRetro />
    )
  }

  if (error || !currentPlayerStats) {
    return (
      <LoadingRetro />
    )
  }

  const { finalScore, correctAnswers, totalQuestions, accuracy, totalTime, rank, nickname, car } = currentPlayerStats

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">

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

      <h1 className="absolute top-5 right-10 hidden md:block">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={0}
        />
      </h1>

      <h1 className="absolute top-7 left-10 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-4 sm:pb-5"
        >
          <div className="inline-block p-4 sm:p-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">
              Crazy Race
            </h1>
          </div>
        </motion.div>

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-7 md:p-10 mb-4 text-center animate-neon-pulse-pink">
            <div className="mb-4">
              <div className={`text-3xl md:text-4xl font-bold mb-1 ${getRankColor(rank)} pixel-text`}>
                #{rank}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-x-2">
              <img
                src={carGifMap[car] || '/assets/car/car5.webp'}
                alt={`${car} car`}
                className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
              />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white pixel-text glow-text">{breakOnCaps(nickname)}</h2>
          </Card>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="p-5 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-xs text-[#ff6bff] pixel-text">Correct</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
              {finalScore}
            </div>
            <div className="text-xs text-[#ff6bff] pixel-text">Score</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">{totalTime}</div>
            <div className="text-xs text-[#ff6bff] pixel-text">Time</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">{accuracy}%</div>
            <div className="text-xs text-[#ff6bff] pixel-text">Accuracy</div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-row gap-2 justify-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button
            size="sm"
            variant="outline"
            className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] pixel-button glow-cyan hover:bg-[#00ffff]/20"
            onClick={() => router.push('/')}
          >
            <Home className="mr-1 h-4 w-4" />
            Home
          </Button>
        </motion.div>
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
        .pixel-card {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .pixel-button {
          image-rendering: pixelated;
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }
        .pixel-button:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
        }
        .crt-effect {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
          background-size: 100% 4px;
          z-index: 5;
          pointer-events: none;
          animation: scanline 8s linear infinite;
        }
        .noise-effect {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%20200%20200%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27noiseFilter%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.65%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%23noiseFilter)%27%20opacity%3D%270.1%27%2F%3E%3C%2Fsvg%3E");
          z-index: 4;
          pointer-events: none;
        }
        .glow-cyan {
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-pink {
          filter: drop-shadow(0 0 10px #ff6bff);
        }
        .glow-yellow {
          filter: drop-shadow(0 0 10px #ffd700);
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
        @keyframes neon-glow {
          0%, 100% { 
            filter: drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 15px #00ffff) drop-shadow(0 0 20px #00ffff);
            text-shadow: 2px 2px 0px #000, 0 0 10px #00ffff;
          }
          50% { 
            filter: drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 20px #00ffff) drop-shadow(0 0 30px #00ffff) drop-shadow(0 0 40px #00ffff);
            text-shadow: 2px 2px 0px #000, 0 0 20px #00ffff, 0 0 30px #00ffff;
          }
        }
        .animate-neon-pulse-pink {
          animation: neon-pulse-pink 2s ease-in-out infinite;
        }
        .animate-neon-glow {
          animation: neon-glow 2s ease-in-out infinite;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}