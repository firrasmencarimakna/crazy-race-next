"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"
import { formatTime } from "@/utils/game"
import { Button } from "react-day-picker"

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
  purple: "/assets/car/car1.webp?v=2",
  white: "/assets/car/car2.webp?v=2",
  black: "/assets/car/car3.webp?v=2",
  aqua: "/assets/car/car4.webp?v=2",
  blue: "/assets/car/car5.webp?v=2",
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

type GameSettings = {
  quizId: string
  timeLimit: number
  numQuestions: number
  questions: QuizQuestion[]
}

type GameProgress = {
  answers: (number | null)[]
  correctAnswers: number
  totalTimeRemaining: number
  currentQuestionIndex: number
  gameStartTime: number // Timestamp start
}

export default function QuizGamePage() {
  const router = useRouter()

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
  const gameStartRef = useRef<number | null>(null)

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  // Load game data (solo mode only, fully from localStorage)
  useEffect(() => {
    const loadGameData = async () => {
      console.log('Loading solo game data from localStorage...'); // Debug
      setLoading(true)
      try {
        // Load settings dari localStorage
        const savedSettingsStr = localStorage.getItem('tryout_settings')
        if (!savedSettingsStr) {
          throw new Error("No saved tryout settings found. Start a new tryout.")
        }
        const savedSettings: GameSettings = JSON.parse(savedSettingsStr)
        const { questions: savedQuestions, timeLimit, numQuestions } = savedSettings

        if (!savedQuestions || savedQuestions.length === 0) {
          throw new Error("No questions found in saved settings.")
        }

        const formattedQuestions: QuizQuestion[] = savedQuestions

        let savedAnswers: (number | null)[] = new Array(formattedQuestions.length).fill(null)
        let currentIndex = 0
        let savedCorrect = 0
        let remainingTime = timeLimit * 60 // Full time in seconds

        // Load progress dari localStorage
        const savedProgressStr = localStorage.getItem('tryout_progress')
        if (savedProgressStr) {
          const savedProgress: GameProgress = JSON.parse(savedProgressStr)
          savedAnswers = savedProgress.answers
          currentIndex = savedProgress.currentQuestionIndex
          savedCorrect = savedProgress.correctAnswers
          remainingTime = savedProgress.totalTimeRemaining
        }

        // Di akhir loadGameData, tambah check ini
        if (remainingTime <= 0 && currentIndex < formattedQuestions.length) {
          // Jika waktu habis tapi soal belum selesai, reset ke full time (atau handle manual)
          remainingTime = timeLimit * 60;
          setTotalTimeRemaining(remainingTime);
          console.log('Timer reset due to expired progress');
        }

        setQuestions(formattedQuestions)
        setAnswers(savedAnswers)
        setCurrentQuestionIndex(currentIndex)
        setCorrectAnswers(savedCorrect)
        setTotalTimeRemaining(remainingTime)
        if (!gameStartRef.current) {
          gameStartRef.current = Date.now() - ((timeLimit * 60 - remainingTime) * 1000)
        }
        setLoading(false)
        console.log('Solo game data loaded from localStorage:', { currentIndex, remainingTime, totalQuestions: formattedQuestions.length }); // Debug
      } catch (err: any) {
        console.error("Error loading solo game data:", err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadGameData()
  }, [])

  // Timer logic and end-game on timeout
  useEffect(() => {
    if (totalTimeRemaining <= 0 && !loading && questions.length > 0) {
      // Time's up, save progress and redirect to result
      saveProgressAndRedirect()
      return
    }

    if (totalTimeRemaining > 0 && !isAnswered && currentQuestion) {
      const timer = setInterval(() => {
        setTotalTimeRemaining((prev) => {
          const newTime = prev - 1
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [totalTimeRemaining, isAnswered, currentQuestion, loading, questions.length])

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  // Save progress and redirect to result page
  const saveProgressAndRedirect = () => {
    const elapsedSeconds = gameStartRef.current
      ? Math.floor((Date.now() - gameStartRef.current) / 1000)
      : 0
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00"

    // Solo: Save ke localStorage
    const progress: GameProgress = {
      answers,
      correctAnswers,
      totalTimeRemaining: Math.max(0, totalTimeRemaining),
      currentQuestionIndex,
      gameStartTime: gameStartRef.current || Date.now()
    }
    localStorage.setItem('tryout_progress', JSON.stringify(progress))
    localStorage.setItem('tryout_final_score', JSON.stringify({
      score: correctAnswers * 10,
      correct: correctAnswers,
      accuracy,
      duration: elapsedSeconds,
      totalQuestions
    })) // Simpan final score untuk result page
    console.log('Solo final progress saved:', progress) // Debug
    router.push('/tryout/game/result') // Route ke result solo
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return

    // Mark question as answered/
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
    const elapsedSeconds = gameStartRef.current
      ? Math.floor((Date.now() - gameStartRef.current) / 1000)
      : 0

    // Solo: Save progress ke localStorage
    const progress: GameProgress = {
      answers: newAnswers,
      correctAnswers: newCorrectAnswers,
      totalTimeRemaining: Math.max(0, totalTimeRemaining),
      currentQuestionIndex,
      gameStartTime: gameStartRef.current || Date.now()
    }
    localStorage.setItem('tryout_progress', JSON.stringify(progress))
    console.log('Solo answer saved:', { answerIndex, isCorrect, progress }) // Debug

    // Move to next question, mini-game, or result
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1
      if (nextIndex < totalQuestions) {
        if (nextIndex % 7 === 0) {
          // Save next index for mini-game return
          localStorage.setItem("nextQuestionIndex", nextIndex.toString())
          window.location.href = `/racing-game/v4.final.html?roomCode=solo` // Adaptasi untuk solo
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
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle"
    }

    if (optionIndex === selectedAnswer) {
      return optionIndex === currentQuestion.correctAnswer
        ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green"
        : "border-red-500 bg-red-500/10 text-red-500"
    }
    return optionIndex === currentQuestion.correctAnswer
      ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green"
      : "border-[#ff6bff]/50 bg-[#1a0a2a]/50 opacity-60"
  }

  const getTimeColor = () => {
    if (totalTimeRemaining <= 10) return "text-red-500"
    if (totalTimeRemaining <= 20) return "text-[#ff6bff] glow-pink-subtle"
    return "text-[#00ffff] glow-cyan"
  }

  if (loading) {
    return <LoadingRetro />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0a2a]">
        <Card className="p-4 text-center text-red-500">
          <h2>Error: {error}</h2>
          <Button onClick={() => router.back()}>Back</Button>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center bg-[#1a0a2a]">No question loaded. Start a new tryout.</div>
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
      <div className="crt-effect" />
      <div className="noise-effect" />
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none" />

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 opacity-30">
        <div className="w-6 h-6 border-2 border-[#00ffff]" />
      </div>
      <div className="absolute top-4 right-4 opacity-30">
        <div className="w-6 h-6 border-2 border-[#ff6bff]" />
      </div>
      <div className="absolute bottom-4 left-4 opacity-40">
        <div className="flex gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#00ffff]" />
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 opacity-40">
        <div className="flex flex-col gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#ff6bff]" />
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