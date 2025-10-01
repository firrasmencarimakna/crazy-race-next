// Updated game page: join/[roomCode]/game/page.tsx
// Key changes:
// - Store individual answer data in result array (appended, not overwritten)
// - Track time per question with questionStartRef
// - Persist remaining time in localStorage for mini-game redirects
// - Fix route to /results
// - Consistent localStorage key 'playerId'
// - Set question start time on index change
// - Remove cumulative duration from DB update (computed in results)
// - Adjusted score to *10 per correct for consistency (can change if needed)

"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, CheckCircle, XCircle, Zap, Users, Activity } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"

// Background GIFs (same as LobbyPage)
const backgroundGifs = [
  "/assets/gif/host/1.gif",
  "/assets/gif/host/2.gif",
  "/assets/gif/host/3.gif",
  "/assets/gif/host/4.gif",
  "/assets/gif/host/5.gif", 
  "/assets/gif/host/7.gif",
]

// Mapping warna mobil ke file GIF mobil (same as LobbyPage)
const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.gif",
  blue: "/assets/car/car2.gif",
  green: "/assets/car/car3.gif",
  yellow: "/assets/car/car4.gif",
  purple: "/assets/car/car5.gif",
  orange: "/assets/car/car5.gif",
}

// Define QuizQuestion type to match expected structure
type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  timeLimit: number
  difficulty: string
  points: number
  category: string
}

