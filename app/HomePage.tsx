"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Flag, Volume2, VolumeX, Settings, Users, Menu, X, BookOpen, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [joining, setJoining] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50) // 0-100, default 50%
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const [showHowToPlay, setShowHowToPlay] = useState(false) // State untuk modal How to Play
  const [currentPage, setCurrentPage] = useState(0) // State untuk pagination
  
  // Tambahkan array untuk generate nama random (di luar component atau di dalam)
const adjectives = ["Crazy", "Fast", "Speedy", "Turbo", "Neon", "Pixel", "Racing", "Wild", "Epic", "Flash"];
const nouns = ["Racer", "Driver", "Speedster", "Bolt", "Dash", "Zoom", "Nitro", "Gear", "Track", "Lap"];

// Function untuk generate nickname otomatis
  const generateNickname = () => {
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdj}${randomNoun}`;
};

  

  const steps = [
    {
      title: "Host a Game",
      content: "Click 'HOST GAME' to create a room and get a unique code. Share it with your friends to start the challenge!"
    },
    {
      title: "Join the Race",
      content: "Enter the room code and your nickname in 'JOIN RACE'. Hit JOIN to hop into the action and pick your car color."
    },
    {
      title: "Answer Questions",
      content: "When the race kicks off, trivia questions pop up. Nail the answers right to zoom your car forward on the track."
    },
    {
      title: "Race to Win",
      content: "Speed to the finish line! The first player to answer the most questions correctly claims victory and bragging rights."
    },
    {
      title: "Pro Tip",
      content: "Pick a killer nickname and strategize: go for lightning-fast answers or laser-focused accuracy? Your call!"
    }
  ]

  const totalPages = steps.length

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    localStorage.removeItem("nickname")
    localStorage.removeItem("playerId")
  }, [])

  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setRoomCode(code.toUpperCase())
      // hapus query string
      router.replace(pathname, undefined) // <--- ini otomatis bersih
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleJoin = async () => {
    if (!roomCode || !nickname || joining) return;
    setJoining(true);

    try {
      // Verify room exists
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, status")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error: Room not found", roomError)
        setJoining(false)
        return
      }

      // Check if room is in 'waiting' status
      if (roomData.status !== "waiting") {
        console.error("Error: Room is not accepting players")
        setJoining(false)
        return
      }

      // Insert player
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          nickname,
          car: ["red", "blue", "green", "yellow", "purple", "orange"][Math.floor(Math.random() * 6)]
        })

      if (playerError) {
        console.error("Error joining room:", playerError)
        setJoining(false)
        return
      }

      // Store nickname in localStorage
      localStorage.setItem("nickname", nickname)

      // Navigate to game page
      router.push(`/join/${roomCode}`)
    } catch (error) {
      console.error("Unexpected error:", error)
      setJoining(false)
    }
  }

  const closeHowToPlay = () => {
    setShowHowToPlay(false)
    setCurrentPage(0) // Reset to first page
  }

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const goToNextPage = () => {
    if (currentPage === totalPages - 1) {
      closeHowToPlay()
    } else {
      setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
    }
  }

  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex)
  }

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden pixel-font p-2">
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/gif/1.gif/')" }}
      />

      {/* CRT Monitor Effect */}
      <div className="crt-effect"></div>

      {/* Static Noise */}
      <div className="noise-effect"></div>

      {/* Purple Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

      {/* Burger Menu Button - Fixed Top Right */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 right-4 z-40 p-3 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      {/* Menu Dropdown - Muncul saat burger diklik, dari kanan */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-20 right-4 z-30 w-64 bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-lg p-4 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm scrollbar-themed"
        >
          <div className="space-y-4">
            {/* Mute Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white pixel-text">Audio</span>
              <button
                onClick={handleMuteToggle}
                className="p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2">
              <span className="text-xs text-[#ff6bff] pixel-text glow-pink-subtle">Volume</span>
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

            {/* How to Play Button */}
            <button 
              onClick={() => {
                setShowHowToPlay(true)
                setIsMenuOpen(false) // Tutup menu saat buka modal
              }}
              className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
              aria-label="How to Play"
            >
              <div className="flex items-center justify-center gap-2">
                <BookOpen size={16} />
                <span className="text-sm text-[#00ffff] pixel-text glow-cyan">How to Play</span>
              </div>
            </button>

            {/* Settings Button */}
            <button 
              className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded text-center"
              aria-label="Settings"
            >
              <div className="flex items-center justify-center gap-2">
                <Settings size={16} />
                <span className="text-sm text-[#00ffff] pixel-text glow-cyan">Settings</span>
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeHowToPlay} // Tutup saat klik luar
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => e.stopPropagation()} // Cegah tutup saat klik modal
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-2xl shadow-2xl shadow-[#ff6bff]/40 backdrop-blur-md pixel-card scrollbar-themed book-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <CardHeader className="text-center border-b-2 border-[#ff6bff]/20 p-6">
              <CardTitle className="text-2xl font-bold text-[#00ffff] pixel-text glow-cyan mb-2">
                Crazy Race Guide
              </CardTitle>
              <CardDescription className="text-[#ff6bff]/80 text-base pixel-text glow-pink-subtle">
                Flip through the pages to learn how to race and win!
              </CardDescription>
              <p className="text-xs text-gray-200 mt-2 pixel-text">Page {currentPage + 1} of {totalPages}</p>
            </CardHeader>

            {/* Paginated Content */}
            <div className="flex-1 p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ x: currentPage > 0 ? "100%" : "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: currentPage > 0 ? "-100%" : "100%", opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="h-full flex flex-col justify-center book-page"
                >
                  <div className="text-center mb-6">
                    <motion.div
            
                    >
                  
                    </motion.div>
                    <h3 className="text-xl font-bold text-[#00ffff] mb-4 pixel-text glow-cyan">
                      {steps[currentPage].title}
                    </h3>
                  </div>
                  <p className="text-gray-200 leading-relaxed pixel-text text-center max-w-md mx-auto line-clamp-3">
                    {steps[currentPage].content}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[#ff6bff] text-sm pixel-text glow-pink-subtle mt-4">
                    
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Footer */}
            <CardFooter className="border-t-2 border-[#ff6bff]/20 p-4 bg-[#1a0a2a]/50">
              <div className="w-full flex items-center justify-between">
                {/* Prev Button */}
                <Button
                  onClick={goToPrevPage}
                  disabled={currentPage === 0}
                  className={`flex items-center gap-2 px-4 py-2 bg-[#1a0a2a]/60 hover:bg-[#00ffff]/20 border-2 border-[#00ffff]/50 text-[#00ffff] pixel-button glow-cyan-subtle transition-all duration-200 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ArrowLeft size={16} />
                  Prev
                </Button>

{/* Page Dots */}
                <div className="flex space-x-2">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToPage(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentPage
                          ? 'bg-[#a100ff] shadow-md shadow-[#a100ff]/50 scale-110'
                          : 'bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Next / Got It Button */}
                <Button
                  onClick={goToNextPage}
                  className={`flex items-center gap-2 px-4 py-2 bg-[#1a0a2a]/60 hover:bg-[#ff6bff]/20 border-2 border-[#ff6bff]/50 text-[#ff6bff] pixel-button glow-pink-subtle transition-all duration-200`}
                >
                  {currentPage === totalPages - 1 ? (
                    <>
                      Got It!
                      <BookOpen size={16} />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>

            {/* Close Button */}
            <button
              onClick={closeHowToPlay}
              className="absolute top-3 right-3 p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 rounded-lg text-[#00ffff] hover:bg-[#ff6bff]/20 hover:border-[#ff6bff] transition-all duration-200 glow-cyan-subtle"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full"> {/* pt-20 untuk ruang burger */}
        {/* Main Title dengan efek pixel art */}
        <div className="text-center relative pb-5 sm:pt-3 pt-16 space-y-3">
          {/* Title Border */}
          <div className="pixel-border-large mx-auto" >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-white pixel-text-outline">
              CRAZY
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] pixel-text">
              RACE
            </h2>
          </div>

          {/* Subtitle dengan pixel border */}
          <div className="pixel-border-small inline-block">
            <p className="text-sm md:text-base text-purple px-4 py-2 bg-[#1a0a2a] pixel-text">
              ANSWER • RACE • WIN
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="
        grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full px-4
        sm:grid-rows-1 grid-rows-2 sm:grid-flow-row grid-flow-dense
        max-sm:[grid-template-areas:'join'_'host']">
          {/* Host Game Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:host]"
          >
            <Link href="/host">
              <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 hover:border-[#ff6bff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(255,107,255,0.3)] pixel-card">
                <CardHeader className="text-center">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-[#ff6bff] to-[#1a0a2a] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_15px_rgba(255,107,255,0.7)] transition-all duration-300"
                    whileHover={{ rotate: 5 }}
                  >
                    <Flag className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-xl font-bold text-[#ff6bff] pixel-text glow-pink">
                    HOST GAME
                  </CardTitle>
                  <CardDescription className="text-[#ff6bff]/80 text-sm pixel-text glow-pink-subtle">
                    Create your own race and challenge others
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-[#ff6bff] to-[#d400ff] hover:from-[#ff8aff] hover:to-[#e633ff] text-white border-2 border-[#ff6bff] pixel-button-large retro-button glow-pink">
                    Create Room
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Join Race Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:join]"
          >
            <Card className="bg-[#1a0a2a]/40 border-[#00ffff]/50 hover:border-[#00ffff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(0,255,255,0.3)] pixel-card">
              <CardHeader className="text-center">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#00ffff] to-[#1a0a2a] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] transition-all duration-300"
                  whileHover={{ rotate: -5 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-bold text-[#00ffff] pixel-text glow-cyan">
                  JOIN RACE
                </CardTitle>
                <CardDescription className="text-[#00ffff]/80 text-sm pixel-text glow-cyan-subtle">
                  Enter a code to join an existing race
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
<Input
    placeholder="Room Code"
    value={roomCode}
    maxLength={6}
    onChange={(e) => {
      const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      setRoomCode(value);
    }}
    className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30"
    aria-label="Room Code"
  />
  <div className="relative">
    <Input
      placeholder="Nickname"
      value={nickname}
      maxLength={26}
      onChange={(e) => setNickname(e.target.value)}
      className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30 pr-10"
      aria-label="Nickname"
    />
    <button
      type="button"
      onClick={() => setNickname(generateNickname())}
      className="absolute right-2 top-1/8  text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff] transition-all duration-200 glow-cyan-subtle"
      aria-label="Generate Nickname"
    >
      <span className="text-lg">🎲</span>
    </button>
  </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  className={`w-full bg-gradient-to-r from-[#00ffff] to-[#0099cc] hover:from-[#33ffff] hover:to-[#00aadd] text-white border-2 border-[#00ffff] pixel-button-large retro-button glow-cyan ${!roomCode || !nickname ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={roomCode.length !== 6 || !nickname || joining}
                >
                  JOIN
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Pixel Art Decoration */}
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

        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 opacity-30">
          <div className="w-6 h-6 border-2 border-[#00ffff]"></div>
        </div>
        <div className="absolute top-4 right-4 opacity-30">
          <div className="w-6 h-6 border-2 border-[#ff6bff]"></div>
        </div>
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

          .pixel-text-outline {
            color: white;
            text-shadow: 
              3px 0px 0px #000,
              -3px 0px 0px #000,
              0px 3px 0px #000,
              0px -3px 0px #000,
              2px 2px 0px #000,
              -2px -2px 0px #000;
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

          .pixel-button-large {
            image-rendering: pixelated;
            box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8);
            transition: all 0.1s ease;
          }

          .pixel-button-large:hover {
            transform: translate(3px, 3px);
            box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
          }

          .retro-button {
            position: relative;
            padding: 12px;
            font-size: 1.1rem;
            text-transform: uppercase;
            image-rendering: pixelated;
            border-radius: 8px;
            transition: all 0.2s ease;
            animation: pulse-retro 1.5s ease-in-out infinite;
          }

          .retro-button:hover {
            transform: scale(1.05);
            box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 107, 255, 0.6);
            filter: brightness(1.2);
          }

          .pixel-border-large {
            border: 4px solid #00ffff;
            position: relative;
            background: linear-gradient(45deg, #1a0a2a, #2d1b69);
            padding: 2rem;
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

          .pixel-border-small {
            border: 2px solid #ffff00;
            background: #1a0a2a;
            box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
          }

          .pixel-card {
            box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
            transition: all 0.2s ease;
          }

          .pixel-card:hover {
            box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4);
          }

          .book-modal {
            box-shadow: 
              0 25px 50px -12px rgba(0, 0, 0, 0.8),
              0 0 0 1px rgba(255, 107, 255, 0.2),
              inset 0 0 0 1px rgba(255, 255, 255, 0.1);
          }

          .book-page {
            background: linear-gradient(135deg, #2d1b69 0%, #1a0a2a 100%);
            border-radius: 12px;
            padding: 2rem;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(255, 107, 255, 0.1);
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
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E");
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

          @keyframes pulse-retro {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }

          /* Themed Scrollbar */
          .scrollbar-themed::-webkit-scrollbar {
            width: 8px;
          }

          .scrollbar-themed::-webkit-scrollbar-track {
            background: linear-gradient(to bottom, #1a0a2a, #2d1b69);
            border: 1px solid rgba(255, 107, 255, 0.3);
            border-radius: 4px;
            box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
          }

          .scrollbar-themed::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #ff6bff, #00ffff);
            border-radius: 4px;
            border: 2px solid #1a0a2a;
            box-shadow: 
              0 0 8px rgba(255, 107, 255, 0.6),
              inset 0 0 4px rgba(255, 255, 255, 0.2);
            animation: glow-scrollbar 2s ease-in-out infinite alternate;
          }

          .scrollbar-themed::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #ff8aff, #33ffff);
            box-shadow: 
              0 0 12px rgba(0, 255, 255, 0.8),
              inset 0 0 4px rgba(255, 255, 255, 0.3);
          }

          @keyframes glow-scrollbar {
            0% { 
              box-shadow: 
                0 0 8px rgba(255, 107, 255, 0.6),
                inset 0 0 4px rgba(255, 255, 255, 0.2);
            }
            100% { 
              box-shadow: 
                0 0 12px rgba(0, 255, 255, 0.6),
                inset 0 0 4px rgba(255, 255, 255, 0.4);
            }
          }

          /* Firefox scrollbar styling */
          .scrollbar-themed {
            scrollbar-width: thin;
            scrollbar-color: #ff6bff #1a0a2a;
          }

          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .pixel-border-large {
              padding: 1rem;
            }
            
            .pixel-button-large {
              padding: 1rem 1.5rem;
              font-size: 0.9rem;
            }

            .retro-button {
              padding: 10px;
              font-size: 0.9rem;
            }

            /* Kontrol mobile lebih besar */
            .pixel-button {
              min-width: 52px;
              min-height: 52px;
            }

            .book-modal {
              max-w-full max-h-[95vh];
            }
          }
            
        `}</style>
    </div>
  )
}