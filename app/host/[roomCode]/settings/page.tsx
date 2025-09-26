"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clock, Hash, Play, Volume2, VolumeX } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"

// List of background GIFs (same as QuestionListPage for consistency)
const backgroundGifs = [
  "/images/lobbyphase/gif8.gif",
]

export default function HostSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const roomCode = params.roomCode as string
  const [duration, setDuration] = useState("300") // Default: 5 minutes (300 seconds)
  const [questionCount, setQuestionCount] = useState("10") // Default: 10 questions
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isGlitch, setIsGlitch] = useState(false)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [saving, setSaving] = useState(false)

  // Generate dynamic question count options
  const totalQuestions = quiz?.questions?.length || 0
  const questionCountOptions = totalQuestions > 0
    ? Array.from(
      { length: Math.floor(totalQuestions / 5) + 1 },
      (_, i) => (i + 1) * 5
    ).filter((count) => count <= totalQuestions)
    : [5, 10, 15, 20, 25] // Fallback options if quiz not loaded
  if (totalQuestions > 0 && !questionCountOptions.includes(totalQuestions)) {
    questionCountOptions.push(totalQuestions) // Add "All" option
  }

  // Set default question count to 10 or closest valid option
  useEffect(() => {
    if (totalQuestions > 0) {
      const closest = questionCountOptions.reduce((prev, curr) =>
        Math.abs(curr - 10) < Math.abs(prev - 10) ? curr : prev
      )
      setQuestionCount(closest.toString())
    }
  }, [totalQuestions])

  // Fetch quiz details from Supabase
  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true)
      // Step 1: Get game room by room_code to find quiz_id
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("quiz_id")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching game room:", roomError)
        setLoading(false)
        return
      }

      // Step 2: Get quiz details using quiz_id
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", roomData.quiz_id)
        .single()

      if (quizError) {
        console.error("Error fetching quiz:", quizError)
      } else {
        setQuiz(quizData)
      }
      setLoading(false)
    }

    if (roomCode) {
      fetchQuizDetails()
    }
  }, [roomCode])

  // Glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitch(true)
        setTimeout(() => setIsGlitch(false), 100)
      }
    }, 3000)
    return () => clearInterval(glitchInterval)
  }, [])

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 500)
      }, 500)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  // Shuffle array function
  function shuffleArray(array: any[]) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Handle saving settings and questions
  const handleCreateRoom = async () => {
    if (!quiz || saving) return
    setSaving(true)

    // Prepare settings
    const settings = {
      duration: Number.parseInt(duration),
      questionCount: Math.min(Number.parseInt(questionCount), quiz.questions.length),
    }

    // Prepare questions (shuffle if enabled)
    const questions = shuffleArray(quiz.questions).slice(0, settings.questionCount)

    // Update game_rooms with settings and questions
    const { error } = await supabase
      .from("game_rooms")
      .update({
        settings,
        questions,
      })
      .eq("room_code", roomCode)

    if (error) {
      console.error("Error updating room settings and questions:", error)
      setSaving(false)
      return
    }

    router.push(`/host/${roomCode}`)
  }

  return (
    <div className={`min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font ${isGlitch ? 'glitch-effect' : ''}`}>
      {/* Preload Background GIFs */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
      ))}

      {/* Background Image with Smooth Transition */}
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

      {/* CRT Monitor Effect */}
      <div className="crt-effect"></div>
      {/* Static Noise */}
      <div className="noise-effect"></div>
      {/* Purple Gradient Overlay */}
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
      {saving && (
          <LoadingRetro />
      )}

      {/* Header Controls */}
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <Button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-[#ff6bff] border-4 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
        >
          {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
        </Button>
        <Link href="/host">
          <Button className="p-2 bg-[#00ffff] border-4 border-white pixel-button hover:bg-[#33ffff] glow-cyan">
            <ArrowLeft size={16} className="text-white" />
          </Button>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="p-6">
            <h1 className="text-4xl md:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan">
              Game Settings
            </h1>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <LoadingRetro />
        ) : !quiz ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-400 pixel-text glow-pink-subtle"
          >
            ERROR: QUIZ NOT FOUND
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-8">
              <div className="space-y-8">
                {/* Selected Quiz */}
                <div className="p-4 bg-[#0a0a0f] border-4 border-[#6a4c93] rounded-lg">
                  <p className="text-lg text-gray-200 pixel-text font-semibold line-clamp-2">{quiz.title}</p>
                  <p className="text-gray-400 pixel-text text-sm mt-1">{quiz.description}</p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Duration */}
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center text-[#00ffff] pixel-text glow-cyan">
                      <Clock className="mr-2 h-5 w-5" />
                      Duration
                    </Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="text-lg p-4 bg-[#0a0a0f] border-4 border-[#6a4c93] text-white pixel-text focus:border-[#00ffff]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border-4 border-[#6a4c93] text-white pixel-text">
                        {Array.from({ length: 6 }, (_, i) => (i + 1) * 5).map((min) => (
                          <SelectItem key={min} value={(min * 60).toString()}>
                            {min} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Number of Questions */}
                  <div className="space-y-3">
                    <Label className="text-lg font-semibold flex items-center text-[#00ffff] pixel-text glow-cyan">
                      <Hash className="mr-2 h-5 w-5" />
                      Total Questions
                    </Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger className="text-lg p-4 bg-[#0a0a0f] border-4 border-[#6a4c93] text-white pixel-text focus:border-[#00ffff]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border-4 border-[#6a4c93] text-white pixel-text">
                        {questionCountOptions.map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {count === totalQuestions ? `${count} (All)` : count}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleCreateRoom}
                  disabled={saving}
                  className="w-full text-xl py-6 bg-[#00ffff] border-4 border-white pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed"
                >
                  <Play className="mr-2 h-6 w-6" />
                  CONTINUE
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
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
        .pixel-button {
          image-rendering: pixelated;
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }
        .pixel-button:hover:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
        }
        .pixel-border-large {
          border: 4px solid #00ffff;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
          box-shadow: 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .pixel-border-large::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 2px solid #ff6bff;
          z-index: -1;
        }
        .pixel-card {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
          transition: all 0.2s ease;
        }
        .pixel-card:hover {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4);
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
        .glitch-effect {
          animation: glitch 0.3s linear;
        }
        .glow-pink {
          animation: glow-pink 1.5s ease-in-out infinite;
        }
        .glow-pink-subtle {
          animation: glow-pink 2s ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(255, 107, 255, 0.5));
        }
        .glow-cyan {
          animation: glow-cyan 1.5s ease-in-out infinite;
        }
        .glow-cyan-subtle {
          animation: glow-cyan 2s ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.5));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        @keyframes glow-cyan {
          0%, 100% { filter: drop-shadow(0 0 5px #00ffff); }
          50% { filter: drop-shadow(0 0 15px #00ffff); }
        }
        @keyframes glow-pink {
          0%, 100% { filter: drop-shadow(0 0 5px #ff6bff); }
          50% { filter: drop-shadow(0 0 15px #ff6bff); }
        }
        /* Responsive */
        @media (max-width: 768px) {
          .pixel-border-large {
            padding: 1rem;
          }
          .pixel-button {
            padding: 0.5rem;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}