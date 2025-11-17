"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Users, Play, ArrowLeft, VolumeX, Volume2, Maximize2, Check, X } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import QRCode from "react-qr-code"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import LoadingRetro from "@/components/loadingRetro"
import { breakOnCaps, formatUrlBreakable } from "@/utils/game"
import Image from "next/image"
import { syncServerTime } from "@/utils/serverTime"
import { useTranslation } from "react-i18next"
import { t } from "i18next"

const APP_NAME = "crazyrace"; // Safety check for multi-tenant DB

const backgroundGifs = ["/assets/background/4_v2.webp"]

const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

export default function HostRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownAudioRef = useRef<HTMLAudioElement>(null);

  const [isCountdownPlaying, setIsCountdownPlaying] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false);

  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [joinLink, setJoinLink] = useState('')
  const [copiedRoom, setCopiedRoom] = useState(false)
  const [copiedJoin, setCopiedJoin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [kickDialogOpen, setKickDialogOpen] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('')
  const [selectedPlayerCar, setSelectedPlayerCar] = useState<string>('')
  const { t } = useTranslation();

  useEffect(() => {
    syncServerTime()
  }, [])

  const calculateCountdown = (startTimestamp: string, durationSeconds: number = 10): number => {
    const start = new Date(startTimestamp).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 1000;
    return Math.max(0, Math.min(durationSeconds, Math.ceil(durationSeconds - elapsed)));
  };

  const startCountdownSync = useCallback((startTimestamp: string, duration: number = 10) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    let remaining = calculateCountdown(startTimestamp, duration);
    setCountdown(remaining);
    if (remaining <= 0) return;

    countdownIntervalRef.current = setInterval(() => {
      remaining = calculateCountdown(startTimestamp, duration);
      setCountdown(remaining);
      setLoading(true)
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        setCountdown(0);
        setTimeout(async () => {
          const { error } = await supabase
            .from("game_sessions")
            .update({ status: "active", started_at: new Date().toISOString(), countdown_started_at: null })
            .eq("game_pin", roomCode);
          if (error) console.error('End countdown error:', error);
          else router.push(`/host/${roomCode}/game`);
        }, 1000);
      }
    }, 1000);
  }, [roomCode, router]);

  const stopCountdownSync = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdown(0);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const startAudio = async () => {
      if (!hasInteracted) {
        try {
          audio.muted = isMuted;
          await audio.play();
          setHasInteracted(true);
          console.log("🔊 Audio started via interaction!");
        } catch (err) {
          console.warn("⚠️ Audio play blocked, waiting for interaction...");
        } finally {
          // lepas listener apapun hasilnya
          document.removeEventListener("click", startAudio);
          document.removeEventListener("keydown", startAudio);
          document.removeEventListener("scroll", startAudio);
        }
      }
    };
    const tryAutoplay = async () => {
      try {
        audio.muted = isMuted;
        await audio.play();
        setHasInteracted(true);
      } catch {
        const startAudio = async () => {
          if (hasInteracted) return;
          try {
            audio.muted = isMuted;
            await audio.play();
            setHasInteracted(true);
          } catch (err) { console.warn("Audio play blocked"); }
          document.removeEventListener("click", startAudio);
        };
        document.addEventListener("click", startAudio);
        document.addEventListener("keydown", startAudio);
        document.addEventListener("scroll", startAudio);
      }
    };
    tryAutoplay();
    return () => {
      document.removeEventListener("click", startAudio);
      document.removeEventListener("keydown", startAudio);
      document.removeEventListener("scroll", startAudio);
    };
  }, [hasInteracted, isMuted]);

  useEffect(() => {
  const countdownAudio = countdownAudioRef.current;
  const bgAudio = audioRef.current;
  if (!countdownAudio) return;

  // Separate effect untuk play countdown (depend cuma countdown & muted, gak isCountdownPlaying)
  if (countdown > 0 && !isCountdownPlaying) {
      // Baru mulai countdown
      setIsCountdownPlaying(true);

      if (bgAudio && !bgAudio.paused) bgAudio.pause();

      countdownAudio.currentTime = 0;
      countdownAudio.muted = isMuted;
      countdownAudio
        .play()
        .then(() => console.log("🔊 Countdown sound started"))
        .catch((err) => console.warn("⚠️ Countdown sound blocked:", err));
    }

    if (countdown <= 0 && isCountdownPlaying) {
      // Countdown selesai
      setIsCountdownPlaying(false);

      countdownAudio.pause();
      countdownAudio.currentTime = 0;

      if (bgAudio && hasInteracted) {
        bgAudio.muted = isMuted;
        bgAudio.play().catch(() => console.warn("⚠️ BG audio failed resume"));
      }
    }
  }, [countdown, isMuted, hasInteracted, isCountdownPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    let sessionSubscription: any = null;
    const fetchSessionAndParticipants = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, countdown_started_at, participants, application")
        .eq("game_pin", roomCode)
        .eq("application", APP_NAME) // Added application filter
        .single();

      if (sessionError || !sessionData) {
        console.error("Error fetching session:", sessionError);
        setLoading(false);
        router.push('/host'); // Redirect if session is invalid
        return;
      }

      let parsedParticipants = [];
      try {
        parsedParticipants = typeof sessionData.participants === 'string' ? JSON.parse(sessionData.participants) : sessionData.participants || [];
      } catch (e) { console.error("Error parsing participants:", e); }
      
      setParticipants(parsedParticipants);
      setSession(sessionData);
      setLoading(false);

      if (sessionData.countdown_started_at) {
        startCountdownSync(sessionData.countdown_started_at, 10);
      } else {
        stopCountdownSync();
      }

      sessionSubscription = supabase
        .channel(`host-session-${roomCode}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `game_pin=eq.${roomCode}` },
          (payload) => {
            const newSessionData = payload.new;
            setSession(newSessionData);
            let updatedParticipants = [];
            try {
              updatedParticipants = typeof newSessionData.participants === 'string' ? JSON.parse(newSessionData.participants) : newSessionData.participants || [];
            } catch (e) { console.error("Error parsing updated participants:", e); }
            setParticipants(updatedParticipants);
            if (newSessionData.countdown_started_at) startCountdownSync(newSessionData.countdown_started_at, 10);
            else stopCountdownSync();
            if (newSessionData.status === 'active') router.push(`/host/${roomCode}/game`);
          }
        )
        .subscribe();
    };

    if (roomCode) fetchSessionAndParticipants();
    return () => {
      stopCountdownSync();
      if (sessionSubscription) supabase.removeChannel(sessionSubscription);
    };
  }, [roomCode, startCountdownSync, stopCountdownSync, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') setJoinLink(`${window.location.origin}/${roomCode}`);
  }, [roomCode]);

  const copyToClipboard = async (text: string, setFeedback: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(true);
      setTimeout(() => setFeedback(false), 2000);
    } catch (err) { console.error("Copy failed:", err); }
  };

  const startGame = async () => {
    const { error } = await supabase
      .from("game_sessions")
      .update({ countdown_started_at: new Date().toISOString() })
      .eq("game_pin", roomCode);
    if (error) console.error("startGame error:", error);
    else setGameStarted(true);
  };

  // REFACTORED: Use the 'remove_participant_from_session' RPC for a safe, atomic update.
  const confirmKick = async () => {
    if (!selectedPlayerId || !session) return;

    const { error } = await supabase.rpc('remove_participant_from_session', {
      p_session_id: session.id,
      p_participant_id: selectedPlayerId,
      p_app_name: APP_NAME
    });

    if (error) {
      console.error("Kick participant error via RPC:", error);
    } else {
      console.log(`Participant ${selectedPlayerName} kicked successfully via RPC`);
    }
    setKickDialogOpen(false);
    setSelectedPlayerId(null);
  };

  if (countdown > 0) {
    return (
      <div className={`min-h-screen bg-[#1a0a2a] flex items-center justify-center pixel-font`}>
        <audio ref={countdownAudioRef} src="/assets/music/countdown.mp3" preload="auto" loop className="hidden" />
        <div className="text-center">
          <motion.div className="text-8xl md:text-9xl font-bold text-[#00ffff] pixel-text glow-cyan race-pulse" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            {countdown}
          </motion.div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingRetro />;

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      <audio ref={audioRef} src="/assets/music/hostroom.mp3" loop preload="auto" className="hidden" autoPlay />
      <AnimatePresence mode="wait">
        <motion.div key={currentBgIndex} className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${backgroundGifs[0]})` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: "easeInOut" }} />
      </AnimatePresence>
      <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.05 }} className="absolute top-4 left-4 z-40 p-3 bg-[#00ffff]/20 border-2 border-[#00ffff] pixel-button hover:bg-[#33ffff]/20 glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Back to Settings" onClick={() => router.push(`/host/${roomCode}/settings`)}><ArrowLeft size={20} className="text-white" /></motion.button>
      <h1 className="absolute top-5 right-20 hidden md:block"><Image src="/gameforsmartlogo.webp" alt="Gameforsmart Logo" width={256} height={64} /></h1>
      <h1 className="absolute top-6 left-20 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">Crazy Race</h1>
      <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.05 }} onClick={() => setIsMuted(p => !p)} className={`absolute top-4 right-4 z-40 p-3 border-2 pixel-button rounded-lg shadow-lg min-w-[48px] min-h-[48px] flex items-center justify-center transition-all cursor-pointer ${isMuted ? "bg-[#ff6bff]/30 border-[#ff6bff] glow-pink shadow-[#ff6bff]/30 hover:bg-[#ff8aff]/50" : "bg-[#00ffff]/30 border-[#00ffff] glow-cyan shadow-[#00ffff]/30 hover:bg-[#33ffff]/50"}`} aria-label={isMuted ? "Unmute" : "Mute"}><span className="filter drop-shadow-[2px_2px_2px_rgba(0,0,0,0.7)]">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</span></motion.button>
      <div className="relative z-10 max-w-8xl mx-auto p-4 sm:p-6 md:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center pb-4">
          <div className="inline-block py-4 md:pt-10"><h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">{t('hostroom.title')}</h1></div>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-2 sm:p-4 lg:col-span-2 order-1 lg:order-1">
            <div className="text-center space-y-2">
              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] rounded-lg">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00ffff] pixel-text glow-cyan">{roomCode}</div>
                <Button onClick={() => copyToClipboard(roomCode, setCopiedRoom)} className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2" size="sm">{copiedRoom ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}</Button>
              </div>
              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] rounded-lg">
                <QRCode value={joinLink} size={300} className="mx-auto w-fit rounded p-2 bg-white" />
                <Button onClick={() => setOpen(true)} className="absolute top-1 right-1 bg-transparent hover:bg-gray-500/20 transition-colors p-1 sm:p-2" size="sm"><Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" /></Button>
                <Dialog open={open} onOpenChange={setOpen}><DialogOverlay className="bg-[#1a0a2a]/80 backdrop-blur-sm fixed inset-0 z-50" /><DialogContent className="backdrop-blur-sm border-none rounded-lg max-w-[100vw] sm:max-w-3xl p-4 sm:p-6"><div className="flex justify-center"><QRCode value={joinLink} size={Math.min(625, window.innerWidth * 0.8)} className="rounded w-fit bg-white p-2" /></div></DialogContent></Dialog>
              </div>
              <div className="relative py-4 px-7 bg-[#0a0a0f] rounded-lg">
                <div className="text-xs sm:text-sm text-[#00ffff] pixel-text glow-cyan break-words">{formatUrlBreakable(joinLink)}</div>
                <Button onClick={() => copyToClipboard(joinLink, setCopiedJoin)} className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2" size="sm">{copiedJoin ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}</Button>
              </div>
              <Button onClick={startGame} disabled={participants.length === 0 || gameStarted} className="text-base sm:text-lg py-3 sm:py-4 bg-[#00ffff] border-2 sm:border-3 border-white pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed w-full sm:w-auto"><Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />{t('hostroom.start')}</Button>
            </div>
          </Card>
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-4 sm:p-6 md:p-8 lg:col-span-3 order-1 lg:order-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#00ffff] pixel-text glow-cyan text-center sm:text-left">{participants.length} Player{participants.length <= 1 ? "" : "s"}</h2>
            </div>
            <div className="space-y-4 mb-6 sm:mb-8">
              {participants.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400 pixel-text"><Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" /><p className="text-sm sm:text-base">Waiting for players to join...</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {participants.map((player) => (
                    <motion.div key={player.id} className="relative group glow-pink-subtle" whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                      <div className="p-2 rounded-lg sm:rounded-xl border-2 sm:border-3 border-double transition-all duration-300 bg-transparent backdrop-blur-sm border-[#ff6bff]/70 hover:border-[#ff6bff]">
                        <div className="relative mb-2 sm:mb-3"><img src={carGifMap[player.car] || '/assets/car/car5_v2.webp'} alt={`${player.car} car`} className="h-16 sm:h-20 md:h-24 lg:h-28 w-20 sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150" /></div>
                        <div className="text-center"><p className="text-white text-xs leading-tight glow-text line-clamp-2 break-words">{breakOnCaps(player.nickname)}</p></div>
                        <div className="absolute top-1 right-1 opacity-100 transition-all duration-200 hover:scale-110">
                          <Button onClick={(e) => { e.stopPropagation(); const { id, nickname, car } = player; setSelectedPlayerId(id); setSelectedPlayerName(nickname); setSelectedPlayerCar(car); setKickDialogOpen(true); }} size="sm" className="bg-[#ffff000]/90 text-red pixel-button" aria-label={t('hostroom.kickconfirmation')}><X size={4} className="text-white" /></Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <DialogOverlay className="bg-[#1a0a2a]/60 backdrop-blur-md fixed inset-0 z-50" />
        <DialogContent className=" bg-[#1a0a2a]/15 border-[#ff6bff]">
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2, ease: "easeOut" }} className="p-3 space-y-2">
            <CardHeader className="text-center space-y-1">
              <div className="relative mx-auto"><img src={carGifMap[selectedPlayerCar] || '/assets/car/car5_v2.webp'} alt={`${selectedPlayerCar} car`} className="h-24 w-74 object-contain animate-neon-bounce filter brightness-110 contrast-140 mx-auto" /></div>
              <CardTitle className="text-lg text-[#ffefff] pixel-text glow-pink mb-4">{t('hostroom.kickconfirmation', { name: selectedPlayerName })}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-center space-x-2">
                <Button onClick={() => setKickDialogOpen(false)} variant="outline" className="bg-[#000] border text-[#00ffff] border-[#00ffff] hover:bg-gray-900 hover:text-white px-4 py-2 text-sm">{t('hostroom.cancel')}</Button>
                <Button onClick={confirmKick} className="bg-[#000] border text-[#00ffff] border-[#00ffff] hover:bg-gray-900 hover:text-white px-4 py-2 text-sm">{t('hostroom.kick')}</Button>
              </div>
            </CardContent>
          </motion.div>
        </DialogContent>
      </Dialog>
      <style jsx>{`
          .pixel-font { font-family: 'Press Start 2P', cursive, monospace; image-rendering: pixelated; }
          .pixel-text { image-rendering: pixelated; text-shadow: 2px 2px 0px #000; }
          .pixel-button { image-rendering: pixelated; box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8); transition: all 0.1s ease; }
          .pixel-button:hover:not(:disabled) { transform: translate(2px, 2px); box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8); }
          .pixel-card { box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2); transition: all 0.2s ease; }
          .pixel-card:hover { box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4); }
          .glow-pink { animation: glow-pink 1.5s ease-in-out infinite; }
          .glow-pink-subtle { animation: glow-pink 2s ease-in-out infinite; filter: drop-shadow(0 0 3px rgba(255, 107, 255, 0.5)); }
          .glow-cyan { animation: glow-cyan 1.5s ease-in-out infinite; }
          .glow-cyan-subtle { animation: glow-cyan 2s ease-in-out infinite; filter: drop-shadow(0 0 3px rgba(0, 255, 255, 0.5)); }
          .race-pulse { animation: race-pulse 0.5s ease-in-out infinite; }
          @keyframes glow-cyan { 0%, 100% { filter: drop-shadow(0 0 5px #00ffff); } 50% { filter: drop-shadow(0 0 15px #00ffff); } }
          @keyframes glow-pink { 0%, 100% { filter: drop-shadow(0 0 5px #ff6bff); } 50% { filter: drop-shadow(0 0 15px #ff6bff); } }
          @keyframes race-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @keyframes neon-bounce { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
          .glow-text { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)); }
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}
