"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Activity } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import { calculateCountdown } from "@/utils/countdown"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog"

import Image from "next/image"

// Background GIFs
const backgroundGifs = [
  // "/assets/background/host/1.webp",
  // "/assets/background/host/2.webp",
  "/assets/background/host/3.webp",
  // "/assets/background/host/4.webp",
  // "/assets/background/host/5.webp",
  // "/assets/background/host/7.webp",
]

const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.webp",
  blue: "/assets/car/car2.webp",
  green: "/assets/car/car3.webp",
  yellow: "/assets/car/car4.webp",
  purple: "/assets/car/car5.webp",
  orange: "/assets/car/car5.webp",
}

const availableCars = [
  { key: "red", label: "Red Racer" },
  { key: "blue", label: "Blue Bolt" },
  { key: "green", label: "Green Machine" },
  { key: "yellow", label: "Yellow Fury" },
  { key: "purple", label: "Purple Phantom" },
  { key: "orange", label: "Orange Outlaw" },
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

  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    id: null,
    nickname: "",
    car: null,
  });

    const handleExit = async () => {
    if (!currentPlayer.id) return;
  
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', currentPlayer.id);
  
    if (error) {
      console.error('Error deleting player:', error);
      // Optional: Tampilkan toast error jika punya
    } else {
      console.log('Player exited room successfully');
      localStorage.removeItem('playerId'); // Optional: Hapus dari localStorage
      router.push('/');
    }
    setShowExitDialog(false);
  };


  const [players, setPlayers] = useState<any[]>([])
  const [room, setRoom] = useState<any>(null)
  const [quizTitle, setQuizTitle] = useState("")
  const [gamePhase, setGamePhase] = useState("waiting")
  const [countdown, setCountdown] = useState(0)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCarDialog, setShowCarDialog] = useState(false) // State untuk dialog car
  const [showExitDialog, setShowExitDialog] = useState(false) //exit 

  // Tambah useEffect baru: Monitor status room dan auto-redirect ke game
  useEffect(() => {
    if (room?.status === 'playing' && !loading) {
      console.log('Lobby detected playing status, redirecting to game');
      router.replace(`/join/${roomCode}/game`);
    }
  }, [room?.status, loading, roomCode, router]);

  // Effect untuk sinkronisasi countdown (updated ke wall-time)
  useEffect(() => {
    if (!room?.countdown_start || room.status !== 'countdown') {
      setCountdown(0);
      return;
    }

    console.log('Starting wall-time countdown sync for lobby:', room.countdown_start);

    const countdownStartTime = new Date(room.countdown_start).getTime();
    const totalCountdown = 10; // Detik total

    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - countdownStartTime) / 1000);
      const remaining = Math.max(0, totalCountdown - elapsed);

      console.log('Lobby countdown remaining:', remaining);
      setCountdown(remaining);

      if (remaining <= 0) {
        console.log('Lobby countdown finished, redirecting to game');
        clearInterval(countdownInterval);
        router.replace(`/join/${roomCode}/game`);
      }
    };

    // Initial update
    updateCountdown();

    // Interval setiap detik
    const countdownInterval = setInterval(updateCountdown, 1000);

    // Cleanup
    return () => {
      console.log('Cleaning up lobby countdown interval');
      clearInterval(countdownInterval);
    };
  }, [room?.countdown_start, room?.status, roomCode, router]);

  useEffect(() => {
    if (!roomCode) return;

    let roomId = ''

    const bootstrap = async () => {
      // 1. Dapatkan roomId dari roomCode dengan countdown_start
      const { data: room, error: roomErr } = await supabase
        .from('game_rooms')
        .select('id, quiz_id, status, settings, countdown_start')
        .eq('room_code', roomCode)
        .single()

      if (roomErr || !room) {
        console.log('Player: Room not found', roomErr);
        router.replace('/')
        return
      }

      console.log('Player: Room data loaded', room);

      roomId = room.id
      setRoom(room)
      setGamePhase(room.status)

      // Immediate check: Kalau udah playing, redirect (handle refresh mid-game)
      if (room.status === 'playing') {
        console.log('Bootstrap detected playing, immediate redirect');
        router.replace(`/join/${roomCode}/game`);
        return; // Stop bootstrap
      }

      // Sync countdown jika sudah mulai
      if (room.status === 'countdown' && room.countdown_start) {
        const remaining = calculateCountdown(room.countdown_start, 10);
        console.log('Player: Initial countdown sync, remaining:', remaining);
        setCountdown(remaining);
      }

      // 2. Ambil judul quiz
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('title')
        .eq('id', room.quiz_id)
        .single()
      if (quiz) setQuizTitle(quiz.title)

      // 3. Ambil SEMUA player yang sudah join
      const { data: allPlayers, error: plErr } = await supabase
        .from('players')
        .select('id, nickname, car, joined_at')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

      if (!plErr && allPlayers) {
        setPlayers(allPlayers.map(p => ({ ...p, isReady: true })))
      }

      // 4. Dari list itu tentukan player mana saya
      const myNick = localStorage.getItem('nickname') || ''
      const me = allPlayers?.find(p => p.nickname === myNick)
      if (!me) {
        router.replace('/')
        return
      }

      setCurrentPlayer({ id: me.id, nickname: me.nickname, car: me.car || 'blue' })
      localStorage.setItem('playerId', me.id);

      // 5. Subscription untuk perubahan players
      const playerChannel = supabase
        .channel(`players:${roomCode}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
          payload => {
            const newOne = {
              id: payload.new.id,
              nickname: payload.new.nickname,
              car: payload.new.car || 'blue',
              joined_at: new Date(payload.new.joined_at),
              isReady: true
            }
            setPlayers(prev => [...prev, newOne])
          }
        )
          .on(  // Tambahan: Handler untuk DELETE
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
          payload => {
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
            // Jika player yang keluar adalah current player, redirect ke home
            if (payload.old.id === currentPlayer.id) {
              router.push('/')
            }
          }
        )
        .subscribe()

      // 6. Subscription untuk perubahan room dengan countdown_start (updated: auto-redirect playing)
      const roomChannel = supabase
        .channel(`room:${roomCode}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` },
          payload => {
            const newRoomData = payload.new;
            console.log('Lobby room update:', newRoomData.status);
            setGamePhase(newRoomData.status)
            setRoom(newRoomData)

            // Auto-redirect kalau status playing
            if (newRoomData.status === 'playing') {
              console.log('Subscription detected playing, redirecting to game');
              router.replace(`/join/${roomCode}/game`);
            }

            // Jika status berubah menjadi countdown, sync countdown
            if (newRoomData.status === 'countdown' && newRoomData.countdown_start) {
              const remaining = calculateCountdown(newRoomData.countdown_start, 10);
              setCountdown(remaining);
            }
          }
        )
        .subscribe()

      setLoading(false)

      return () => {
        supabase.removeChannel(playerChannel)
        supabase.removeChannel(roomChannel)
      }
    }

    bootstrap()
  }, [roomCode, router])

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  // sebelum return (atau di atas map)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === currentPlayer.id) return -1; // current player duluan
    if (b.id === currentPlayer.id) return 1;
    return 0;
  });

  if (loading) {
    return <LoadingRetro />; // Atau JSX loading kamu
  }

  // Countdown display component
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
    )
  }

  // Handler pilih car (auto-save ke Supabase)
  const handleSelectCar = async (selectedCar: string) => {
    if (!currentPlayer.id) return;

    const { error } = await supabase
      .from('players')
      .update({ car: selectedCar })
      .eq('id', currentPlayer.id);

    if (error) {
      console.error('Error updating car:', error);
      // Optional: Show toast error
    } else {
      setCurrentPlayer(prev => ({ ...prev, car: selectedCar }));
      // Update local players list juga
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, car: selectedCar } : p));
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

        <h1 className="fixed top-5 right-20 hidden md:block">
          <Image
            src="/gameforsmartlogo.webp"
            alt="Gameforsmart Logo"
            width={256}
            height={0}
          />
        </h1>

        <h1 className="fixed top-7 left-20 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
          Crazy Race
        </h1>

        {/* Judul Utama */}
        <div className="text-center mb-8">
          <h1 className="sm:max-w-none text-xl md:text-4xl lg:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            Waiting Room
          </h1>
        </div>

        {/* Players Grid - 5 per baris */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="bg-[#1a0a2a]/40 backdrop-blur-sm border-[#ff6bff]/50 pixel-card py-5 gap-3 mb-10">
            <CardHeader className="text-center px-5 mb-5">

              <motion.div
                className="relative flex items-center justify-center"
              >
                <Badge className="absolute bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] p-2 md:text-lg pixel-text glow-cyan top-0 left-0 gap-1 md:gap-3">
                  <Users className="!w-3 !h-3 md:!w-5 md:!h-5" />
                  {players.length}
                </Badge>

                {/* <h2 className="max-w-[10rem] sm:max-w-none text-xl md:text-4xl font-bold text-[#00ffff] pixel-text glow-cyan mx-2">WAITING ROOM</h2> */}

              </motion.div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Players Grid - 5 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {sortedPlayers.map((player) => (
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
                          src={carGifMap[player.car] || '/assets/car/car5.webp'}
                          alt={`${player.car} car`}
                          className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                        />
                      </div>

                      {/* Player Info */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <h3 className="text-white pixel-text text-sm leading-tight line-clamp-2">
                            {player.nickname}
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

        {/* Button Pilih Car (ganti dari EXIT) */}
        <div className="bg-[#1a0a2a]/50 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none w-full text-center py-3 fixed bottom-0 left-1/2 transform -translate-x-1/2 z-10">
          <Button className="bg-[#ff6bff] border-4 border-white pixel-button-large hover:bg-[#ff8aff] glow-pink px-8 py-3" onClick={() => setShowCarDialog(true)}>
            <span className="pixel-text text-lg">CHOOSE CAR</span>
          </Button>
          <Button className="bg-[#ff6bff] border-4 border-white pixel-button-large hover:bg-[#ff8aff] glow-pink px-8 py-3" onClick={() => setShowExitDialog(true)}>
          <span className="pixel-text text-lg">EXIT</span>
          </Button>
        </div>
      </div>

      {/*Dialog Verifikasi exit  */}
        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-[#1a0a2a]/90 border-[#ff6bff]/50 text-white max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00ffff] pixel-text">Keluar Ruangan?</DialogTitle>
            <DialogDescription className="text-gray-300">
              Kamu akan keluar dari ruangan {roomCode}. Pilihan lain tidak bisa join lagi kecuali host restart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowExitDialog(false)}
              className="border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/10"
            >
              Batal
            </Button>
            <Button
              onClick={handleExit}
              className="bg-[#ff6bff] hover:bg-[#ff8aff] border-white"
            >
              Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog/Modal Pilih Car - Mobile Friendly */}
      <Dialog open={showCarDialog} onOpenChange={setShowCarDialog}>
        <DialogOverlay className="bg-[#1a0a2a]/80 backdrop-blur-sm" />
        <DialogContent className="bg-[#1a0a2a]/90 border-[#ff6bff]/50 backdrop-blur-sm sm:max-w-md sm:h-auto overflow-auto p-0">
          <DialogHeader className="pt-4 pb-2 px-4"> {/* Kurangi padding top/bottom */}
            <DialogTitle className="text-[#00ffff] pixel-text glow-cyan text-center text-xl">Choose Your Car</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto"> {/* Tambah px-4 pb-4, gap tetap */}
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
                  className="h-20 w-24 mx-auto object-contain filter brightness-125 contrast-150 mb-2"
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
