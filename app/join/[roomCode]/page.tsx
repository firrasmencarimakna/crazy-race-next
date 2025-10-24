"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import { calculateCountdown } from "@/utils/countdown"
import { DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog"

import Image from "next/image"
import { breakOnCaps } from "@/utils/game"

// Background GIFs
const backgroundGifs = [
  "/assets/background/1.webp",
  "/assets/background/host/1.webp",
  "/assets/background/host/3.webp",
  "/assets/background/host/4.webp",
  "/assets/background/host/7.webp",
]

const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

const availableCars = [
  { key: "purple", label: "Vortexia" },
  { key: "white", label: "Glacier" },
  { key: "black", label: "Noctis" },
  { key: "aqua", label: "Hydracer" },
  { key: "blue", label: "Skyburst" },
] as const

interface Player {
  id: string | null;
  nickname: string;
  car: string | null;
}

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // Ref buat interval (stabil, gak cause re-render)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    id: null,
    nickname: "",
    car: null,
  });

  const [participants, setParticipants] = useState<any[]>([]); // Ganti dari players → participants
  const [session, setSession] = useState<any>(null); // Ganti dari room → session
  const [gamePhase, setGamePhase] = useState("waiting")
  const [countdown, setCountdown] = useState(0)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCarDialog, setShowCarDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const hasBootstrapped = useRef(false); // Prevent double bootstrap

  // UPDATE: calculateCountdown inline (sama seperti host)
  const calculateCountdown = (startTimestamp: string, durationSeconds: number = 10): number => {
    const start = new Date(startTimestamp).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 1000;
    return Math.max(0, Math.floor(durationSeconds - elapsed));
  };

  // Fungsi sync countdown (pakai ref, no dependency loop)
  const startCountdownSync = useCallback((startTimestamp: string, duration: number = 10) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    let remaining = calculateCountdown(startTimestamp, duration);
    setCountdown(remaining);

    if (remaining <= 0) {
      console.log('Countdown already finished on start');
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      remaining = calculateCountdown(startTimestamp, duration);
      setCountdown(remaining);

      console.log('Countdown tick:', remaining);

      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        setCountdown(0);
      }
    }, 1000);
  }, []);

  const stopCountdownSync = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
  }, []);

  // UPDATE: Monitor status & auto-redirect
  useEffect(() => {
    if (session?.status === 'active' && !loading) {
      router.replace(`/join/${roomCode}/game`);
    } else if (session?.status === 'finished' && !loading) {
      router.replace(`/join/${roomCode}/result`);
    }
  }, [session?.status, loading, roomCode, router]);

  // UPDATE: handleExit - remove dari participants array
  const handleExit = async () => {
    if (!currentPlayer.id || !session) return;

    // Get current participants & remove by id
    let currentParticipants = [];
    try {
      currentParticipants = typeof session.participants === 'string'
        ? JSON.parse(session.participants)
        : session.participants || [];
    } catch (e) {
      console.error("Error parsing participants for exit:", e);
      return;
    }

    const updatedParticipants = currentParticipants.filter((p: any) => p.id !== currentPlayer.id);

    const { error } = await supabase
      .from('game_sessions')
      .update({ participants: updatedParticipants })
      .eq('game_pin', roomCode);

    if (error) {
      console.error('Error exiting session:', error);
    } else {
      console.log('Player exited session successfully, localstorage participant dan gamepin dihapus');
      localStorage.removeItem('participantId'); // UPDATE: playerId → participantId
      localStorage.removeItem('game_pin'); // Tambah: Clear pin
      router.push('/');
    }
    setShowExitDialog(false);
  };

  // UPDATE: Main bootstrap + subscriptions - pakai game_sessions
  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    if (!roomCode) return;

    let sessionChannel: any = null;

    const bootstrap = async () => {
      setLoading(true);

      // 1. Fetch session
      const { data: fetchedSession, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('id, status, countdown_started_at, started_at, participants, quiz_detail') // Tambah participants & quiz_detail
        .eq('game_pin', roomCode)
        .single();

      if (sessionErr || !fetchedSession) {
        console.log('Session not found', sessionErr);
        router.replace('/');
        return;
      }

      console.log("============== hanya untuk debug ===============");
      console.log('Session data loaded', fetchedSession);
      setSession(fetchedSession);
      setGamePhase(fetchedSession.status);

      if (fetchedSession.countdown_started_at) {  // Gak cek status, cukup field ini
        startCountdownSync(fetchedSession.countdown_started_at, 10);
      } else {
        stopCountdownSync();
      }

      // Immediate redirects
      if (fetchedSession.status === 'active') {
        router.replace(`/join/${roomCode}/game`);
        return;
      } else if (fetchedSession.status === 'finished') {
        router.replace(`/join/${roomCode}/result`);
        return;
      }

      // 3. Parse participants untuk players
      let parsedParticipants = [];
      try {
        parsedParticipants = typeof fetchedSession.participants === 'string'
          ? JSON.parse(fetchedSession.participants)
          : fetchedSession.participants || [];
      } catch (e) {
        console.error("Error parsing participants:", e);
      }
      setParticipants(parsedParticipants.map((p: any) => ({ ...p, isReady: true })));

      // 4. Set current player - cari berdasarkan nickname atau participantId dari localStorage
      const myNick = localStorage.getItem('nickname') || '';
      const myParticipantId = localStorage.getItem('participantId') || '';
      const me = parsedParticipants.find((p: any) => p.nickname === myNick || p.id === myParticipantId);

      if (!me) {
        console.log("keluar karena tidak ada participant diriku");
        router.replace('/');
        localStorage.removeItem('participantId');
        localStorage.removeItem('game_pin');
        return;
      }

      setCurrentPlayer({ id: me.id, nickname: me.nickname, car: me.car || 'blue' });
      localStorage.setItem('participantId', me.id); // Pastikan saved

      // 5. Session subscription (cover participants changes via UPDATE)
      sessionChannel = supabase
        .channel(`session:${roomCode}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `game_pin=eq.${roomCode}`
        }, (payload) => {
          const newSessionData = payload.new;
          console.log('Session update:', newSessionData.status);
          setGamePhase(newSessionData.status);
          setSession(newSessionData);

          // Parse updated participants
          let updatedParticipants = [];
          try {
            updatedParticipants = typeof newSessionData.participants === 'string'
              ? JSON.parse(newSessionData.participants)
              : newSessionData.participants || [];
          } catch (e) {
            console.error("Error parsing updated participants:", e);
          }
          setParticipants(updatedParticipants.map((p: any) => ({ ...p, isReady: true })));

          // Auto-redirect
          if (newSessionData.status === 'active') {
            router.replace(`/join/${roomCode}/game`);
          } else if (newSessionData.status === 'finished') {
            router.replace(`/join/${roomCode}/result`);
          }

          // Sync countdown - cek field saja
          if (newSessionData.countdown_started_at) {
            startCountdownSync(newSessionData.countdown_started_at, 10);
          } else {
            stopCountdownSync();
          }

          // 🧠 Hanya cek kick kalau currentPlayer.id sudah terisi
          // Ganti blok kick check kamu jadi:
          const localId = localStorage.getItem('participantId');

          if (!updatedParticipants.find((p: any) => p.id === (currentPlayer?.id || localId))) {
            console.warn("🚪 Kicked from session (verified via fallback)");
            localStorage.removeItem('participantId');
            router.push('/');
            return;
          }

          console.log('Realtime payload participants:', updatedParticipants);
          console.log('Current player id:', currentPlayer.id);
        })
        .subscribe((status) => {
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Session sub dropped, retrying...');
            setTimeout(bootstrap, 3000);
          }
        });

      setLoading(false);
    };

    bootstrap();

    return () => {
      stopCountdownSync();
      if (sessionChannel) supabase.removeChannel(sessionChannel);
    };
  }, [roomCode, router, startCountdownSync, stopCountdownSync]);

  // Background cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentPlayer.id) return -1;
    if (b.id === currentPlayer.id) return 1;
    return 0;
  });

  if (loading) {
    return <LoadingRetro />;
  }

  // Countdown display
  if (countdown > 0) {
    return (
      <div className={`min-h-screen bg-[#1a0a2a] flex items-center justify-center pixel-font`}>
        <div className="text-center">
          <motion.div
            className="text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] leading-none font-bold text-[#00ffff] pixel-text glow-cyan race-pulse"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {countdown}
          </motion.div>
        </div>
      </div>
    );
  }

  const handleSelectCar = async (selectedCar: string) => {
    if (!currentPlayer.id || !session) return;

    // Get current participants & update car
    let currentParticipants = [];
    try {
      currentParticipants = typeof session.participants === 'string'
        ? JSON.parse(session.participants)
        : session.participants || [];
    } catch (e) {
      console.error("Error parsing participants for car update:", e);
      return;
    }

    const updatedParticipants = currentParticipants.map((p: any) =>
      p.id === currentPlayer.id ? { ...p, car: selectedCar } : p
    );

    const { error } = await supabase
      .from('game_sessions')
      .update({ participants: updatedParticipants })
      .eq('game_pin', roomCode);

    if (error) {
      console.error('Error updating car:', error);
    } else {
      setCurrentPlayer(prev => ({ ...prev, car: selectedCar }));
      setParticipants(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, car: selectedCar } : p));
      setShowCarDialog(false);
      console.log('Car updated successfully');
    }
  };

  return (
    <div className={`min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font p-4`}>

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

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">

        <h1 className="fixed top-5 right-10 hidden md:block">
          <Image
            src="/gameforsmartlogo.webp"
            alt="Gameforsmart Logo"
            width={256}
            height={64}
          />
        </h1>

        <h1 className="fixed top-7 left-10 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
          Crazy Race
        </h1>

        {/* Judul Utama */}
        <div className="text-center md:m-8 mb-8">
          <h1 className="sm:max-w-none text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            Waiting Room
          </h1>
        </div>

        {/* Players Grid - 5 per baris */}
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="bg-[#1a0a2a]/40 backdrop-blur-sm border-[#ff6bff]/50 pixel-card py-5 gap-3 mb-10">
            <CardHeader className="text-center px-5 mb-5">

              <motion.div
                className="relative flex items-center justify-center"
              >
                <Badge className="absolute bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] p-2 md:text-lg pixel-text glow-cyan top-0 left-0 gap-1 md:gap-3">
                  <Users className="!w-3 !h-3 md:!w-5 md:!h-5" />
                  {participants.length}
                </Badge>

              </motion.div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Players Grid - 5 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {participants.map((player) => (
                  <motion.div
                    key={player.id}
                    className={`relative group ${player.id === currentPlayer.id ? 'glow-cyan' : 'glow-pink-subtle'
                      }`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`p-4 rounded-xl border-4 border-double transition-all duration-300 bg-transparent backdrop-blur-sm ${player.id === currentPlayer.id
                        ? 'border-[#00ffff] animate-neon-pulse'
                        : 'border-[#ff6bff]/70 hover:border-[#ff6bff]'
                        }`}
                    >
                      {/* Car GIF - Enhanced visuals */}
                      <div className="relative mb-3">
                        <img
                          src={carGifMap[player.car] || '/assets/car/car5_v2.webp'}
                          alt={`${player.car} car`}
                          className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                        />
                      </div>

                      {/* Player Info */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <h3 className="text-white pixel-text text-sm leading-tight line-clamp-2 break-words">
                            {breakOnCaps(player.nickname)}
                          </h3>
                        </div>

                        {/* ME or NOT Badge */}
                        {player.id === currentPlayer.id && (
                          <Badge className="bg-transparent text-[#00ffff] border-[#00ffff]/70 text-xs pixel-text glow-cyan-subtle">
                            YOU
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Button Pilih Car */}
        <div className="bg-[#1a0a2a]/50 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none w-full text-center py-3 fixed bottom-0 left-1/2 transform -translate-x-1/2 z-10 space-x-2 items-center justify-center flex">
          <Button className="bg-red-500 border-2 border-white pixel-button-large hover:bg-red-800 px-8 py-3" onClick={() => setShowExitDialog(true)}>
            <ArrowLeft />
          </Button>
          <Button className="bg-[#ff6bff] border-2 border-white pixel-button-large hover:bg-[#ff8aff] glow-pink px-8 py-3" onClick={() => setShowCarDialog(true)}>
            <span className="pixel-text text-lg">CHOOSE CAR</span>
          </Button>
        </div>
      </div>

      {/* Modal Dialog Verifikasi Exit */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogOverlay className="bg-[#000ffff] backdrop-blur-sm" />
        <DialogContent className="bg-[#1a0a2a]/65 border-[#ff6bff]/50 backdrop-blur-md text-[#00ffff] max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader>
              <DialogTitle className="text-cyan-400 pixel-text glow-cyan text-center"> Exit Room?</DialogTitle>
            </DialogHeader>

            {/* Car GIF */}
            <div className="flex justify-center mb-4">
              <img
                src={carGifMap[currentPlayer.car || 'blue']}
                alt="Your Car"
                className="h-24 w-32 object-contain filter brightness-125 glow-cyan"  // Fix w-42 ke w-32
              />
            </div>
            <DialogDescription className="text-cyan-400 text-center">
              You will Go to the Homepage.
            </DialogDescription>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExitDialog(false)}
                className="text-[#00ffff] border-1 border-[#00ffff] hover:bg-[#00ffff] "
              >
                Cancel
              </Button>

              <Button
                onClick={handleExit}
                className="bg-[#000] border-1 text-[#00ffff] border-[#00ffff] hover:bg-red-500 hover:text-white"
              >
                Exit
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Dialog/Modal Pilih Car */}
      <Dialog open={showCarDialog} onOpenChange={setShowCarDialog}>
        <DialogOverlay className="bg-[#8B00FF]/60 backdrop-blur-sm" />
        <DialogContent className="bg-[#1a0a2a]/90 border-[#ff6bff]/50 backdrop-blur-sm sm:max-w-md sm:h-auto overflow-auto p-0">
          <DialogHeader className="pt-4 pb-2 px-4">
            <DialogTitle className="text-[#00ffff] pixel-text glow-cyan text-center text-xl">Choose Car</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
            {availableCars.map((car) => (
              <motion.button
                key={car.key}
                onClick={() => handleSelectCar(car.key)}
                className={`p-4 mt-1 rounded-xl border-2 border-double transition-all duration-200 hover:scale-105 flex flex-col items-center ${currentPlayer.car === car.key
                  ? 'border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse'
                  : 'border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10'
                  }`}
                whileHover={{ scale: 0.97 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={carGifMap[car.key]}
                  alt={car.label}
                  className="h-24 w-32 mx-auto object-contain filter brightness-125 contrast-150 mb-2"
                />
                <p className="text-xs text-white mt-1 pixel-text text-center">{car.label}</p>
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
          filter: drop-shadow(0 0 5px rgba(255, 107, 255, 0.5));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes neon-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        /* Neon pulse animation for borders */
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        .glow-pink-subtle {
          animation: neon-pulse-pink 1.5s ease-in-out infinite;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}