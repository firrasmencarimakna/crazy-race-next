
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Crown, Award, SkipForward, Menu, X, Volume2, VolumeX, Users } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { sortPlayersByProgress, formatTime, calculateRemainingTime, breakOnCaps } from "@/utils/game"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"

/**
 * Konstanta untuk background GIFs, digunakan untuk cycling background.
 * Konsisten dengan tema visual aplikasi.
 */
const backgroundGifs = ["/assets/background/host/9.webp"]

/**
 * Mapping warna mobil ke file GIF mobil untuk animasi player.
 */
const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1.webp?v=2",
  white: "/assets/car/car2.webp?v=2",
  black: "/assets/car/car3.webp?v=2",
  aqua: "/assets/car/car4.webp?v=2",
  blue: "/assets/car/car5.webp?v=2",
}

/**
 * Komponen utama HostMonitorPage.
 * Menampilkan monitoring real-time untuk game: timer, ranking player, dan kontrol end game.
 * Menggunakan inline rendering untuk memastikan audio selalu play dan DOM konsisten.
 */
export default function HostMonitorPage() {
  // Hooks navigasi dan params
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // State untuk data game
  const [players, setPlayers] = useState<any[]>([])
  const [room, setRoom] = useState<any>(null)
  const [roomId, setRoomId] = useState<string>("")
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0)
  const [gameDuration, setGameDuration] = useState(300)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)

  // State untuk UI dan audio
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  /**
   * useEffect: Redirect ke leaderboard jika game selesai.
   * Menggunakan delay kecil untuk memastikan DOM render sebelum redirect.
   */
  useEffect(() => {
    if (room?.status === "finished") {
      setTimeout(() => router.push(`/host/${roomCode}/leaderboard`), 500)
    }
  }, [room?.status, roomCode, router])

  /**
   * useEffect: Fetch data awal room dan players dari Supabase.
   */
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true)
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, settings, questions, start, status, end")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError)
        setLoading(false)
        return
      }

      setRoom(roomData)
      setRoomId(roomData.id)

      const questions = roomData.questions || []
      setTotalQuestions(questions.length)

      const settings = typeof roomData.settings === "string" ? JSON.parse(roomData.settings) : roomData.settings
      const duration = settings?.duration || 300
      setGameDuration(duration)

      if (roomData.status === "playing" && roomData.start) {
        setGameStartTime(new Date(roomData.start).getTime())
        const remaining = calculateRemainingTime(roomData.start, duration)
        setGameTimeRemaining(remaining)
      } else if (roomData.status === "finished") {
        setGameTimeRemaining(0)
        setGameStartTime(null)
      }

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, nickname, result, completion, car, joined_at")
        .eq("room_id", roomData.id)

      if (!playersError && playersData) {
        setPlayers(playersData)
      }

      setLoading(false)
    }

    if (roomCode) {
      fetchInitial()
    }
  }, [roomCode])

  /**
   * useEffect: Real-time subscription untuk update players dan room.
   * Auto-end game jika semua player selesai.
   */
  useEffect(() => {
    if (!roomId) return

    const subscription = supabase
      .channel(`host-monitor-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) => {
            const updatedPlayers = prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            const allCompleted = updatedPlayers.every((p) => p.completion === true)
            if (allCompleted && room?.status === "playing") {
              console.log("All players completed, ending game")
              endGame()
            }
            return updatedPlayers
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new
          setRoom(newRoom)
          if (newRoom.status === "finished") {
            setGameTimeRemaining(0)
            setGameStartTime(null)
          } else if (newRoom.status === "playing" && newRoom.start) {
            setGameStartTime(new Date(newRoom.start).getTime())
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [roomId, room?.status])

  /**
   * useEffect: Timer untuk game time menggunakan wall-time sync.
   * Auto-end game jika waktu habis.
   */
  useEffect(() => {
    if (!gameStartTime || room?.status !== "playing") return

    console.log("Starting wall-time timer for host monitor")

    const updateGameTime = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - gameStartTime) / 1000)
      const remaining = Math.max(0, gameDuration - elapsed)
      setGameTimeRemaining(remaining)

      if (remaining <= 0) {
        console.log("Host monitor time up, ending game")
        clearInterval(gameTimer)
        endGame()
      }
    }

    updateGameTime()
    const gameTimer = setInterval(updateGameTime, 1000)

    return () => {
      console.log("Cleaning up host monitor timer")
      clearInterval(gameTimer)
    }
  }, [gameStartTime, gameDuration, room?.status])

  /**
   * useEffect: Inisialisasi audio autoplay saat component mount.
   */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
      audioRef.current.play().catch((e) => {
        console.log("Autoplay dicegah oleh browser:", e)
      })
    }
  }, [])

  /**
   * useEffect: Handle audio setelah user gesture untuk bypass browser policy.
   */
  useEffect(() => {
    let isFirstInteraction = true

    const enableAudioOnInteraction = () => {
      if (isFirstInteraction && audioRef.current) {
        isFirstInteraction = false
        audioRef.current.volume = isMuted ? 0 : volume / 100
        audioRef.current.play().then(() => {
          console.log("Audio started after user interaction!")
        }).catch((e) => {
          console.log("Still blocked:", e)
        })
        document.removeEventListener("click", enableAudioOnInteraction)
        document.removeEventListener("scroll", enableAudioOnInteraction)
        document.removeEventListener("keydown", enableAudioOnInteraction)
      }
    }

    document.addEventListener("click", enableAudioOnInteraction)
    document.addEventListener("scroll", enableAudioOnInteraction)
    document.addEventListener("keydown", enableAudioOnInteraction)

    return () => {
      document.removeEventListener("click", enableAudioOnInteraction)
      document.removeEventListener("scroll", enableAudioOnInteraction)
      document.removeEventListener("keydown", enableAudioOnInteraction)
    }
  }, [isMuted, volume])

  /**
   * useEffect: Update volume audio saat state berubah.
   */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  /**
   * useEffect: Cycling background GIF setiap 9 detik.
   */
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 9000)
    return () => clearInterval(bgInterval)
  }, [])

  /**
   * Handler: Toggle mute/unmute audio.
   */
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  /**
   * Handler: Update volume dari slider, auto unmute jika volume > 0.
   */
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (isMuted && value[0] > 0) {
      setIsMuted(false)
    }
  }

  /**
   * Handler: Akhiri game dan redirect ke leaderboard.
   * Set default result untuk player pasif.
   */
  const endGame = async () => {
    const endTime = new Date().toISOString()
    const { error: roomError } = await supabase
      .from("game_rooms")
      .update({ status: "finished", end: endTime })
      .eq("id", roomId)

    if (roomError) {
      console.error("Error ending game:", roomError)
      return
    }

    const defaultResult = {
      score: 0,
      correct: 0,
      accuracy: "0",
      duration: gameDuration,
      current_question: 1,
      total_question: totalQuestions,
      answers: new Array(totalQuestions).fill(null),
    }

    const { error: playerError, count: updatedCount } = await supabase
      .from("players")
      .update({ result: [defaultResult], completion: true })
      .eq("room_id", roomId)
      .eq("completion", false)

    if (playerError) {
      console.error("Error completing passive players:", playerError)
    } else {
      console.log(`Auto-completed ${updatedCount || 0} passive players with default results`)
    }

    console.log("Game ended successfully")
    router.push(`/host/${roomCode}/leaderboard`)
  }

  /**
   * Memo: Sort players berdasarkan progress untuk ranking.
   */
  const sortedPlayers = useMemo(() => {
    return sortPlayersByProgress(players)
  }, [players])

  /**
   * Helper: Ikon ranking berdasarkan posisi.
   */
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-400" />
      case 1:
        return <Award className="w-5 h-5 text-gray-300" />
      case 2:
        return <Award className="w-5 h-5 text-orange-400" />
      default:
        return <span className="text-sm font-bold">#{rank + 1}</span>
    }
  }

  /**
   * Helper: Warna timer berdasarkan waktu tersisa.
   */
  const getTimeColor = () => {
    if (gameTimeRemaining <= 30) return "text-red-500 animate-pulse"
    if (gameTimeRemaining <= 60) return "text-[#ff6bff] glow-pink-subtle"
    return "text-[#00ffff] glow-cyan"
  }

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      {/* Background GIF */}
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

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src="/assets/music/robbers.mp3"
        loop
        preload="auto"
        className="hidden"
      />

      {/* Loading Overlay */}
      {loading && <LoadingRetro />}

      {/* Fixed Elements: Burger, Logo, Title */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-4 right-4 z-40 p-3 bg-[#ff6bff]/80 border-2 border-white pixel-button hover:bg-[#ff8aff]/90 glow-pink rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      <h1 className="absolute top-5 right-20 hidden md:block">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={64}
        />
      </h1>

      <h1 className="absolute top-7 left-10 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 z-30 w-64 bg-[#1a0a2a]/90 border border-[#ff6bff]/50 rounded-lg p-4 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white pixel-text">Audio</span>
                <button
                  onClick={handleMuteToggle}
                  className="p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan rounded"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-[#ff6bff] pixel-text">Volume</span>
                <div className="bg-[#1a0a2a]/60 border border-[#ff6bff]/50 rounded px-2 py-1">
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                    orientation="horizontal"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {!loading && (
        <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center pb-4 sm:pb-5"
          >
            <div className="inline-block p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan">
                Monitoring
              </h1>
            </div>
          </motion.div>

          {/* Game Timer dan Controls */}
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card px-6 py-4 mb-4 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between space-x-6">
              <div className="flex items-center space-x-4">
                <Clock className={`w-8 h-8 ${getTimeColor()}`} />
                <div>
                  <div className={`text-2xl font-bold ${getTimeColor()} pixel-text`}>
                    {formatTime(gameTimeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={endGame}
                  className="bg-red-500 hover:bg-red-600 pixel-button glow-red flex items-center space-x-2"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>End Game</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Player Rankings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card p-4 md:p-6 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {sortedPlayers.map((player, index) => {
                    const result = player.result?.[0] || {}
                    const progress = result.current_question || 0
                    const isCompleted = player.completion
                    const currentlyAnswering = progress > 0 && !isCompleted && progress < totalQuestions

                    return (
                      <motion.div
                        key={player.id}
                        layoutId={player.id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.6 }}
                        whileHover={{ scale: 1.05 }}
                        className={`group ${currentlyAnswering ? "glow-cyan animate-neon-pulse" : "glow-pink-subtle"}`}
                      >
                        <Card
                          className={`p-3 bg-[#1a0a2a]/50 border-2 border-double transition-all duration-300 h-full gap-4 ${
                            currentlyAnswering
                              ? "border-[#00ffff]/70 bg-[#00ffff]/10"
                              : isCompleted
                              ? "border-[#00ff00]/70 bg-[#00ff00]/10"
                              : "border-[#ff6bff]/70"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="flex items-center justify-between space-x-2 w-full">
                              {getRankIcon(index)}
                              <Badge>
                                {progress}/{totalQuestions}
                              </Badge>
                            </div>
                          </div>
                        <div className="relative mb-3">
                          <img
                            src={carGifMap[player.car] || '/assets/car/car5.webp?v=2'}
                            alt={`${player.car} car`}
                            className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        </div>

                        {/* Player Info */}
                        <div className="text-center">
                          <h3 className="text-white pixel-text text-sm leading-tight w-full mb-2 break-words line-clamp-2">
                            {breakOnCaps(player.nickname)}
                          </h3>

                          {/* Progress Bar */}
                          <Progress
                            value={(progress / totalQuestions) * 100}
                            className={`h-2 bg-[#1a0a2a]/50 border border-[#00ffff]/30 mb-2 ${isCompleted ? "bg-green-500/20" : ""
                              }`}
                          />
                          <div className="text-center">
                            <h3 className="text-white pixel-text text-sm leading-tight mb-2">
                              {player.nickname}
                            </h3>
                            <Progress
                              value={(progress / totalQuestions) * 100}
                              className={`h-2 bg-[#1a0a2a]/50 border border-[#00ffff]/30 mb-2 ${isCompleted ? "bg-green-500/20" : ""}`}
                            />
                          </div>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
              {sortedPlayers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No players in the game yet...</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      )}

      {/* Inline Styles */}
      <style jsx>{`
        .pixel-font {
          font-family: "Press Start 2P", cursive, monospace;
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
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3);
        }
        .glow-cyan {
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-pink-subtle {
          animation: neon-pulse-pink 2s ease-in-out infinite;
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-red {
          filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.8));
        }
        @keyframes neon-pulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8);
          }
        }
        @keyframes neon-pulse-pink {
          0%, 100% {
            box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8);
          }
        }
        @keyframes neon-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}
