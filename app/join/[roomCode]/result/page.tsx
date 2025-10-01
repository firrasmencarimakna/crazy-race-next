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

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Target, Clock, Star, Home, RotateCcw, Crown, Award } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion, AnimatePresence } from "framer-motion"

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: number
  totalTime: string
  rank: number
  totalPlayers: number
  playerId: string
}

// Background GIFs (reuse from host)
const backgroundGifs = [
  "/assets/gif/host/4.gif",
  // Add more if available, or cycle this one
]

export default function PlayerResultsPage() {
  const params = useParams()
  const roomCode = params.roomCode as string
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [currentPlayerStats, setCurrentPlayerStats] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  const computePlayerStats = (result: any[], questions: any[]): Omit<PlayerStats, 'nickname' | 'car' | 'rank' | 'totalPlayers' | 'playerId'> => {
    const totalQuestions = questions.length
    let correct = 0
    let totalSeconds = 0

    result.forEach((ans: any) => {
      const question = questions.find((q: any) => q.id === ans.question_id)
      if (question && ans.selected_answer === question.correct_answer) {
        correct++
      }
      totalSeconds += ans.time_taken || 0
    })

    const correctAnswers = correct
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    const totalTime = `${mins}:${secs.toString().padStart(2, '0')}`
    const finalScore = correct * 10 + 50 // Adjusted to match game (10 per correct + fixed bonus)

    return { finalScore, correctAnswers, totalQuestions, accuracy, totalTime }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single()

        if (roomError || !roomData) {
          console.error('Error fetching room:', roomError)
          setError('Failed to load room data')
          return
        }

        // Format questions with ids
        const formattedQuestions = (roomData.questions || []).map((q: any, i: number) => ({
          id: `${roomCode}-${i}`,
          ...q,
          correct_answer: q.correct,
        }))

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id)
          .eq('completion', true)

        if (playersError || !playersData || playersData.length === 0) {
          console.error('Error fetching players:', playersError)
          setError('No completed players found')
          return
        }

        const currentPlayerId = localStorage.getItem('playerId')
        if (!currentPlayerId) {
          console.error('No current player ID found')
          setError('Player session not found')
          return
        }

        const currentPlayer = playersData.find((p: any) => p.id === currentPlayerId)
        if (!currentPlayer) {
          console.error('Current player not found')
          setError('Player data not found')
          return
        }

        if (!currentPlayer.result || currentPlayer.result.length === 0) {
          setError('No answers recorded')
          return
        }

        // Compute stats for all players
        const allStats = playersData
          .filter((p: any) => p.result && p.result.length > 0)
          .map((p: any) => ({
            ...computePlayerStats(p.result, formattedQuestions),
            nickname: p.nickname,
            car: p.car,
            playerId: p.id
          }))

        if (allStats.length === 0) {
          setError('No valid results')
          return
        }

        // Sort by finalScore descending for ranking
        const sortedStats = [...allStats].sort((a, b) => b.finalScore - a.finalScore)
        const rank = sortedStats.findIndex((s) => s.playerId === currentPlayerId) + 1

        // Set current player stats
        const stats = computePlayerStats(currentPlayer.result, formattedQuestions)
        setCurrentPlayerStats({
          ...stats,
          nickname: currentPlayer.nickname,
          car: currentPlayer.car,
          rank,
          totalPlayers: allStats.length,
          playerId: currentPlayerId
        })
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    if (roomCode) {
      fetchData()
    }
  }, [roomCode, supabase])

  // Background cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  const getCarColor = (car: string) => {
    const colors = {
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    }
    return colors[car as keyof typeof colors] || "bg-gray-500"
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500 glow-yellow"
      case 2:
        return "text-gray-400"
      case 3:
        return "text-amber-600"
      default:
        return "text-[#00ffff]"
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500 glow-yellow" />
      case 2:
        return <Award className="h-8 w-8 text-gray-400" />
      case 3:
        return <Award className="h-8 w-8 text-amber-600" />
      default:
        return <Star className="h-8 w-8 text-[#00ffff] glow-cyan" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
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
        <div className="crt-effect"></div>
        <div className="noise-effect"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-6 w-48 mx-auto mb-2 bg-[#ff6bff]/30" />
            <Skeleton className="h-3 w-80 mx-auto bg-[#00ffff]/30" />
          </div>
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-4 mb-4">
            <Skeleton className="h-64 bg-[#ff6bff]/20" />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 p-4 bg-[#00ffff]/20" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !currentPlayerStats) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
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
        <div className="crt-effect"></div>
        <div className="noise-effect"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto p-4 text-center flex items-center justify-center min-h-screen">
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-6">
            <h1 className="text-xl font-bold mb-2 text-[#00ffff] pixel-text glow-cyan">Results not available</h1>
            <p className="text-[#ff6bff] mb-4 pixel-text">{error || 'No data found'}</p>
            <Link href="/">
              <Button className="bg-[#ff6bff] pixel-button glow-pink">
                Back to Home
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const { finalScore, correctAnswers, totalQuestions, accuracy, totalTime, rank, totalPlayers, nickname, car } = currentPlayerStats
  const baseScore = correctAnswers * 10
  const timeBonus = finalScore - baseScore

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      {/* Preload GIFs */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
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
      <div className="crt-effect"></div>
      <div className="noise-effect"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 opacity-30">
        <div className="w-6 h-6 border-2 border-[#00ffff]"></div>
      </div>
      <div className="absolute top-4 right-4 opacity-30">
        <div className="w-6 h-6 border-2 border-[#ff6bff]"></div>
      </div>
      <div className="absolute bottom-4 left-4 opacity-40">
        <div className="flex gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#00ffff]"></div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 opacity-40">
        <div className="flex flex-col gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#ff6bff]"></div>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <div className="text-center mb-4">
          <motion.h1 
            className="text-3xl md:text-4xl font-bold mb-2 text-[#00ffff] pixel-text glow-cyan tracking-wider animate-neon-glow"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
             <span className="text-[#ff6bff] glow-pink">Results</span>
          </motion.h1>
          {/* <p className="text-lg text-[#ff6bff] pixel-text">Your final results for room {roomCode}</p> */}
        </div>

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-4 mb-4 text-center animate-neon-pulse-pink">
            {/* <div className="mb-2">{getRankIcon(rank)}</div> */}

            {/* <div className="mb-4">
              <div className={`text-3xl md:text-4xl font-bold mb-1 ${getRankColor(rank)} pixel-text`}>
                #{rank}
              </div>
              <div className="text-sm text-[#00ffff] pixel-text">out of {totalPlayers} racers</div>
            </div> */}

            <div className="flex items-center justify-center space-x-2 mb-4">
              {/* <div className={`w-8 h-6 ${getCarColor(car)} rounded-md filter brightness-125`}></div> */}
              <h2 className="text-xl md:text-4xl font-bold text-white pixel-text glow-text">{nickname}</h2>
            </div>

            <div className="text-3xl md:text-4xl  text-[#00ffff] mb-1 pixel-text glow-cyan ">
              {finalScore}
            </div>
            <div className="text-sm text-[#ff6bff] pixel-text">Final Score</div>
          </Card>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="p-3 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            {/* <Target className="h-5 w-5 mx-auto mb-2 text-[#00ffff] glow-cyan" /> */}
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-xs text-[#ff6bff] pixel-text">Correct</div>
          </Card>

          <Card className="p-3 text-center bg-[#1a0a2a]/50 border-[#ff6bff]/70 bg-[#ff6bff]/10 pixel-card">
            <div className="text-xl font-bold text-[#ff6bff] mb-1 pixel-text glow-pink">{accuracy}%</div>
            <div className="text-xs text-[#00ffff] pixel-text">Accuracy</div>
          </Card>

          <Card className="p-3 text-center bg-[#1a0a2a]/50 border-[#00ffff]/70 bg-[#00ffff]/10 pixel-card">
            {/* <Clock className="h-5 w-5 mx-auto mb-2 text-[#00ffff] glow-cyan" /> */}
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">{totalTime}</div>
            <div className="text-xs text-[#ff6bff] pixel-text">Time</div>
          </Card>
        </motion.div>

        {/* Performance Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-4 mb-4">
            <h3 className="text-lg font-bold mb-2 text-center text-[#00ffff] pixel-text glow-cyan">Score Review</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-white pixel-text text-sm">
                <span>Base Score</span>
                <span className="font-bold text-[#ff6bff] glow-pink">{baseScore} pts</span>
              </div>
              <div className="flex justify-between items-center text-white pixel-text text-sm">
                <span>Bonus</span>
                <span className="font-bold text-[#ff6bff] glow-pink">{timeBonus} pts</span>
              </div>
              <div className="border-t border-[#ff6bff]/50 pt-1 flex justify-between items-center text-base font-bold">
                <span>Total</span>
                <span className="text-[#00ffff] glow-cyan">{finalScore} pts</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-row gap-2 justify-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Link href="/">
            <Button size="sm" variant="outline" className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] pixel-button glow-cyan hover:bg-[#00ffff]/20">
              <Home className="mr-1 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/join">
            <Button size="sm" className="bg-[#ff6bff] border-2 border-white pixel-button glow-pink hover:bg-[#ff8aff]">
              <RotateCcw className="mr-1 h-4 w-4" />
              New Race
            </Button>
          </Link>
        </motion.div>

        <div className="mt-4 text-center">
          {/* <p className="text-sm text-[#ff6bff] pixel-text">Great racing! Challenge your friends to beat your score.</p> */}
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