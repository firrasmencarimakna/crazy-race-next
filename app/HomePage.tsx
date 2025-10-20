"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Flag, Volume2, VolumeX, Settings, Users, Menu, X, BookOpen, ArrowLeft, ArrowRight, Play, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { usePreloaderScreen } from "@/components/preloader-screen"
import LoadingRetro from "@/components/loadingRetro"
import LoadingRetroScreen from "@/components/loading-screnn"
import { useAuth } from "@/contexts/authContext"

/**
 * HomePage Component
 * Halaman utama aplikasi Crazy Race, berisi tombol Host Game, Join Race,
 * menu burger untuk audio settings, How to Play modal, dan Solo Tryout.
 * Mengintegrasikan validasi input dengan modal alert spesifik berdasarkan field kosong.
 */
export default function HomePage() {
  // Hooks untuk navigasi dan query params
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const { user, loading: authLoading } = useAuth()

  if (!authLoading && !user) {
    const codeFromParams = searchParams.get('code') || ''
    router.replace(`/auth/login?code=${codeFromParams}`)
    return null
  }

  // State untuk loading dan joining process
  const [joining, setJoining] = useState(false)

  // State untuk audio controls
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50) // 0-100, default 50%

  // State untuk input fields
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")

  // State untuk UI modals dan menu
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Toggle menu burger
  const [showHowToPlay, setShowHowToPlay] = useState(false) // Modal How to Play
  const [currentPage, setCurrentPage] = useState(0) // Pagination untuk modal How to Play
  const [showTryoutInput, setShowTryoutInput] = useState(false) // Toggle tryout input visibility

  // State untuk modal alert (spesifik berdasarkan reason)
  const [showAlert, setShowAlert] = useState(false)
  const [alertReason, setAlertReason] = useState<'roomCode' | 'nickname' | 'both' | 'general' | 'roomNotFound' | ''>('')

  // Refs untuk audio elements
  const audioRef = useRef<HTMLAudioElement>(null) // Background music
  const alertAudioRef = useRef<HTMLAudioElement>(null) // Alert sound (gas.mp3)

  // Arrays untuk generate random nickname
  const adjectives = ["Crazy", "Fast", "Speedy", "Turbo", "Neon", "Pixel", "Racing", "Wild", "Epic", "Flash"]
  const nouns = ["Racer", "Driver", "Speedster", "Bolt", "Dash", "Zoom", "Nitro", "Gear", "Track", "Lap"]

  /**
   * Generate random nickname menggunakan adjectives + nouns.
   * @returns {string} Nickname acak, e.g., "CrazyRacer"
   */
  const generateNickname = () => {
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${randomAdj}${randomNoun}`
  }

  /**
   * Helper function untuk pesan alert dinamis berdasarkan reason.
   * @param {string} reason - Alasan trigger alert ('roomCode', 'nickname', 'both', dll.)
   * @returns {string} Pesan yang sesuai untuk CardDescription
   */
  const getAlertMessage = (reason: string) => {
    switch (reason) {
      case 'roomCode':
        return "The room code must be 6 letters."
      case 'nickname':
        return "The name cannot be blank, okay!"
      case 'both':
        return "Fill in the Room Code (6 letters) and Nickname first, OK!"
      case 'roomNotFound':
        return "Your room code is wrong"
      default:
        return "Fill in the Room Code (6 letters) and Nickname first, OK!"
    }
  }

  /**
   * Close modal alert dan reset reason.
   */
  const closeAlert = () => {
    setShowAlert(false)
    setAlertReason('')
  }

  // Steps untuk modal How to Play (pagination content)
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

  // useEffect: Clear localStorage on mount (reset session data)
  useEffect(() => {
    localStorage.removeItem("nickname")
    localStorage.removeItem("playerId")
    localStorage.removeItem("nextQuestionIndex")

    if (user?.email) {
      const usernameFromEmail = user.email.split('@')[0] // e.g., "muhammadhuda537" dari "muhammadhuda537@gmail.com"
      setNickname(usernameFromEmail)
      // Optional: Simpan ke localStorage biar persist kalau perlu
      localStorage.setItem("nickname", usernameFromEmail)
    } else {
      // Fallback ke random kalau gak ada email (rare)
      const randomNick = generateNickname()
      setNickname(randomNick)
      localStorage.setItem("nickname", randomNick)
    }
  }, [user])

  // useEffect: Auto-fill roomCode dari URL query param (?code=ABC123)
  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setRoomCode(code.toUpperCase())
      router.replace(pathname, undefined) // Clear query param dari URL
    }
  }, [searchParams, pathname, router])

  // useEffect: Inisialisasi background audio (autoplay dengan volume default)
  useEffect(() => {
    if (audioRef.current) {
      const initialVolume = volume / 100
      audioRef.current.volume = isMuted ? 0 : initialVolume
      audioRef.current.play().catch((e) => {
        console.log("Autoplay dicegah oleh browser:", e)
      })
    }
  }, []) // Run sekali on mount

  // useEffect: Update volume background audio saat volume/mute berubah
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : (volume / 100)
    }
  }, [volume, isMuted])

  /**
   * Toggle mute/unmute audio.
   */
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  /**
   * Handle perubahan volume slider.
   * @param {number[]} value - Array dari slider value [currentValue]
   */
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (isMuted && value[0] > 0) {
      setIsMuted(false) // Auto unmute jika volume dinaikkan dari 0
    }
  }

  /**
   * Handle join race: Validasi input, insert player ke Supabase, navigasi ke lobby.
   */
  const handleJoin = async () => {
    // Deteksi reason untuk alert spesifik
    let reason: '' | 'roomCode' | 'nickname' | 'both' | 'general' = ''
    if (roomCode.length !== 6) {
      reason = 'roomCode'
    }
    if (!nickname.trim()) {
      reason = reason ? 'both' : 'nickname'
    }
    if (joining || reason) {
      console.log("Trigger alert:", reason || 'general')
      setAlertReason(reason || 'general')
      setShowAlert(true)
      // Play alert audio jika tidak muted
      if (alertAudioRef.current && !isMuted) {
        alertAudioRef.current.volume = volume / 100
        alertAudioRef.current.currentTime = 0 // Reset untuk replay
        alertAudioRef.current.play().catch((e) => console.log("Audio error:", e))
      }
      return // Stop proses join
    }

    setJoining(true) // Mulai loading

    try {
      // Verify room exists dan status 'waiting'
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, status")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error: Room not found", roomError)
        setJoining(false)
        setAlertReason('roomNotFound')
        setShowAlert(true)
        // Play alert audio jika tidak muted
        if (alertAudioRef.current && !isMuted) {
          alertAudioRef.current.volume = volume / 100
          alertAudioRef.current.currentTime = 0 // Reset untuk replay
          alertAudioRef.current.play().catch((e) => console.log("Audio error:", e))
        }
        return
      }

      if (roomData.status !== "waiting") {
        console.error("Error: Room is not accepting players")
        setJoining(false)
        // Opsional: Bisa tambah alert lain untuk status room (misal 'roomInProgress'), tapi sementara return aja
        return
      }

      // Insert player ke tabel players
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          nickname: nickname.trim(), // Trim whitespace
          car: ["purple", "white", "black", "aqua", "blue"][Math.floor(Math.random() * 5)]
        })

      if (playerError) {
        console.error("Error joining room:", playerError)
        setJoining(false)
        return
      }

      // Simpan nickname di localStorage untuk session
      localStorage.setItem("nickname", nickname.trim())

      // Navigasi ke lobby page
      router.push(`/join/${roomCode}`)
    } catch (error) {
      console.error("Unexpected error:", error)
      setJoining(false)
    }
  }

  /**
   * Handle solo tryout: Validasi nickname, simpan ke localStorage, navigasi ke tryout page.
   */
  const handleTryout = () => {
    if (!nickname.trim() || joining) {
      console.log("Trigger tryout alert: nickname empty")
      setAlertReason('nickname')
      setShowAlert(true)
      // Play alert audio jika tidak muted
      if (alertAudioRef.current && !isMuted) {
        alertAudioRef.current.volume = volume / 100
        alertAudioRef.current.currentTime = 0
        alertAudioRef.current.play().catch((e) => console.log("Audio error:", e))
      }
      return
    }
    setJoining(true)
    // Simpan khusus untuk tryout mode
    localStorage.setItem('tryout_nickname', nickname.trim())
    localStorage.setItem('tryout_mode', 'solo')
    router.push('/tryout')
  }

  /**
   * Handle logout: Sign out from Supabase and refresh.
   */
  const handleLogout = async () => {
    setIsMenuOpen(false)
    await supabase.auth.signOut()
    router.refresh()
  }

  // Preload check: Tampilkan loading jika belum siap
  const { isLoaded, progress } = usePreloaderScreen()
  if (!isLoaded) return <LoadingRetroScreen progress={progress} />

  // Functions untuk modal How to Play
  const closeHowToPlay = () => {
    setShowHowToPlay(false)
    setCurrentPage(0) // Reset pagination
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
    <div className={`min-h-[100dvh] w-full relative overflow-hidden pixel-font ${isLoaded ? 'p-2' : ''}`}>
      {/* Background Music Audio (hidden) */}
      <audio
        ref={audioRef}
        src="/assets/music/resonance.mp3"
        loop
        preload="auto"
        className="hidden"
      />

      {/* Background Image (full viewport) */}
      <Image
        src="/assets/background/1.webp"
        alt="Crazy Race Background"
        fill
        className="object-cover"
        priority // Preload untuk performa
        style={{ objectPosition: 'center' }}
      />

      <h1 className="absolute top-6 md:top-4 left-4 w-42 md:w-50 lg:w-100">
        <Image src="/gameforsmartlogo.webp" alt="Gameforsmart Logo" width="256" height="64" priority />
      </h1>

      {/* Alert Audio (hidden, untuk efek suara) */}
      {/* <audio
        ref={alertAudioRef}
        src="/assets/music/gas.mp3"
        preload="auto"
        className="hidden"
      /> */}

      {/* Modal Alert: Tampil jika showAlert true, dengan pesan dinamis berdasarkan alertReason */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeAlert} // Close on backdrop click
          >
            {/* Backdrop (semi-transparent blur) */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()} // Prevent close on modal click
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md max-h-[70vh] overflow-hidden bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-2xl shadow-2xl shadow-[#ff6bff]/40 backdrop-blur-md pixel-card text-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Alert Car GIF */}
              <div className="mb-4">
                <Image
                  src="/assets/car/car3.webp?v=2"
                  alt="Car alert animation"
                  width={200}
                  height={150}
                  className="mx-auto rounded-lg"
                />
              </div>

              {/* Dynamic Title berdasarkan reason */}
              <CardTitle className="text-xl font-bold text-[#ff6bff] mb-2 pixel-text glow-pink">
                {alertReason === 'roomCode' ? 'Oops! Your Room Code!' :
                  alertReason === 'nickname' ? 'Oops! Empty name!' :
                    alertReason === 'both' ? 'Oops! Input Incomplete!' :
                      alertReason === 'roomNotFound' ? 'Oops Room not found!' : 'Oops Belum Siap Balapan'}
              </CardTitle>

              {/* Dynamic Description */}
              <CardDescription className="text-[#00ffff]/80 mb-6 pixel-text glow-cyan-subtle">
                {getAlertMessage(alertReason)}
              </CardDescription>

              {/* Close Button */}
              <Button
                onClick={closeAlert}
                className="w-full bg-gradient-to-r from-[#ff6bff] to-[#ff6bff] hover:from-[#ff8aff] text-white pixel-button glow-pink"
              >
                Okay!
              </Button>

              {/* Close Icon (top-right) */}
              <button
                onClick={closeAlert}
                className="absolute top-3 right-3 p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 rounded-lg text-[#00ffff] hover:bg-[#ff6bff]/20 glow-cyan-subtle"
                aria-label="Close alert"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Burger Menu Button (fixed top-right) */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-4 right-4 z-40 p-3 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      {/* Burger Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 z-30 w-64 bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-lg p-4 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm scrollbar-themed max-h-[70vh] overflow-y-auto"
          >
            <div className="space-y-4">
              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                {/* <span className="text-sm text-white pixel-text">Audio</span> */}

              </div>

              {/* Volume Slider */}
              {/* <div className="space-y-2"> */}
              {/* <span className="text-xs text-[#ff6bff] pixel-text glow-pink-subtle">Volume</span> */}
              {/* <div className="bg-[#1a0a2a]/60 border border-[#ff6bff]/50 rounded px-2 py-1 display flex gap-2">
                <button
                  onClick={handleMuteToggle}
                  className="p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
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
              </div> */}

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
                  {/* <BookOpen size={16} /> */}
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">How to Play</span>
                </div>
              </button>

              {/* Solo Tryout Button */}
              <button
                onClick={() => setShowTryoutInput(!showTryoutInput)}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="Solo Tryout"
              >
                <div className="flex items-center justify-center gap-2">
                  {/* <Play size={16} /> */}
                  <span className="text-sm text-[#ff6bff] pixel-text glow-pink">Solo Tryout</span>
                </div>
              </button>

              {/* Solo Tryout Input (conditional) */}
              <AnimatePresence>
                {showTryoutInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="relative">
                      <Input
                        placeholder="Nickname"
                        value={nickname}
                        maxLength={26}
                        onChange={(e) => setNickname(e.target.value)}
                        className="bg-[#1a0a2a]/50 border-[#ff6bff]/50 text-[#ff6bff] placeholder:text-[#ff6bff]/50 text-center text-xs pixel-text h-8 rounded focus:border-[#ff6bff] focus:ring-[#ff6bff]/30 pr-8"
                        aria-label="Tryout Nickname"
                      />
                      <button
                        type="button"
                        onClick={() => setNickname(generateNickname())}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-[#ff6bff] hover:bg-[#ff6bff]/20 hover:border-[#ff6bff] transition-all duration-200 glow-pink-subtle p-1"
                        aria-label="Generate Nickname"
                      >
                        <span className="text-sm">🎲</span>
                      </button>
                    </div>
                    <Button
                      onClick={() => {
                        handleTryout()
                        setIsMenuOpen(false) // Tutup menu setelah start
                      }}
                      disabled={joining}
                      className={`w-full text-xs ${joining
                        ? 'opacity-50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#ff6bff] to-[#ff6bff] hover:from-[#ff8aff] hover:to-[#ffb3ff] text-white border-[#ff6bff]/80 hover:border-[#ff8aff]/80 glow-pink cursor-pointer'
                        } pixel-button`}
                    >
                      {joining ? 'STARTING...' : 'TRYOUT'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Settings Button (placeholder, bisa di-expand) */}
              <button
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded text-center"
                aria-label="Settings"
              >
                <div className="flex items-center justify-center gap-2">
                  {/* <Settings size={16} /> */}
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">Language</span>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="Logout"
              >
                <div className="flex items-center justify-center gap-2">
                  {/* <LogOut size={16} /> */}
                  <span className="text-sm text-[#ff0000] pixel-text glow-pink">Logout</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How to Play Modal (paginated guide) */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeHowToPlay} // Close on backdrop click
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => e.stopPropagation()} // Prevent close on modal click
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
                      <h3 className="text-xl font-bold text-[#00ffff] mb-4 pixel-text glow-cyan">
                        {steps[currentPage].title}
                      </h3>
                    </div>
                    <p className="text-gray-200 leading-relaxed pixel-text text-center max-w-md mx-auto line-clamp-3">
                      {steps[currentPage].content}
                    </p>
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
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentPage
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

              {/* Close Button (top-right) */}
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
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        {/* Main Title dengan efek pixel art */}
        <div className="text-center relative pb-5 sm:pt-3 pt-16 space-y-3">
          {/* Title Border */}
          <div className="pixel-border-large mx-auto relative z-0">
            <h1 className="font-bold bg-clip-text text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] tracking-wider drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]">
              CRAZY
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] relative z-10">
              RACE
            </h2>
          </div>

          {/* Subtitle dengan pixel border */}
          <div
            className="pixel-border-small inline-block"
            style={{
              border: '2px solid #ff6bff',
              boxShadow: '0 0 10px #ff6bff, 0 0 20px #ff6bff',
              borderRadius: '4px'
            }}
          >
            <p className="text-sm md:text-base px-4 py-2 bg-[#1a0a2a] text-white">
              ANSWER • RACE • WIN
            </p>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full px-4 grid-rows-none sm:grid-flow-row grid-flow-dense max-sm:[grid-template-areas:'join'_'host']">
          {/* Host Game Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:host]"
          >
            <Card className="bg-[#1a0a2a]/70 border-[#00ffff]/70 hover:border-[#00ffff] transition-all duration-300 sm:h-full shadow-[0_0_15px_rgba(255,107,255,0.3)] pixel-card">
              <CardHeader className="text-center">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#00ffff] to-[#120512] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_15px_rgba(255,107,255,0.7)] transition-all duration-300"
                  whileHover={{ rotate: 5 }}
                >
                  <Flag className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-bold text-[#00ffff] pixel-text glow-pink">
                  HOST GAME
                </CardTitle>
                <CardDescription className="text-[#00ffff]/80 text-sm pixel-text glow-pink-subtle">
                  Create your own race and challenge others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/host">
                  <Button className="w-full bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white focus:ring-[#00ffff]/30 transition-all duration-200">
                    Create Room
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Join Race Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:join]"
          >
            <Card className="bg-[#1a0a2a]/70 border-[#00ffff]/70 hover:border-[#00ffff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(0,255,255,0.3)] pixel-card">
              <CardHeader className="text-center">
                {/* Icon dan Title */}
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#00ffff] to-[#1a0a2a] group-hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300"
                  whileHover={{ rotate: -5 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-bold text-[#00ffff] glow-cyan pixel-text">
                  JOIN RACE
                </CardTitle>
                <CardDescription className="text-sm text-[#00ffff]/80 glow-cyan-subtle pixel-text">
                  Enter a code to join an existing race
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* Room Code Input */}
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  maxLength={6}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
                    setRoomCode(value)
                  }}
                  className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30"
                  aria-label="Room Code"
                />
                {/* Nickname Input dengan generate button */}
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
                    className="absolute right-2 top-1/8 text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff] transition-all duration-200 glow-cyan-subtle"
                    aria-label="Generate Nickname"
                  >
                    <span className="text-lg">🎲</span>
                  </button>
                </div>
              </CardContent>

              {/* Action Button (Join) */}
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className={`w-full transition-all duration-300 ease-in-out pixel-button-large retro-button ${joining
                      ? 'opacity-50 cursor-not-allowed'
                      : `bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white border-[#0070f3]/80 hover:border-[#0ea5e9]/80 glow-cyan cursor-pointer`
                    }`}
                >
                  {joining ? 'JOINING...' : 'JOIN'}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
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
          background: #1a0a2a;  /* Tambah ini: Default gelap, hilangkan pink inheritance */
          border: 2px solid #00ffff;  /* Opsional: Border cyan default biar konsisten */
        }

        .retro-button:hover {
          transform: scale(1.05);
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 255, 255, 0.6);  /* Ganti pink glow ke cyan (#00ffff) */
          filter: brightness(1.2);
        }

        .pixel-border-large {
          border: 4px solid #00ffff;
          position: relative;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
          padding: 2rem;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);  /* Ganti pink ke cyan glow */
        }

        .pixel-border-large::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 2px solid #00ffff;  /* Ganti pink ke cyan biar full cyan theme */
          z-index: -1;
        }

        .pixel-border-small {
          border: 2px solid #00ffff;  /* Ganti kuning ke cyan biar match */
          background: #1a0a2a;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);  /* Ganti kuning glow ke cyan */
        }

        .pixel-card {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 255, 255, 0.2);  /* Ganti pink ke cyan */
          transition: all 0.2s ease;
        }

        .pixel-card:hover {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 255, 255, 0.4);  /* Cyan lagi */
        }

        .book-modal {
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(0, 255, 255, 0.2),  /* Ganti pink ke cyan */
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .book-page {
          background: linear-gradient(135deg, #2d1b69 0%, #1a0a2a 100%);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 255, 255, 0.1);  /* Cyan */
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
          border: 1px solid rgba(0, 255, 255, 0.3);  /* Ganti pink ke cyan */
          border-radius: 4px;
          box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
        }

        .scrollbar-themed::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #00ffff, #ff6bff);  /* Tetep campur cyan-pink biar gradient keren, tapi bisa full cyan kalau mau */
          border-radius: 4px;
          border: 2px solid #1a0a2a;
          box-shadow: 
            0 0 8px rgba(0, 255, 255, 0.6),  /* Cyan dominant */
            inset 0 0 4px rgba(255, 255, 255, 0.2);
          animation: glow-scrollbar 2s ease-in-out infinite alternate;
        }

        .scrollbar-themed::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #33ffff, #ff8aff);
          box-shadow: 
            0 0 12px rgba(0, 255, 255, 0.8),
            inset 0 0 4px rgba(255, 255, 255, 0.3);
        }

        @keyframes glow-scrollbar {
          0% { 
            box-shadow: 
              0 0 8px rgba(0, 255, 255, 0.6),  /* Cyan */
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
          scrollbar-color: #00ffff #1a0a2a;  /* Cyan */
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