"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock, CheckCircle, XCircle, ArrowRight, Flag } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"

// Type definitions
type QuizQuestion = {
  question: string
  options: string[]
  correct: number  // Index of correct answer
}

type Player = {
  id: string
  nickname: string
  car: string
  result: number[] | null[]  // Array of answers (e.g., [0, 1, null, 2])
  joined_at: string
  completion: boolean
}

type GameRoom = {
  id: string
  room_code: string
  status: 'waiting' | 'countdown' | 'playing' | 'finished'
  questions: QuizQuestion[]
  settings: any
}

// Extended player progress type (computed)
type PlayerProgress = {
  id: string
  nickname: string
  car: string
  questionsAnswered: number
  correctAnswers: number
  currentlyAnswering: boolean
  timeRemaining: number
  score: number
  racingProgress: number
}

// Background GIFs
const backgroundGifs = [
  "/images/lobbyphase/gif5.gif",
]

// Mapping warna mobil ke file GIF mobil
const carGifMap: Record<string, string> = {
  red: "/images/car/car1.gif",
  blue: "/images/car/car2.gif",
  green: "/images/car/car3.gif",
  yellow: "/images/car/car4.gif",
  purple: "/images/car/car5.gif",
  orange: "/images/car/car5.gif",
}

export default function HostMonitorPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [players, setPlayers] = useState<PlayerProgress[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(8)  // Bisa di-sync dari shared state
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [gamePhase, setGamePhase] = useState<"quiz" | "racing" | "finished">("quiz")
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null)

  // Fetch game room and players
  useEffect(() => {
    const fetchData = async () => {
      if (!roomCode) return

      setLoading(true)
      setError(null)

      try {
        // Fetch game room
        const { data: roomData, error: roomError } = await supabase
          .from("game_rooms")
          .select("id, room_code, status, questions, settings")
          .eq("room_code", roomCode)
          .single()

        if (roomError || !roomData) {
          throw new Error("Room not found")
        }

        setGameRoom(roomData)
        const parsedQuestions = roomData.questions || []
        setQuestions(parsedQuestions)
        setTotalQuestions(parsedQuestions.length || 10)

        // Map status to phase
        const statusToPhase: Record<string, "quiz" | "racing" | "finished"> = {
          waiting: "quiz",
          countdown: "quiz",
          playing: "quiz",  // Adjust if racing is separate
          finished: "finished"
        }
        setGamePhase(statusToPhase[roomData.status] || "quiz")

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, nickname, car, result, joined_at, completion")
          .eq("room_id", roomData.id)

        if (playersError) {
          throw new Error("Failed to fetch players")
        }

        // Compute progress for each player
        const computedPlayers: PlayerProgress[] = playersData.map((player: Player) => {
          const answers = player.result || []
          const questionsAnswered = answers.filter(a => a !== null).length
          let correctAnswers = 0
          answers.forEach((answer, idx) => {
            if (answer !== null && parsedQuestions[idx]?.correct === answer) {
              correctAnswers++
            }
          })
          const score = correctAnswers * 100
          const racingProgress = parsedQuestions.length > 0 ? (questionsAnswered / parsedQuestions.length) * 100 : 0

          return {
            id: player.id,
            nickname: player.nickname,
            car: player.car || "red",  // Default car
            questionsAnswered,
            correctAnswers,
            currentlyAnswering: !player.completion && gameRoom?.status === "playing",  // Simulate based on status
            timeRemaining: player.completion ? 0 : 30,  // Simulate; bisa dari shared timer
            score,
            racingProgress: Math.min(100, racingProgress),
          }
        })

        setPlayers(computedPlayers)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [roomCode])

  // Realtime subscription for players updates
  useEffect(() => {
    if (!gameRoom?.id) return

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${gameRoom.id}`,
        },
        (payload) => {
          console.log("Player update:", payload)
          // Re-fetch or update specific player
          fetchData()  // Simple: re-fetch all for now
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameRoom?.id, roomCode])

  // Simulate real-time updates (timeRemaining, etc.)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) =>
        prev.map((player) => ({
          ...player,
          timeRemaining: player.currentlyAnswering ? Math.max(0, player.timeRemaining - 1) : 0,
        }))
      )

      // Simulate phase changes (bisa di-trigger manual atau dari DB)
      if (currentQuestion >= totalQuestions && gamePhase === "quiz") {
        setGamePhase("racing")
        // Update status in DB if needed
        supabase
          .from("game_rooms")
          .update({ status: "finished" })  // Example
          .eq("room_code", roomCode)
        setTimeout(() => setGamePhase("finished"), 30000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentQuestion, gamePhase, totalQuestions, roomCode])

  // Background image cycling
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

  const getAccuracy = (correct: number, total: number) => {
    return total > 0 ? Math.round((correct / total) * 100) : 0
  }

  const handleEndGame = async () => {
    if (gameRoom) {
      await supabase
        .from("game_rooms")
        .update({ status: "finished", end: new Date().toISOString() })
        .eq("id", gameRoom.id)
    }
    router.push(`/host/leaderboard/${roomCode}`)
  }

  const getPhaseIcon = () => {
    switch (gamePhase) {
      case "quiz":
        return <CheckCircle className="h-5 w-5" />
      case "racing":
        return <Flag className="h-5 w-5" />
      case "finished":
        return <Trophy className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getPhaseColor = () => {
    switch (gamePhase) {
      case "quiz":
        return "bg-[#00ff00]/20 border-[#00ff00]/50 text-[#00ff00]"
      case "racing":
        return "bg-[#ff6bff]/20 border-[#ff6bff]/50 text-[#ff6bff]"
      case "finished":
        return "bg-red-500/20 border-red-500/50 text-red-500"
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-500"
    }
  }

  const getPhaseText = () => {
    switch (gamePhase) {
      case "quiz":
        return "Quiz Phase"
      case "racing":
        return "Racing Phase"
      case "finished":
        return "Finished"
      default:
        return "Unknown"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center">
        <div className="text-white">Loading players...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      {/* Preload GIFs */}
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

      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        {/* Header - Centered */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-6xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            CRAZY RACE
          </h1>

        </div>

        {/* Host Controls - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card mb-4 p-4">
            <div className="flex justify-between items-center">
              <div className="text-white">
                <Users className="h-5 w-5 inline mr-2" />
                {players.length} Players 
              </div>
              {gamePhase === "finished" && (
                <Button onClick={handleEndGame} className="pixel-button-large">
                  View Leaderboard
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Player Progress - Monitor untuk player yang sedang bermain */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card p-4 md:p-6 mb-8">

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`group ${player.currentlyAnswering ? 'glow-cyan animate-neon-pulse' : 'glow-pink-subtle'}`}
                  >
                    <Card className={`p-2 md:p-3 bg-[#1a0a2a]/50 border-2 border-double ${player.currentlyAnswering ? 'border-[#00ffff]/70' : 'border-[#ff6bff]/70'} transition-all duration-300 h-full`}>
                      <div className="mb-2 md:mb-3">
                        <h3 className="font-bold text-white pixel-text text-xs md:text-sm leading-tight glow-text text-center mb-2">{player.nickname}</h3>
                        <Progress 
                          value={player.racingProgress} 
                          className="h-2 md:h-3 bg-[#1a0a2a]/50 border border-[#00ffff]/30" 
                        />
                      </div>
                    </Card>
                  </motion.div>
                ))}
                {players.length === 0 && (
                  <div className="col-span-full text-center text-white/50 py-8">
                    No players joined yet...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
        .glow-cyan-intense {
          filter: drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 15px #00ffff) drop-shadow(0 0 20px #00ffff);
        }
        .glow-pink-subtle {
          filter: drop-shadow(0 0 5px rgba(255, 107, 255, 0.5));
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
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
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        .glow-pink-subtle {
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

function fetchData() {
  throw new Error("Function not implemented.")
}