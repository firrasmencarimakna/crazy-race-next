"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Clock, Hash, Play, Volume2, VolumeX, Menu, X, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"

// List of background GIFs (same as QuestionListPage for consistency)
const backgroundGifs = [
  "/assets/background/host/7.webp",
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
  const [volume, setVolume] = useState(50) // 0-100, default 50%
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const audioRef = useRef<HTMLAudioElement>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");

  // Inisialisasi audio: play otomatis dengan volume default
  useEffect(() => {
    if (audioRef.current) {
      const initialVolume = volume / 100
      audioRef.current.volume = isMuted ? 0 : initialVolume
      audioRef.current.play().catch((e) => {
        console.log("Autoplay dicegah oleh browser:", e)
      })
    }
  }, [])

  // Update audio volume berdasarkan state volume dan isMuted
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : (volume / 100)
    }
  }, [volume, isMuted])

  // Handle toggle mute/unmute
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (isMuted && value[0] > 0) {
      setIsMuted(false) // Auto unmute jika volume dinaikkan
    }
  }

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

  // Handle saving settings and questions - UPDATED: Tambah difficulty ke settings
  const handleCreateRoom = async () => {
    if (!quiz || saving) return
    setSaving(true)

    // Prepare settings - TAMBAHAN: Include selectedDifficulty
    const settings = {
      duration: Number.parseInt(duration),
      questionCount: Math.min(Number.parseInt(questionCount), quiz.questions.length),
      difficulty: selectedDifficulty, // 🔥 Ini yang baru: Simpan difficulty
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
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">

      {/* Background Image with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBgIndex}
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundGifs[currentBgIndex]})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {/* Back Button - Fixed Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        className="absolute top-4 left-4 z-40 p-3 bg-[#00ffff]/20 border-2 border-[#00ffff] pixel-button hover:bg-[#33ffff]/20 glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Back to Host"
        onClick={() => router.push('/host')}
      >
        <ArrowLeft size={20} className="text-white" />
      </motion.button>

      <h1 className="absolute top-5 right-20 hidden md:block display-flex">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={64}
        />
      
      </h1>



      <h1 className="absolute top-6 left-20 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      {/* Burger Menu Button - Fixed Top Right */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-4 right-4 z-40 p-3 bg-[#ff6bff]/20 border-2 border-[#ff6bff]/50 pixel-button hover:bg-[#ff8aff]/40 glow-pink rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={20} /> : <Volume2 size={20} />}
      </motion.button>

      {/* Menu Dropdown - Muncul saat burger diklik, dari kanan */}
            {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="absolute top-20 right-4 z-30 w-64 bg-[#1a0a2a]/20 border border-[#ff6bff]/50 rounded-lg p-3 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm"
        >
          <div className="space-y-2">
            {/* Integrated Mute + Volume: Single row for button + slider, with label above for simplicity */}
            <div className="p-1.5 bg-[#ff6bff]/10 rounded space-y-1"> {/* Unified bg for the whole section; adjusted to /10 for subtle highlight */}
              {/* <span className="text-xs text-white pixel-text block">Suara</span> Moved "Suara" label here as section header; changed color to white for better contrast */}
              
              {/* New flex row: Mute button on left, slider on right; tight spacing */}
              <div className="flex items-center space-x-2 bg-[#1a0a2a]/60 border border-[#ff6bff]/30 rounded px-2 py-1"> {/* Shared container for row; reduced px-1 to px-2 for button fit, py-0.5 to py-1 */}
                <button
                  onClick={handleMuteToggle}
                  className="p-1.5 bg-[#00ffff] border border-white pixel-button hover:bg-[#33ffff] glow-cyan rounded flex-shrink-0" // Added flex-shrink-0 to prevent button compression
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                
                <div className="flex-1"> {/* Wrapper for slider to take remaining space */}
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                    orientation="horizontal"
                    aria-label="Volume slider"
                  />
                </div>
              </div>
              
              {/* Volume value below slider for quick glance; optional but keeps info visible without cluttering row */}
              <span className="text-xs text-[#ff6bff] pixel-text">Volume: {volume}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {saving && <LoadingRetro />}

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-6 max-w-4xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="p-4 sm:p-6 sm:mt-7">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#ffefff] pixel-text glow-pink">
              Settings
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
            className="text-center text-gray-400 pixel-text  text-sm sm:text-base"
          >
            ERROR: QUIZ NOT FOUND
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-4 border-[#ff87ff]/50 pixel-card glow-pink-subtle p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              {/* Selected Quiz - Ditambahkan ikon dan wrapper untuk konsistensi */}
              <div className="p-3 sm:p-4 bg-[#0a0a0f] border-2 border-[#ff87ff]/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <Hash className="h-5 w-5 text-[#ff87ff]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-base sm:text-lg text-[#ff87ff] pixel-text font-semibold line-clamp-2">
                      {quiz.title}
                    </p>
                    <p className="text-[#00ffff] pixel-text text-xs sm:text-sm line-clamp-2">
                      {quiz.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings Grid - Diubah ke grid 2 kolom di sm+ untuk layout lebih compact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Duration */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-base sm:text-lg font-semibold flex items-center space-x-2 text-[#00ffff] pixel-text glow-cyan">
                    <Clock className="h-4 w-4" />
                    <span>Duration</span>
                  </Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="text-base sm:text-lg p-3 sm:p-5 bg-[#0a0a0f] border-2 border-[#00ffff]/30 text-white pixel-text focus:border-[#00ffff] w-full transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-2 sm:border-4 border-[#6a4c93] text-white pixel-text">
                      {Array.from({ length: 6 }, (_, i) => (i + 1) * 5).map((min) => (
                        <SelectItem key={min} value={(min * 60).toString()}>
                          {min} Minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Number of Questions */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-base sm:text-lg font-semibold flex items-center space-x-2 text-[#00ffff] pixel-text glow-cyan">
                    <Hash className="h-4 w-4" />
                    <span>Questions</span>
                  </Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger className="text-base sm:text-lg p-3 sm:p-5 bg-[#0a0a0f] border-2 border-[#00ffff]/30 text-white pixel-text focus:border-[#00ffff] w-full transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0f] border-2 sm:border-4 border-[#6a4c93] text-white pixel-text">
                      {questionCountOptions.map((count) => (
                        <SelectItem key={count} value={count.toString()}>
                          {count === totalQuestions ? `${count} (All)` : count}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Difficulty Section - Simplified without car */}
              <div className="space-y-4 sm:space-y-6">
                <Label className="text-base sm:text-lg font-semibold flex items-center justify-center space-x-2 text-[#00ffff] pixel-text glow-cyan mb-4">
                  <Settings className="h-4 w-4" />
                  <span>CHOOSE DIFFICULTY</span>
                </Label>
                
                {/* Simple Difficulty Buttons */}
                <div className="flex justify-center space-x-3 sm:space-x-6">
                  {["Easy", "Medium", "Hard"].map((diff) => (
                    <Button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`
                        pixel-button text-sm sm:text-base px-6 sm:px-8 py-3 font-bold 
                        w-24 sm:w-28 transition-all duration-200 border-2
                        ${
                          selectedDifficulty === diff
                            ? "bg-[#ff6bff] hover:bg-[#ff8aff] glow-pink text-white border-white shadow-lg shadow-[#ff6bff]/50"
                            : "bg-[#0a0a0f] border-[#00ffff]/40 text-[#00ffff] hover:bg-[#00ffff]/10 hover:border-[#00ffff] hover:shadow-md hover:shadow-[#00ffff]/30"
                        }
                      `}
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Continue Button - Ditambahkan subtle glow dan spacing */}
              <div className="pt-4 border-t border-[#ff87ff]/20">
                <Button
                  onClick={handleCreateRoom}
                  disabled={saving}
                  className="w-full text-base sm:text-xl py-4 sm:py-6 bg-[#00ffff] pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed transition-all shadow-lg shadow-[#00ffff]/30"
                >
                  <Play className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  CONTINUE
                </Button>
              </div>
            </div>
          </Card>
          </motion.div>
        )}
      </div>

      {/* Audio Element untuk Background Music */}
      <audio
        ref={audioRef}
        src="/assets/music/resonance.mp3"
        loop
        preload="auto"
        className="hidden"
      />

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
            padding: 0.75rem;
          }
          .pixel-button {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
          .pixel-card {
            padding: 1rem !important;
          }
          .crt-effect,
          .noise-effect {
            background-size: 100% 2px;
          }
          .glow-pink,
          .glow-cyan {
            animation-duration: 2s;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}