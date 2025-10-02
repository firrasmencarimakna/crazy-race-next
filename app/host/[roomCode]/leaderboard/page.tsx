// Leaderboard page: host/[roomCode]/leaderboard/page.tsx
// Updated to emphasize top 3 champions:
// - Top 3: Larger, staggered vertical layout for podium effect (1st centered taller, 2nd/3rd smaller on sides)
// - Enhanced animations, glows, and sizing to make them stand out
// - Others: Compact horizontal list below, unchanged styling
// - Retained pixel theme, no icons, consistent with player results

"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: number
  totalTime: string
  rank: number
}

// Background GIFs (reuse from player results)
const backgroundGifs = [
  "/assets/gif/host/4.gif",
  // Add more if available, or cycle this one
]

export default function HostLeaderboardPage() {
  const params = useParams()
  const roomCode = params.roomCode as string

  const [loading, setLoading] = useState(true)
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  const computePlayerStats = (result: any[], questions: any[]): Omit<PlayerStats, 'nickname' | 'car' | 'rank'> => {
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
    const finalScore = correct * 10 + 50 // Standardized to match player results

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

        // Format questions with ids to match player
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

        // Compute stats for all players
        const allStats = playersData
          .filter((p: any) => p.result && p.result.length > 0)
          .map((p: any) => ({
            ...computePlayerStats(p.result, formattedQuestions),
            nickname: p.nickname,
            car: p.car
          }))

        if (allStats.length === 0) {
          setError('No valid results')
          return
        }

        // Sort by finalScore descending for ranking
        const sortedStats = [...allStats].sort((a, b) => b.finalScore - a.finalScore)
        const rankedStats = sortedStats.map((stats, index) => ({
          ...stats,
          rank: index + 1
        }))

        setPlayerStats(rankedStats)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load leaderboard')
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
        <div className="relative z-10 max-w-4xl mx-auto p-4">
          <div className="text-center">
            <Skeleton className="h-6 w-48 mx-auto mb-2 bg-[#ff6bff]/30" />
            <Skeleton className="h-3 w-80 mx-auto bg-[#00ffff]/30" />
          </div>
          {/* Podium skeleton */}
          <div className="flex flex-col items-center mb-8">
            <Skeleton className="h-80 w-64 bg-[#ff6bff]/20 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-64 w-48 bg-[#00ffff]/20" />
              <Skeleton className="h-64 w-48 bg-[#00ffff]/20" />
            </div>
          </div>
          <div className="space-y-4 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 p-4 bg-[#ff6bff]/20" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || playerStats.length === 0) {
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
            <h1 className="text-xl font-bold mb-2 text-[#00ffff] pixel-text glow-cyan">Leaderboard not available</h1>
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

  const topThree = playerStats.slice(0, 3)
  const others = playerStats.slice(3)

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
             <span className="text-[#ff6bff] glow-pink">Leaderboard</span>
          </motion.h1>
          {/* <p className="text-lg text-[#ff6bff] pixel-text">Leaderboard for room {roomCode}</p> */}
        </div>

        {/* Podium - Top 3: Staggered vertical for emphasis */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* 1st Place - Taller and centered */}
          <motion.div
            className="w-full max-w-md mb-6"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Card className="p-6 text-center pixel-card animate-neon-pulse-pink border-[#ff6bff]/50 bg-[#1a0a2a]/60">
              <div className={`text-4xl md:text-5xl font-bold mb-2 ${getRankColor(1)} pixel-text`}>
                #1
              </div>
              <div className="mb-3">
                <h3 className="text-2xl md:text-3xl font-bold text-white pixel-text glow-text">{topThree[0]?.nickname}</h3>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-[#00ffff] mb-2 pixel-text glow-cyan animate-neon-glow">
                {topThree[0]?.finalScore}
              </div>
              <div className="text-sm text-[#ff6bff] pixel-text mb-4">points</div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#ff6bff] pixel-text">Correct</span>
                  <span className="font-bold text-[#00ffff] glow-cyan">{topThree[0]?.correctAnswers}/{topThree[0]?.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ff6bff] pixel-text">Accuracy</span>
                  <span className="font-bold text-[#ff6bff] glow-pink">{topThree[0]?.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ff6bff] pixel-text">Time</span>
                  <span className="font-bold text-[#00ffff] glow-cyan">{topThree[0]?.totalTime}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 2nd and 3rd Place - Side by side below */}
          <motion.div
            className="flex gap-4 w-full max-w-2xl justify-center"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {topThree.slice(1).map((player, idx) => (
              <motion.div
                key={player.nickname}
                className="flex-1"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 + idx * 0.1 }}
              >
                <Card className={`p-4 text-center pixel-card ${
                  player.rank === 2 ? 'border-gray-400/50 bg-[#1a0a2a]/60' : 'border-amber-600/50 bg-[#1a0a2a]/60'
                }`}>
                  <div className={`text-2xl md:text-3xl font-bold mb-2 ${getRankColor(player.rank)} pixel-text`}>
                    #{player.rank}
                  </div>
                  <div className="mb-2">
                    <h3 className="text-lg md:text-xl font-bold text-white pixel-text glow-text">{player.nickname}</h3>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
                    {player.finalScore}
                  </div>
                  <div className="text-xs text-[#ff6bff] pixel-text mb-2">points</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#ff6bff] pixel-text">Correct</span>
                      <span className="font-bold text-[#00ffff]">{player.correctAnswers}/{player.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#ff6bff] pixel-text">Acc.</span>
                      <span className="font-bold text-[#ff6bff]">{player.accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#ff6bff] pixel-text">Time</span>
                      <span className="font-bold text-[#00ffff]">{player.totalTime}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Other Players */}
        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-4 mb-4">
              <h3 className="text-lg font-bold mb-2 text-center text-[#00ffff] pixel-text glow-cyan">Other Racers</h3>
              <div className="space-y-2">
                {others.map((player) => (
                  <div key={player.nickname} className="flex items-center justify-between p-3 bg-[#1a0a2a]/50 rounded pixel-card">
                    <div className="flex items-center space-x-4">
                      <div className={`text-xl font-bold ${getRankColor(player.rank)} pixel-text`}>
                        #{player.rank}
                      </div>
                      <h4 className="text-lg font-bold text-white pixel-text glow-text">{player.nickname}</h4>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg text-[#00ffff] glow-cyan">{player.finalScore}</div>
                        <div className="text-[#ff6bff] pixel-text">points</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[#ff6bff] glow-pink">{player.accuracy}%</div>
                        <div className="text-[#00ffff] pixel-text">accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[#00ffff] glow-cyan">{player.totalTime}</div>
                        <div className="text-[#ff6bff] pixel-text">time</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="flex flex-row gap-2 justify-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <Link href="/">
            <Button size="sm" variant="outline" className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] pixel-button glow-cyan hover:bg-[#00ffff]/20">
              Home
            </Button>
          </Link>
          <Link href="/host">
            <Button size="sm" className="bg-[#ff6bff] border-2 border-white pixel-button glow-pink hover:bg-[#ff8aff]">
              New Race
            </Button>
          </Link>
        </motion.div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#ff6bff] pixel-text">Great racing! Share your room code with friends.</p>
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