"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Flag, Volume2, VolumeX, Users, Menu, X, BookOpen, ArrowLeft, ArrowRight, Play, LogOut, Globe } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { usePreloaderScreen } from "@/components/preloader-screen"
import LoadingRetroScreen from "@/components/loading-screnn"
import { useAuth } from "@/contexts/authContext"
import { useTranslation } from "react-i18next"
import "../lib/i18n"

function LogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.replace('/login')
      onOpenChange(false)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ display: open ? 'flex' : 'none' }}>
      <div className="bg-black/80 backdrop-blur-sm w-full h-full absolute" onClick={() => onOpenChange(false)} />
      <div className="relative bg-[#1a0a2a]/80 border border-cyan-400/30 p-6 rounded-lg text-white max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-[#00ffff] mb-4 pixel-text">{t('logoutDialog.title')}</h2>
        <p className="text-gray-300 mb-6 pixel-text">{t('logoutDialog.message')}</p>
        <div className="flex gap-4 justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">{t('logoutDialog.cancel')}</Button>
          <Button onClick={handleLogout} disabled={loading} className="bg-red-500">
            {loading ? t('logoutDialog.loading') : t('logoutDialog.logout')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [joining, setJoining] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50)
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [showTryoutInput, setShowTryoutInput] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertReason, setAlertReason] = useState<'roomCode' | 'nickname' | 'both' | 'general' | 'roomNotFound' | 'duplicateNickname' | ''>('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('en') // Added missing state

  const audioRef = useRef<HTMLAudioElement>(null)
  const alertAudioRef = useRef<HTMLAudioElement>(null)

  const adjectives = ["Crazy", "Fast", "Speedy", "Turbo", "Neon", "Pixel", "Racing", "Wild", "Epic", "Flash"]
  const nouns = ["Racer", "Driver", "Speedster", "Bolt", "Dash", "Zoom", "Nitro", "Gear", "Track", "Lap"]

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  ]

  const generateNickname = () => {
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${randomAdj}${randomNoun}`
  }

  const getAlertMessage = (reason: string) => {
    return t(`alert.${reason}.message`)
  }

  const closeAlert = () => {
    setShowAlert(false)
    setAlertReason('')
  }

  const steps = t('howToPlay.steps', { returnObjects: true }) as Array<{ title: string; content: string }>

  const totalPages = steps.length

  useEffect(() => {
    localStorage.removeItem("nickname")
    localStorage.removeItem("playerId")
    localStorage.removeItem("nextQuestionIndex")

    if (user?.user_metadata?.full_name) {
      setNickname(user.user_metadata.full_name)
      localStorage.setItem("nickname", user.user_metadata.full_name)
    } else if (user?.email) {
      const usernameFromEmail = user.email.split('@')[0]
      setNickname(usernameFromEmail)
      localStorage.setItem("nickname", usernameFromEmail)
    } else {
      const randomNick = generateNickname()
      setNickname(randomNick)
      localStorage.setItem("nickname", randomNick)
    }

    const savedLanguage = localStorage.getItem('language') || 'en'
    i18n.changeLanguage(savedLanguage)
    setCurrentLanguage(savedLanguage)
  }, [user, i18n])

  useEffect(() => {
    if (authLoading) return

    const code = searchParams.get("code")
    const codeLocal = localStorage.getItem("roomCode")

    if (code) {
      localStorage.setItem("roomCode", code.toUpperCase())
      setRoomCode(code.toUpperCase())
    } else if (codeLocal) {
      setRoomCode(codeLocal)
    }

    if (user) {
      router.replace(pathname, undefined)
    }

    if (typeof window !== "undefined" && window.location.hash) {
      const url = new URL(window.location.href)
      url.hash = ""
      window.history.replaceState({}, document.title, url.toString())
    }
  }, [authLoading, user, searchParams, pathname, router])

  useEffect(() => {
    if (audioRef.current) {
      const initialVolume = volume / 100
      audioRef.current.volume = isMuted ? 0 : initialVolume
      audioRef.current.play().catch((e) => {
        console.log("Autoplay dicegah oleh browser:", e)
      })
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : (volume / 100)
    }
  }, [volume, isMuted])

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (isMuted && value[0] > 0) {
      setIsMuted(false)
    }
  }

  const handleLanguageSelect = (code: string, name: string) => {
    i18n.changeLanguage(code)
    setCurrentLanguage(code)
    localStorage.setItem('language', code)
    setShowLanguageMenu(false)
    console.log(`Language changed to: ${name} (${code})`)
  }

  const handleJoin = async () => {
    localStorage.removeItem("roomCode")
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
      return
    }

    setJoining(true)

    try {
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
        return
      }

      if (roomData.status !== "waiting") {
        console.error("Error: Room is not accepting players")
        setJoining(false)
        return
      }

      // Check for duplicate nickname
      const { count: existingCount, error: countError } = await supabase
        .from("players")
        .select("*", { count: 'exact', head: true })
        .eq("room_id", roomData.id)
        .eq("nickname", nickname.trim())

      if (countError) {
        console.error("Error checking duplicate nickname:", countError)
        setJoining(false)
        return
      }

      if (existingCount && existingCount > 0) {
        console.error("Duplicate nickname detected")
        setJoining(false)
        setAlertReason('duplicateNickname')
        setShowAlert(true)
        return
      }

      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          nickname: nickname.trim(),
          car: ["purple", "white", "black", "aqua", "blue"][Math.floor(Math.random() * 5)]
        })

      if (playerError) {
        console.error("Error joining room:", playerError)
        setJoining(false)
        return
      }

      localStorage.setItem("nickname", nickname.trim())
      router.push(`/join/${roomCode}`)
    } catch (error) {
      console.error("Unexpected error:", error)
      setJoining(false)
    }
  }

  const handleTryout = () => {
    if (!nickname.trim() || joining) {
      console.log("Trigger tryout alert: nickname empty")
      setAlertReason('nickname')
      setShowAlert(true)
      return
    }
    setJoining(true)
    localStorage.setItem('tryout_nickname', nickname.trim())
    localStorage.setItem('tryout_mode', 'solo')
    router.push('/tryout')
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    setShowLogoutDialog(true)
  }

  const closeHowToPlay = () => {
    setShowHowToPlay(false)
    setCurrentPage(0)
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

  const { isLoaded, progress } = usePreloaderScreen()
  if (!isLoaded) return <LoadingRetroScreen progress={progress} />

  return (
    <div className={`min-h-[100dvh] w-full relative overflow-hidden pixel-font ${isLoaded ? 'p-2' : ''}`}>
      <audio
        ref={audioRef}
        src="/assets/music/resonance.mp3"
        loop
        preload="auto"
        className="hidden"
      />
      <Image
        src="/assets/background/1.webp"
        alt="Crazy Race Background"
        fill
        className="object-cover"
        priority
        style={{ objectPosition: 'center' }}
      />
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeAlert}
          >
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md max-h-[70vh] overflow-hidden bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-2xl shadow-2xl shadow-[#ff6bff]/40 backdrop-blur-md pixel-card text-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <Image
                  src="/assets/car/car3_v2.webp"
                  alt="Car alert animation"
                  width={200}
                  height={150}
                  className="mx-auto rounded-lg"
                />
              </div>
              <CardTitle className="text-xl font-bold text-[#ff6bff] mb-2 pixel-text glow-pink">
                {t(`alert.${alertReason}.title`)}
              </CardTitle>
              <CardDescription className="text-[#00ffff]/80 mb-6 pixel-text glow-cyan-subtle">
                {getAlertMessage(alertReason)}
              </CardDescription>
              <Button
                onClick={closeAlert}
                className="w-full bg-gradient-to-r from-[#ff6bff] to-[#ff6bff] hover:from-[#ff8aff] text-white pixel-button glow-pink"
              >
                {t('alert.closeButton')}
              </Button>
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
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-20 right-4 z-30 w-64 sm:w-72 bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-lg p-4 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm scrollbar-themed max-h-[70vh] overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#1a0a2a]/80 border border-[#00ffff]/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white pixel-text">
                      {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                        user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#00ffff] pixel-text">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHowToPlay(true)
                  setIsMenuOpen(false)
                }}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="How to Play"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">{t('menu.howToPlay')}</span>
                </div>
              </button>
              <button
                onClick={() => setShowTryoutInput(!showTryoutInput)}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="Solo Tryout"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-[#ff6bff] pixel-text glow-pink">{t('menu.soloTryout')}</span>
                </div>
              </button>
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
                        placeholder={t('joinRace.nicknamePlaceholder')}
                        value={nickname}
                        maxLength={15}
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
                        setIsMenuOpen(false)
                      }}
                      disabled={joining}
                      className={`w-full text-xs ${joining
                        ? 'opacity-50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#ff6bff] to-[#ff6bff] hover:from-[#ff8aff] hover:to-[#ffb3ff] text-white border-[#ff6bff]/80 hover:border-[#ff8aff]/80 glow-pink cursor-pointer'
                        } pixel-button`}
                    >
                      {joining ? t('menu.starting') : t('menu.tryoutButton')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded text-center"
                aria-label="Language"
              >
                <div className="flex items-center justify-center gap-2">
                  <Globe size={16} />
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">{t('menu.language')}</span>
                </div>
              </button>
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    {languages.map((lang) => (
                      <motion.button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code, lang.name)}
                        whileHover={{ scale: 1.02, x: 2 }}
                        className={`w-full flex items-center gap-3 p-3 bg-[#1a0a2a]/80 border border-[#00ffff]/30 rounded-lg transition-all duration-200 hover:bg-[#00ffff]/20 hover:border-[#00ffff] ${currentLanguage === lang.code ? 'border-[#00ffff] bg-[#00ffff]/10' : ''}`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-white pixel-text">{lang.name}</p>
                          <p className="text-xs text-[#00ffff]/70 pixel-text">{lang.code.toUpperCase()}</p>
                        </div>
                        {currentLanguage === lang.code && (
                          <div className="w-2 h-2 bg-[#00ffff] rounded-full glow-cyan-subtle" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="Logout"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-[#ff0000] pixel-text glow-pink">{t('menu.logout')}</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeHowToPlay}
          >
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-2xl shadow-2xl shadow-[#ff6bff]/40 backdrop-blur-md pixel-card scrollbar-themed book-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="text-center border-b-2 border-[#ff6bff]/20 p-6">
                <CardTitle className="text-2xl font-bold text-[#00ffff] pixel-text glow-cyan mb-2">
                  {t('howToPlay.title')}
                </CardTitle>
                <CardDescription className="text-[#ff6bff]/80 text-base pixel-text glow-pink-subtle">
                  {t('howToPlay.description')}
                </CardDescription>
                <p className="text-xs text-gray-200 mt-2 pixel-text">Page {currentPage + 1} of {totalPages}</p>
              </CardHeader>
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
              <CardFooter className="border-t-2 border-[#ff6bff]/20 p-4 bg-[#1a0a2a]/50">
                <div className="w-full flex items-center justify-between">
                  <Button
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                    className={`flex items-center gap-2 px-4 py-2 bg-[#1a0a2a]/60 hover:bg-[#00ffff]/20 border-2 border-[#00ffff]/50 text-[#00ffff] pixel-button glow-cyan-subtle transition-all duration-200 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowLeft size={16} />
                    {t('howToPlay.prev')}
                  </Button>
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
                  <Button
                    onClick={goToNextPage}
                    className={`flex items-center gap-2 px-4 py-2 bg-[#1a0a2a]/60 hover:bg-[#ff6bff]/20 border-2 border-[#ff6bff]/50 text-[#ff6bff] pixel-button glow-pink-subtle transition-all duration-200`}
                  >
                    {currentPage === totalPages - 1 ? (
                      <>
                        {t('howToPlay.gotIt')}
                        <BookOpen size={16} />
                      </>
                    ) : (
                      <>
                        {t('howToPlay.next')}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
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
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <div className="text-center relative pb-5 sm:pt-3 pt-16 space-y-3">
          <div className="pixel-border-large mx-auto relative z-0">
            <h1 className="font-bold bg-clip-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] tracking-wider drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]">
              {t('mainTitle.title1')}
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] relative z-10">
              {t('mainTitle.title2')}
            </h2>
          </div>
          <div
            className="pixel-border-small inline-block"
            style={{
              border: '2px solid #ff6bff',
              boxShadow: '0 0 10px #ff6bff, 0 0 20px #ff6bff',
              borderRadius: '4px'
            }}
          >
            <p className="text-xs sm:text-sm md:text-base px-4 py-2 bg-[#1a0a2a] text-white">
              {t('mainTitle.subtitle')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full px-4 grid-rows-none sm:grid-flow-row grid-flow-dense max-sm:[grid-template-areas:'join'_'host']">
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
                <CardTitle className="text-lg sm:text-xl font-bold text-[#00ffff] pixel-text glow-pink">
                  {t('hostGame.title')}
                </CardTitle>
                <CardDescription className="text-[#00ffff]/80 text-xs sm:text-sm pixel-text glow-pink-subtle">
                  {t('hostGame.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/host">
                  <Button className="w-full bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white focus:ring-[#00ffff]/30 transition-all duration-200 text-sm sm:text-base py-3">
                    {t('hostGame.button')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:join]"
          >
            <Card className="bg-[#1a0a2a]/70 border-[#00ffff]/70 hover:border-[#00ffff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(0,255,255,0.3)] pixel-card">
              <CardHeader className="text-center">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#00ffff] to-[#1a0a2a] group-hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300"
                  whileHover={{ rotate: -5 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-lg sm:text-xl font-bold text-[#00ffff] glow-cyan pixel-text">
                  {t('joinRace.title')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-[#00ffff]/80 glow-cyan-subtle pixel-text">
                  {t('joinRace.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-2">
                <Input
                  placeholder={t('joinRace.roomCodePlaceholder')}
                  value={roomCode}
                  maxLength={6}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
                    setRoomCode(value)
                  }}
                  className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-xs sm:text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30"
                  aria-label="Room Code"
                />
                <div className="relative">
                  <Input
                    placeholder={t('joinRace.nicknamePlaceholder')}
                    value={nickname}
                    maxLength={15}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-xs sm:text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30 pr-10"
                    aria-label="Nickname"
                  />
                  <button
                    type="button"
                    onClick={() => setNickname(generateNickname())}
                    className="absolute right-2 top-1/8 text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff] transition-all duration-200 glow-cyan-subtle p-1"
                    aria-label="Generate Nickname"
                  >
                    <span className="text-base sm:text-lg">🎲</span>
                  </button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className={`w-full transition-all duration-300 ease-in-out pixel-button-large retro-button ${joining
                    ? 'opacity-50 cursor-not-allowed'
                    : `bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white border-[#0070f3]/80 hover:border-[#0ea5e9]/80 glow-cyan cursor-pointer`
                    } text-xs sm:text-sm py-3`}
                >
                  {joining ? t('joinRace.joining') : t('joinRace.joinButton')}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
      <LogoutDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} />
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
          background: #1a0a2a;
          border: 2px solid #00ffff;
        }
        .retro-button:hover {
          transform: scale(1.05);
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 255, 255, 0.6);
          filter: brightness(1.2);
        }
        .pixel-border-large {
          border: 4px solid #00ffff;
          position: relative;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
          padding: 2rem;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }
        .pixel-border-large::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 2px solid #00ffff;
          z-index: -1;
        }
        .pixel-border-small {
          border: 2px solid #00ffff;
          background: #1a0a2a;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }
        .pixel-card {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        .pixel-card:hover {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 255, 255, 0.4);
        }
        .book-modal {
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(0, 255, 255, 0.2),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .book-page {
          background: linear-gradient(135deg, #2d1b69 0%, #1a0a2a 100%);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 255, 255, 0.1);
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
        .scrollbar-themed::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-themed::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, #1a0a2a, #2d1b69);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 4px;
          box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
        }
        .scrollbar-themed::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #00ffff, #ff6bff);
          border-radius: 4px;
          border: 2px solid #1a0a2a;
          box-shadow: 
            0 0 8px rgba(0, 255, 255, 0.6),
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
              0 0 8px rgba(0, 255, 255, 0.6),
              inset 0 0 4px rgba(255, 255, 255, 0.2);
          }
          100% { 
            box-shadow: 
              0 0 12px rgba(0, 255, 255, 0.6),
              inset 0 0 4px rgba(255, 255, 255, 0.4);
          }
        }
        .scrollbar-themed {
          scrollbar-width: thin;
          scrollbar-color: #00ffff #1a0a2a;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
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