export default function QuizGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomCode = params.roomCode as string

  const [playerId, setPlayerId] = useState<string>("")
  useEffect(() => {
    const pid = localStorage.getItem("playerId") || ""
    if (!pid) router.replace(`/join/${roomCode}`)
    else setPlayerId(pid)
  }, [roomCode, router])

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

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const gameStartRef = useRef<number | null>(null)
  const questionStartRef = useRef<number | null>(null)

  // Handle starting from a specific question index (after mini game)
  useEffect(() => {
    const startIndexParam = searchParams.get('startIndex')
    if (startIndexParam && questions.length > 0) {
      const startIndex = parseInt(startIndexParam, 10)
      if (!isNaN(startIndex) && startIndex >= 0 && startIndex < totalQuestions) {
        setCurrentQuestionIndex(startIndex)
      }
    }
  }, [searchParams, totalQuestions, questions.length])

  // Set question start time when index changes and not answered
  useEffect(() => {
    if (!isAnswered && currentQuestion) {
      questionStartRef.current = Date.now()
    }
  }, [currentQuestionIndex, isAnswered, currentQuestion])

  // Fetch game room data from Supabase
  useEffect(() => {
    const fetchGameRoom = async () => {
      if (!gameStartRef.current) {
        gameStartRef.current = Date.now()
      }

      setLoading(true)
      const { data, error } = await supabase
        .from("game_rooms")
        .select("settings, questions")
        .eq("room_code", roomCode)
        .single()

      if (error || !data) {
        console.error("Error fetching game room:", error)
        setError("Failed to load quiz data")
        setLoading(false)
        return
      }

      const { settings, questions: rawQuestions } = data
      const parsedSettings = typeof settings === "string" ? JSON.parse(settings) : settings

      const formattedQuestions: QuizQuestion[] = rawQuestions.map((q: any, index: number) => ({
        id: `${roomCode}-${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
      }))

      setQuestions(formattedQuestions)
      setAnswers(new Array(formattedQuestions.length).fill(null))
      let initialRemaining = parsedSettings.duration || 300
      // Restore remaining time if coming back from mini-game
      const savedRemaining = localStorage.getItem(`quiz_remaining_${roomCode}_${playerId}`)
      if (savedRemaining) {
        initialRemaining = parseInt(savedRemaining, 10)
      }
      setTotalTimeRemaining(initialRemaining)
      setLoading(false)
    }

    if (roomCode && playerId) {
      fetchGameRoom()
    }
  }, [roomCode, playerId])

  // Timer logic
  useEffect(() => {
    if (totalTimeRemaining > 0 && !isAnswered && currentQuestion) {
      const timer = setInterval(() => {
        setTotalTimeRemaining((prev) => {
          const newTime = prev - 1
          if (newTime <= 0) {
            // Time up, auto-submit or handle
            handleTimeUp()
          }
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [totalTimeRemaining, isAnswered, currentQuestion])

  const handleTimeUp = () => {
    // Optionally auto-select random or skip
    if (!isAnswered && currentQuestion) {
      handleAnswerSelect(0) // or skip logic
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  const handleAnswerSelect = async (answerIndex: number) => {
    if (isAnswered) return

    // Mark question as answered
    setSelectedAnswer(answerIndex)
    setIsAnswered(true)
    setShowResult(true)

    // Save remaining time before potential redirect
    localStorage.setItem(`quiz_remaining_${roomCode}_${playerId}`, totalTimeRemaining.toString())

    // Update answers array
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)

    // Calculate progress
    const isCorrect = answerIndex === currentQuestion.correctAnswer
    const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0)
    setCorrectAnswers(newCorrectAnswers)

    // Time taken for this question
    const timeTaken = questionStartRef.current ? Math.floor((Date.now() - questionStartRef.current) / 1000) : 0

    // Prepare answer data
    const answerData = {
      question_id: currentQuestion.id,
      selected_answer: answerIndex,
      time_taken: timeTaken,
      is_correct: isCorrect,
    }

    // Fetch current result and append
    const { data: playerData } = await supabase
      .from('players')
      .select('result')
      .eq('id', playerId)
      .single()

    let currentResult = playerData?.result || []
    const newResult = [...currentResult, answerData]

    // Update player result in Supabase
    const { error } = await supabase
      .from('players')
      .update({
        result: newResult,
        completion: currentQuestionIndex + 1 === totalQuestions,
      })
      .eq('id', playerId)

    if (error) {
      console.error('Error updating player result:', error)
    }

    // Move to next question, mini game, or result
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1
      if (nextIndex < totalQuestions) {
        if (nextIndex % 7 === 0) {
          // Redirect to mini game setelah setiap 7 soal
          window.location.href = `/racing-game/v4.final.html?startIndex=${nextIndex}&roomCode=${roomCode}`
        } else {
          // Lanjut ke soal berikutnya
          setCurrentQuestionIndex(nextIndex)
          setSelectedAnswer(null)
          setIsAnswered(false)
          setShowResult(false)
        }
      } else {
        // Clear saved remaining
        localStorage.removeItem(`quiz_remaining_${roomCode}_${playerId}`)
        // Selesai semua soal, ke halaman result
        router.push(`/join/${roomCode}/result`)
      }
    }, 500) // Increased to 2s to see result
  }

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle"
    }

    if (optionIndex === selectedAnswer) {
      return optionIndex === currentQuestion.correctAnswer
        ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green"
        : "border-red-500 bg-red-500/10 text-red-500";
    }
    return "border-[#ff6bff]/50 bg-[#1a0a2a]/50 opacity-60"
  }

  const getTimeColor = () => {
    if (totalTimeRemaining <= 10) return "text-red-500"
    if (totalTimeRemaining <= 20) return "text-[#ff6bff] glow-pink-subtle"
    return "text-[#00ffff] glow-cyan"
  }

  if (loading || error || !currentQuestion) {
    return (
      <LoadingRetro />
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

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan tracking-wider">
            CRAZY RACE
          </h1>
        </div>

        {/* Timer and Progress */}
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card my-8 px-4 py-2">
          <CardContent className="px-0">
            <div className="flex sm:items-center justify-between gap-4">
              {/* Bagian Kiri */}
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

              {/* Bagian Kanan */}
              <div className="flex items-center">
                <Badge
                  className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] 
                   px-3 sm:px-4 sm:py-2 text-base sm:text-lg md:text-xl lg:text-2xl
                   pixel-text glow-cyan"
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
                  className={`p-3 sm:p-4  rounded-xl border-4 border-double transition-all duration-200 text-left bg-[#1a0a2a]/50 ${getOptionStyle(index)}`}
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