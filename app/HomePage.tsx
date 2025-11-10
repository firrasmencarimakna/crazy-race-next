"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Flag, Volume2, VolumeX, Settings, Users, Menu, X, BookOpen, ArrowLeft, ArrowRight, Play, LogOut, Globe, Dice1, Dices, ScanLine } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { usePreloaderScreen } from "@/components/preloader-screen"
import LoadingRetroScreen from "@/components/loading-screnn"
import { useAuth } from "@/contexts/authContext"
import { generateXID } from "@/lib/id-generator"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then(mod => ({ default: mod.Scanner })),
  { ssr: false }
);

function LogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/login'); // Atau '/' kalau mau
      onOpenChange(false);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

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
  );
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { t, i18n } = useTranslation()
  const { user, loading: authLoading } = useAuth()

  // State untuk loading dan joining process
  const [joining, setJoining] = useState(false)

  // State untuk input fields
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // State untuk UI modals dan menu
  const [isMenuOpen, setIsMenuOpen] = useState(false) // Toggle menu burger
  const [showHowToPlay, setShowHowToPlay] = useState(false) // Modal How to Play
  const [currentPage, setCurrentPage] = useState(0) // Pagination untuk modal How to Play
  const [showTryoutInput, setShowTryoutInput] = useState(false) // Toggle tryout input visibility
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('en')

  // State untuk modal alert (spesifik berdasarkan reason)
  const [showAlert, setShowAlert] = useState(false)
  const [alertReason, setAlertReason] = useState<'roomCode' | 'nickname' | 'both' | 'general' | 'duplicate' | 'roomNotFound' | ''>('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Arrays untuk generate random nickname
  const adjectives = ["Crazy", "Fast", "Speedy", "Turbo", "Neon", "Pixel", "Racing", "Wild", "Epic", "Flash"]
  const nouns = ["Racer", "Driver", "Speedster", "Bolt", "Dash", "Zoom", "Nitro", "Gear", "Track", "Lap"]

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  ]

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null); // State buat error message
  const handleScan = (detectedCodes: any[]) => { // Tipe: IDetectedBarcode[], tapi any[] buat sederhana
    if (detectedCodes && detectedCodes.length > 0) {
      const rawResult = detectedCodes[0].rawValue; // Ambil string dari QR pertama
      console.log('Raw QR result:', rawResult); // Debug: Cek isi QR

      let extractedCode = '';

      // Coba parse sebagai URL lengkap (fleksibel buat localhost, IP, Vercel, Coolify, dll.)
      if (typeof rawResult === 'string' && (rawResult.startsWith('http://') || rawResult.startsWith('https://'))) {
        try {
          const url = new URL(rawResult);
          const params = new URLSearchParams(url.search);
          extractedCode = params.get('code') || '';
          console.log('Parsed URL:', url.origin + url.pathname, 'Code from query:', extractedCode);
        } catch (e) {
          console.warn('URL parse failed, fallback to strip:', e);
          extractedCode = rawResult.replace(/[^a-zA-Z0-9]/g, '');
        }
      } else if (typeof rawResult === 'string') {
        // Kalau gak mulai dengan http(s), anggap direct code atau relative URL
        try {
          const params = new URLSearchParams(rawResult);
          if (params.has('code')) {
            extractedCode = params.get('code')!;
            console.log('Parsed relative query, code:', extractedCode);
          } else {
            extractedCode = rawResult.replace(/[^a-zA-Z0-9]/g, '');
          }
        } catch (e) {
          extractedCode = rawResult.replace(/[^a-zA-Z0-9]/g, '');
        }
      } else {
        console.warn('Raw result is not a string:', rawResult);
        return; // Skip kalau gak string
      }

      // Final format: Strip non-alphanum, uppercase, max 6 char
      extractedCode = extractedCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);

      // Validasi: Harus 6 char alfanum
      if (extractedCode.length === 6 && /^[A-Z0-9]{6}$/.test(extractedCode)) {
        setRoomCode(extractedCode);
        setOpen(false);
        setError(null);
        console.log('✅ Room code final:', extractedCode);
      } else {
        setError(`Kode dari QR tidak valid: "${extractedCode}". Harus 6 huruf/angka. Coba scan ulang.`);
        console.log('❌ Invalid code:', extractedCode);
      }
    } else {
      console.log('No detected codes'); // Debug kalau array kosong
    }
  };

  const handleError = (error: unknown) => {
    console.error('QR Scan Error:', error); // Log full error dulu

    // Type guard: Cast ke Error kalau memungkinkan
    const errorAsError = error instanceof Error ? error : new Error(String(error)); // Fallback ke string kalau bukan Error

    let message = 'Terjadi kesalahan scan. Coba lagi!';

    if (errorAsError.name === 'NotAllowedError' || errorAsError.message.includes('Permission denied') || errorAsError.message.includes('User denied')) {
      message = 'Izinkan akses kamera di pop-up browser dulu. Jika sudah ditolak, refresh halaman dan coba lagi.';
    } else if (errorAsError.name === 'NotFoundError' || errorAsError.message.includes('No cameras')) {
      message = 'Kamera tidak ditemukan. Cek hardware atau izin browser.';
    } else if (typeof error === 'string' && error.includes('secure context') || errorAsError.message.includes('secure context')) {
      message = 'Akses kamera butuh koneksi aman (HTTPS atau localhost). Coba via ngrok kalau test di HP.';
    }

    setError(message);
  };

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

  // Steps untuk modal How to Play (pagination content)
  const steps = t('howToPlay.steps', { returnObjects: true }) as Array<{ title: string; content: string }>

  const totalPages = steps.length

  const handleLanguageSelect = (code: string, name: string) => {
    i18n.changeLanguage(code)
    setCurrentLanguage(code)
    localStorage.setItem('language', code)
    setShowLanguageMenu(false)
    console.log(`Language changed to: ${name} (${code})`)
  }

  // TAMBAH: Fetch profile setelah auth ready
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id || profileLoading) return;
      setProfileLoading(true);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(profileData);
      }
      setProfileLoading(false);
    };

    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [user]);

  // UPDATE: useEffect untuk set nickname (dari profile, bukan user_metadata)
  useEffect(() => {
    localStorage.removeItem("nickname");
    localStorage.removeItem("playerId"); // Ganti ke participantId kalau perlu
    localStorage.removeItem("nextQuestionIndex");

    let defaultNick = generateNickname(); // Fallback random

    if (profile?.fullname) {
      defaultNick = profile.fullname;
    } else if (profile?.username) {
      defaultNick = profile.username;
    } else if (user?.email) {
      defaultNick = user.email.split('@')[0];
    }

    setNickname(defaultNick);
    localStorage.setItem("nickname", defaultNick);

    const savedLanguage = localStorage.getItem('language') || 'en'
    i18n.changeLanguage(savedLanguage)
    setCurrentLanguage(savedLanguage)
  }, [user, profile]); // Tambah profile dependency

  // OJO DI ILANGI BREE
  // TAMBAH: Check kalau udah join, redirect ke lobby
  // useEffect(() => {
  //   if (authLoading || profileLoading) return;

  //   const participantId = localStorage.getItem('participantId');
  //   const gamePin = localStorage.getItem('game_pin');

  //   if (participantId && gamePin) {
  //     console.log('User already joined, redirecting to lobby');
  //     router.push(`/join/${gamePin}`);
  //     return;
  //   }
  // }, [authLoading, profileLoading, router]);

  // useEffect: Auto-fill roomCode dari URL query param (?code=ABC123)
  useEffect(() => {
    if (authLoading) return

    const code = searchParams.get("code")
    const codeLocal = localStorage.getItem("roomCode")

    if (code) {
      // Simpan code di localStorage
      localStorage.setItem("roomCode", code.toUpperCase())
      setRoomCode(code.toUpperCase())
    } else if (codeLocal) {
      setRoomCode(codeLocal)
    }

    // 🧠 Hanya hapus query jika user SUDAH login
    if (user) {
      router.replace(pathname, undefined)
    }

    // 🧹 Hapus fragment access_token (Supabase)
    if (typeof window !== "undefined" && window.location.hash) {
      const url = new URL(window.location.href)
      url.hash = ""
      window.history.replaceState({}, document.title, url.toString())
    }
  }, [authLoading, user, searchParams, pathname, router])

  const handleJoin = async () => {
    // Deteksi reason untuk alert spesifik
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
      return // Stop proses join
    }

    setJoining(true) // Mulai loading

    try {
      // VERIFY: Ganti ke game_sessions, eq(game_pin), select tambah participants
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, participants")
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData) {
        console.error("Error: Session not found", sessionError);
        setJoining(false);
        setAlertReason('roomNotFound');
        setShowAlert(true);
        return
      }

      if (sessionData.status !== "waiting") {
        console.error("Error: Session is not accepting players");
        setJoining(false);
        return;
      }

      // CHECK: Optional - cek kalau nickname udah ada di participants (hindari duplicate)
      const existingParticipant = sessionData.participants?.find(
        (p: any) => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
      );
      if (existingParticipant) {
        console.error("Nickname already in session");
        setJoining(false);
        setAlertReason('general'); // Atau custom 'duplicateNickname'
        setShowAlert(true);
        return;
      }

      // BARU: Generate participant object
      const participantId = generateXID() // Atau generateXID() kalau mau
      const randomCar = ["purple", "white", "black", "aqua", "blue"][Math.floor(Math.random() * 5)];
      const newParticipant = {
        id: participantId,
        nickname: nickname.trim(),
        car: randomCar, // Asumsi schema support car
        user_id: profile?.id || null, // Link ke profiles.id kalau logged in
      };

      // UPDATE: Append ke array participants
      const updatedParticipants = [...(sessionData.participants || []), newParticipant];
      const { error: updateError } = await supabase
        .from("game_sessions")
        .update({ participants: updatedParticipants })
        .eq("id", sessionData.id);

      if (updateError) {
        console.error("Error joining session:", updateError);
        setJoining(false);
        return;
      }

      // Simpan untuk session (tambah participantId untuk lobby/game)
      localStorage.setItem("nickname", nickname.trim());
      localStorage.setItem("participantId", participantId); // Baru: untuk later use
      localStorage.setItem("game_pin", roomCode);
      localStorage.setItem("car", randomCar); // Kalau perlu di lobby

      // Navigasi ke lobby page
      setTimeout(() => {
        router.push(`/join/${roomCode}`);
      }, 500);
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
    // Simpan khusus untuk tryout mode
    localStorage.setItem('tryout_nickname', nickname.trim())
    localStorage.setItem('tryout_mode', 'solo')
    router.push('/tryout')
  }

  const handleLogout = () => {
    setIsMenuOpen(false);
    setShowLogoutDialog(true); // Buka dialog konfirmasi
  };

  // Preload check: Tampilkan loading jika belum siap
  const { isLoaded, progress } = usePreloaderScreen()
  if (!isLoaded) return <LoadingRetroScreen progress={progress} />

  // Handle toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn(`Error attempting to disable full-screen mode: ${err.message}`);
      });
    }
  };


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
                  src="/assets/car/car3_v2.webp"
                  alt="Car alert animation"
                  width={200}
                  height={150}
                  className="mx-auto rounded-lg"
                />
              </div>

              {/* Dynamic Title berdasarkan reason */}
              <CardTitle className="text-xl font-bold text-[#ff6bff] mb-2 pixel-text glow-pink">
                {t(`alert.${alertReason}.title`)}
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
                {t('alert.closeButton')}
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
              <div className="flex items-center gap-3 p-3 bg-[#1a0a2a]/80 border border-[#00ffff]/30 rounded-lg">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center overflow-hidden">
                  {profileLoading ? (
                    <div className="flex items-center justify-center w-full h-full text-gray-400">
                      Loading...
                    </div>
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white pixel-text">
                      {profile?.fullname?.charAt(0)?.toUpperCase() ||
                        profile?.username?.charAt(0)?.toUpperCase() ||
                        user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                {/* Name & Email */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#00ffff] pixel-text truncate">
                    {profile?.fullname || profile?.username || user?.email?.split('@')[0] || t('menu.user')}
                  </p>
                </div>
              </div>
              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                {/* <span className="text-sm text-white pixel-text">Audio</span> */}

              </div>

              {/* Fullscreen Button */}
              <button
                onClick={handleToggleFullscreen}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#00ffff]/50 hover:border-[#00ffff] pixel-button hover:bg-[#00ffff]/20 glow-cyan-subtle rounded text-center"
                aria-label="Toggle Fullscreen"
              >
                <div className="flex items-center justify-center gap-2">
                  {/* <Maximize2 size={16} /> atau <Minimize2 /> kalau mau dinamis */}
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">Fullscreen</span>
                </div>
              </button>


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
                  <span className="text-sm text-[#00ffff] pixel-text glow-cyan">{t('menu.howToPlay')}</span>
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
                  <span className="text-sm text-[#ff6bff] pixel-text glow-pink">{t('menu.soloTryout')}</span>
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
                        setIsMenuOpen(false) // Tutup menu setelah start
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

              {/* Settings Button (placeholder, bisa di-expand) */}
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
                    className="overflow-hidden grid grid-cols-2 gap-2"
                  >
                    {languages.map((lang) => (
                      <motion.button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code, lang.name)}
                        whileHover={{ scale: 1.02 }}
                        className={`flex items-center justify-center p-3 bg-[#1a0a2a]/80 border border-[#00ffff]/30 rounded-lg transition-all duration-200 hover:bg-[#00ffff]/20 hover:border-[#00ffff] ${currentLanguage === lang.code ? 'border-[#00ffff] bg-[#00ffff]/10' : ''}`}
                      >
                        <span className="text-3xl">{lang.flag}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-[#1a0a2a]/60 border-2 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-button hover:bg-[#ff6bff]/20 glow-pink-subtle rounded text-center"
                aria-label="Logout"
              >
                <div className="flex items-center justify-center gap-2">
                  {/* <LogOut size={16} /> */}
                  <span className="text-sm text-[#ff0000] pixel-text glow-pink">{t('menu.logout')}</span>
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
            onClick={closeHowToPlay}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#1a0a2a]/70 via-[#1a0a2a]/50 to-[#1a0a2a]/70 border border-[#ff6bff]/30 rounded-3xl shadow-2xl shadow-[#ff6bff]/25 backdrop-blur-xl pixel-card scrollbar-themed book-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button (top-right) */}
              <button
                onClick={closeHowToPlay}
                className="absolute top-4 right-4 z-10 p-2 bg-[#1a0a2a]/80 border border-[#00ffff]/40 rounded-xl text-[#00ffff] hover:bg-[#00ffff]/10 hover:border-[#00ffff]/60 transition-all duration-300 glow-cyan-subtle shadow-lg shadow-[#00ffff]/20 hover:shadow-[#00ffff]/40"
                aria-label="Close modal"
              >
                <X size={18} className="stroke-current" />
              </button>

              {/* Header */}
              <CardHeader className="text-center border-b border-[#ff6bff]/15 p-6 pt-16 pb-4">
                <CardTitle className="text-2xl font-bold text-[#00ffff] pixel-text glow-cyan mb-3 tracking-wide">
                  {t('howToPlay.title')}
                </CardTitle>
                <CardDescription className="text-[#ff6bff]/70 text-sm pixel-text glow-pink-subtle leading-relaxed">
                  {t('howToPlay.description')}
                </CardDescription>
                <p className="text-xs text-gray-300 mt-3 pixel-text opacity-80">
                  Page {currentPage + 1} of {totalPages}
                </p>
              </CardHeader>

              {/* Paginated Content */}
              <div className="flex-1 p-6 overflow-hidden min-h-[200px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ x: currentPage > 0 ? "100%" : "-100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: currentPage > 0 ? "-100%" : "100%", opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full flex flex-col justify-center items-center book-page"
                  >
                    <div className="text-center mb-6 w-full">
                      <h3 className="text-xl font-bold text-[#00ffff] mb-4 pixel-text glow-cyan tracking-wide">
                        {steps[currentPage].title}
                      </h3>
                      <p className="text-gray-200 leading-relaxed pixel-text text-center max-w-sm mx-auto text-base">
                        {steps[currentPage].content}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination Footer */}
              <CardFooter className="border-t border-[#ff6bff]/15 p-6 pt-4 bg-[#1a0a2a]/60 backdrop-blur-sm rounded-b-3xl">
                <div className="w-full flex items-center justify-between">
                  {/* Prev Button */}
                  <Button
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                    className={`flex items-center gap-2 px-6 py-3 bg-transparent hover:bg-[#00ffff]/10 border-2 border-[#00ffff]/40 text-[#00ffff] pixel-button glow-cyan-subtle transition-all duration-300 shadow-md shadow-[#00ffff]/20 hover:shadow-[#00ffff]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <ArrowLeft size={18} className="stroke-current" />
                    {/* <span className="font-medium">{t('howToPlay.prev')}</span> */}
                  </Button>

                  {/* Page Dots */}
                  <div className="flex space-x-3">
                    {steps.map((_, index) => (
                      <motion.button
                        key={index}
                        onClick={() => goToPage(index)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-3 h-3 rounded-full transition-all duration-300 shadow-sm ${index === currentPage
                          ? 'bg-[#a100ff] shadow-lg shadow-[#a100ff]/40 scale-125'
                          : 'bg-white/20 hover:bg-white/40 hover:scale-110'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Next / Got It Button */}
                  <Button
                    onClick={goToNextPage}
                    className="flex items-center gap-2 px-6 py-3 bg-transparent hover:bg-[#ff6bff]/10 border-2 border-[#ff6bff]/40 text-[#ff6bff] pixel-button glow-pink-subtle transition-all duration-300 shadow-md shadow-[#ff6bff]/20 hover:shadow-[#ff6bff]/40"
                  >
                    <span className="font-medium">
                      {/* {currentPage === totalPages - 1 ? t('howToPlay.gotIt') : t('howToPlay.next')} */}
                    </span>
                    {currentPage === totalPages - 1 ? (
                      <BookOpen size={18} className="stroke-current" />
                    ) : (
                      <ArrowRight size={18} className="stroke-current" />
                    )}
                  </Button>
                </div>
              </CardFooter>
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
              {t('mainTitle.title1')}
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] relative z-10">
              {t('mainTitle.title2')}
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
              {t('mainTitle.subtitle')}
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
                  {t('hostGame.title')}
                </CardTitle>
                <CardDescription className="text-[#00ffff]/80 text-sm pixel-text glow-pink-subtle">
                  {t('hostGame.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/host">
                  <Button className="w-full bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white focus:ring-[#00ffff]/30 transition-all duration-200 cursor-pointer">
                    {t('hostGame.button')}
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
                  {t('joinRace.title')}
                </CardTitle>
                <CardDescription className="text-sm text-[#00ffff]/80 glow-cyan-subtle pixel-text">
                  {t('joinRace.description')}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="relative flex items-center">
                  <Input
                    placeholder={t('joinRace.roomCodePlaceholder')}
                    value={roomCode}
                    maxLength={6}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
                      setRoomCode(value)
                    }}
                    className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30 pr-10" // kasih padding kanan biar teks gak ketimpa icon
                    aria-label="Room Code"
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#00ffff] hover:bg-[#00ffff]/20 transition-all duration-200 glow-cyan-subtle p-1"
                    aria-label="Scan QR"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Input
                    placeholder={t('joinRace.nicknamePlaceholder')}
                    value={nickname}
                    maxLength={15}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30 pr-10"
                    aria-label="Nickname"
                  />
                  <button
                    type="button"
                    onClick={() => setNickname(generateNickname())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#00ffff] hover:bg-[#00ffff]/20 transition-all duration-200 glow-cyan-subtle p-1"
                    aria-label="Generate Nickname"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>

              {/* Action Button (Join) */}
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  disabled={joining || profileLoading}
                  className={`w-full transition-all duration-300 ease-in-out pixel-button-large retro-button ${joining
                    ? 'opacity-50 cursor-not-allowed'
                    : `bg-gradient-to-r from-[#3ABEF9] to-[#3ABEF9] hover:from-[#3ABEF9] hover:to-[#A7E6FF] text-white border-[#0070f3]/80 hover:border-[#0ea5e9]/80 glow-cyan cursor-pointer`
                    }`}
                >
                  {joining ? t('joinRace.joining') : t('joinRace.joinButton')}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Dialog QR Scanner */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a0a0a]/90 border-[#00ffff]/50 max-w-md mx-auto p-0">
          <DialogHeader className="p-4 border-b border-[#00ffff]/20">
            <DialogTitle className="text-[#00ffff] text-center text-sm pixel-text">
              Scan QR Code Room
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex flex-col items-center space-y-4">
            <div className="relative w-full max-w-xs">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{ facingMode: 'environment' }} // Kamera belakang
                classNames={{
                  container: "rounded-lg overflow-hidden border border-[#00ffff]/30"
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#00ffff]/70 hover:text-[#00ffff] text-sm transition-colors"
            >
              Batal
            </button>
          </div>
        </DialogContent>
      </Dialog>

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