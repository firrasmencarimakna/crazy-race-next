"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"
import { formatTime } from "@/utils/game"

// Background GIFs
const backgroundGifs = [
  "/assets/background/host/1.webp",
  "/assets/background/host/2.webp",
  "/assets/background/host/3.webp",
  "/assets/background/host/4.webp",
  "/assets/background/host/5.webp",
  "/assets/background/host/7.webp",
]

// Car GIF mappings
const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.webp",
  blue: "/assets/car/car2.webp",
  green: "/assets/car/car3.webp",
  yellow: "/assets/car/car4.webp",
  purple: "/assets/car/car5.webp",
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

export default function QuizGamePage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const [playerId, setPlayerId] = useState<string>("")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [gameDuration, setGameDuration] = useState(0)

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  // Initialize playerId and check session
  useEffect(() => {
    const pid = localStorage.getItem("playerId") || ""
    if (!pid) {
      router.replace(`/join/${roomCode}`)
    } else {
      setPlayerId(pid)
    }
  }, [roomCode, router])

  // Fetch game room and player data from Supabase
  useEffect(() => {
    const fetchGameData = async () => {
      setLoading(true)
      try {
        // Fetch game room data
        const { data: roomData, error: roomError } = await supabase
          .from("game_rooms")
          .select("id, settings, questions, status, start")
          .eq("room_code", roomCode)
          .single()

        if (roomError || !roomData) {
          throw new Error("Failed to load game room data")
        }

        // Parse settings and questions
        const settings = typeof roomData.settings === "string" ? JSON.parse(roomData.settings) : roomData.settings
        const formattedQuestions: QuizQuestion[] = roomData.questions.map((q: any, index: number) => ({
          id: `${roomCode}-${index}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct,
        }))

        // Set game start time and duration
        setGameStartTime(roomData.start ? new Date(roomData.start).getTime() : null)
        setGameDuration(settings.duration)

        // Fetch player progress
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("result, completion")
          .eq("id", playerId)
          .single()

        if (playerError || !playerData) {
          throw new Error("Failed to load player data")
        }

        const result = playerData.result && playerData.result[0] ? playerData.result[0] : {}
        const savedAnswers = result.answers || new Array(formattedQuestions.length).fill(null)
        const currentIndex = playerData.completion ? formattedQuestions.length : (result.current_question || 0)
        const savedCorrect = result.correct || 0

        setQuestions(formattedQuestions)
        setAnswers(savedAnswers)
        setCurrentQuestionIndex(currentIndex)
        setCorrectAnswers(savedCorrect)
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching game data:", err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (roomCode && playerId) {
      fetchGameData()
    }
  }, [roomCode, playerId])

  // Realtime timer based on wall time from DB start
  useEffect(() => {
    if (!gameStartTime || loading || questions.length === 0 || gameDuration === 0) return

    const updateRemaining = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - gameStartTime) / 1000)
      const remaining = gameDuration - elapsed
      setTotalTimeRemaining(Math.max(0, remaining))

      if (remaining <= 0) {
        saveProgressAndRedirect()
      }
    }

    // Initial update
    updateRemaining()

    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [gameStartTime, loading, questions.length, gameDuration])

  // Subscribe to game_rooms status changes
  useEffect(() => {
    const subscription = supabase
      .channel(`game_rooms:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.new.status === "finished") {
            saveProgressAndRedirect()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [roomCode, playerId, answers, correctAnswers, questions])

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  // Save progress and redirect to result page
  const saveProgressAndRedirect = async () => {
    if (!gameStartTime) return
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000)
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00"
    const updatedResult = {
      score: correctAnswers * 10,
      correct: correctAnswers,
      accuracy,
      duration: elapsedSeconds,
      current_question: currentQuestionIndex + 1,
      total_question: totalQuestions,
      answers,
    }

    const { error } = await supabase
      .from("players")
      .update({
        result: [updatedResult],
        completion: true,
      })
      .eq("id", playerId)

    if (error) {
      console.error("Error saving progress:", error)
    }

    router.push(`/join/${roomCode}/result`)
  }

  const handleAnswerSelect = async (answerIndex: number) => {
    if (isAnswered) return

    // Mark question as answered
    setSelectedAnswer(answerIndex)
    setIsAnswered(true)
    setShowResult(true)

    // Update answers array
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)

    // Calculate progress
    const isCorrect = answerIndex === currentQuestion.correctAnswer
    const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0)
    setCorrectAnswers(newCorrectAnswers)
    const accuracy = totalQuestions > 0 ? ((newCorrectAnswers / totalQuestions) * 100).toFixed(2) : "0.00"

    if (!gameStartTime) return
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000)

    // Save progress to Supabase
    const updatedResult = {
      score: newCorrectAnswers * 10,
      correct: newCorrectAnswers,
      accuracy,
      duration: elapsedSeconds,
      current_question: currentQuestionIndex + 1,
      total_question: totalQuestions,
      answers: newAnswers,
    }

    const { error } = await supabase
      .from("players")
      .update({
        result: [updatedResult],
        completion: currentQuestionIndex + 1 === totalQuestions,
      })
      .eq("id", playerId)

    if (error) {
      console.error("Error updating player result:", error)
    }

    // Move to next question, mini-game, or result
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1
      if (nextIndex < totalQuestions) {
        if (nextIndex % 7 === 0) {
          // Save next index for mini-game return
          localStorage.setItem("nextQuestionIndex", nextIndex.toString())
          window.location.href = `/racing-game/v4.final.html?roomCode=${roomCode}`
        } else {
          setCurrentQuestionIndex(nextIndex)
          setSelectedAnswer(null)
          setIsAnswered(false)
          setShowResult(false)
        }
      } else {
        saveProgressAndRedirect()
      }
    }, 500)
  }

  // Resume from mini-game
  useEffect(() => {
    const nextIndex = localStorage.getItem("nextQuestionIndex")
    if (nextIndex && questions.length > 0) {
      const index = parseInt(nextIndex, 10)
      if (!isNaN(index) && index >= 0 && index < totalQuestions) {
        setCurrentQuestionIndex(index)
        localStorage.removeItem("nextQuestionIndex")
      }
    }
  }, [questions.length, totalQuestions])

  const getOptionStyle = (optionIndex: number) => {
    // mode normal (belum submit)
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle"
    }

    // mode setelah submit
    if (optionIndex === selectedAnswer) {
      // yang dipilih user
      return optionIndex === currentQuestion.correctAnswer
        ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green"   // benar
        : "border-red-500 bg-red-500/10 text-red-500"                  // salah
    }

    // yang tidak dipilih → tidak usah di-highlight sama sekali
    return "border-[#ff6bff]/50 bg-[#1a0a2a]/50 opacity-60"
  }

  const getTimeColor = () => {
    if (totalTimeRemaining <= 10) return "text-red-500"
    if (totalTimeRemaining <= 20) return "text-[#ff6bff] glow-pink-subtle"
    return "text-[#00ffff] glow-cyan"
  }

  if (loading || error || !currentQuestion) {
    return <LoadingRetro />
  }

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

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan tracking-wider">
            CRAZY RACE
          </h1>
        </div>

        {/* Timer and Progress */}
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card my-8 px-4 py-2">
          <CardContent className="px-0">
            <div className="flex sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Clock
                  className={`h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 ${getTimeColor()}`}
                />
                <div>
                  <div
                    className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold ${getTimeColor()}`}
                  >
                    {formatTime(totalTimeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <Badge
                  className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] px-3 sm:px-4 sm:py-2 text-base sm:text-lg md:text-xl lg:text-2xl pixel-text glow-cyan"
                >
                  {currentQuestionIndex + 1}/{totalQuestions}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card">
          <CardHeader className="text-center">
            <h2 className="text-lg sm:text-2xl font-bold text-[#00ffff] pixel-text glow-cyan text-balance">
              {currentQuestion.question}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`p-3 sm:p-4 rounded-xl border-4 border-double transition-all duration-200 text-left bg-[#1a0a2a]/50 ${getOptionStyle(index)}`}
                  whileHover={{ scale: isAnswered ? 1 : 1.01 }}
                  whileTap={{ scale: isAnswered ? 1 : 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#ff6bff]/20 flex items-center justify-center font-bold text-[#ff6bff] pixel-text glow-pink-subtle">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-base sm:text-lg font-medium text-white pixel-text glow-text">{option}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
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
        .pixel-border-large {
          border: 4px solid #00ffff;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
          box-shadow: 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .pixel-border-small {
          border: 2px solid #00ffff;
          background: #1a0a2a;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
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
        .glow-pink-subtle {
          animation: neon-pulse-pink 1.5s ease-in-out infinite;
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
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
        @keyframes neon-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}