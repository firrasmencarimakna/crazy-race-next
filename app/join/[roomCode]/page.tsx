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

// Background GIFs
const backgroundGifs = [
  "/images/lobbyphase/gif1.gif",
  "/images/lobbyphase/gif2.gif",
  "/images/lobbyphase/gif3.gif",
  "/images/lobbyphase/gif4.gif",
  "/images/lobbyphase/gif5.gif",
  "/images/lobbyphase/gif6.gif",
]

// Mapping warna mobil ke file GIF mobil
const carGifMap: Record<string, string> = {
  red: "/images/car/car1.gif",
  blue: "/images/car/car2.gif",
  green: "/images/car/car3.gif",
  yellow: "/images/car/car4.gif",
  purple: "/images/car/car5.gif",
  orange: "/images/car/car5.gif",
}

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const [currentPlayer, setCurrentPlayer] = useState({
    id: null,
    nickname: "",
    car: null
  })

  const [players, setPlayers] = useState<any[]>([])
  const [room, setRoom] = useState<any>(null)
  const [quizTitle, setQuizTitle] = useState("")
  const [gamePhase, setGamePhase] = useState("waiting")
  const [countdown, setCountdown] = useState(0)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Effect untuk sinkronisasi countdown
  useEffect(() => {
    if (!room?.countdown_start || room.status !== 'countdown') return;

    const syncAndStartCountdown = () => {
      const remaining = calculateCountdown(room.countdown_start, 10);
      setCountdown(remaining);

      if (remaining <= 0) {
        // Countdown sudah selesai, langsung pindah ke game
        router.push(`/join/${roomCode}/game`);
        return;
      }

      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          const newCountdown = prev - 1;
          if (newCountdown <= 0) {
            clearInterval(timer);
            router.push(`/join/${roomCode}/game`);
            return 0;
          }
          return newCountdown;
        });
      }, 1000);

      return () => clearInterval(timer);
    };

    const timerCleanup = syncAndStartCountdown();
    return timerCleanup;
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
        .subscribe()

      // 6. Subscription untuk perubahan room dengan countdown_start
      const roomChannel = supabase
        .channel(`room:${roomCode}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` },
          payload => {
            const newRoomData = payload.new;
            setGamePhase(newRoomData.status)
            setRoom(newRoomData)

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

  // Countdown display component
  if (countdown > 0) {
    return (
      <div className={`min-h-screen bg-[#1a0a2a] flex items-center justify-center pixel-font`}>
        <div className="text-center">
          <motion.div
            className="text-8xl font-bold text-[#00ffff] pixel-text glow-cyan race-pulse"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {countdown}
          </motion.div>
          <p className="text-[#00ffff] pixel-text mt-4">Game starting...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <LoadingRetro />
  }

  return (
    <div className={`min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font`}>
      {/* Preload semua GIF */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
      ))}
      {Object.values(carGifMap).map((gif, idx) => (
        <link key={`car-${idx}`} rel="preload" href={gif} as="image" />
      ))}

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

      {/* Overlay Effects */}
      <div className="crt-effect"></div>
      <div className="noise-effect"></div>
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

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        {/* Judul Utama */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            CRAZY RACE
          </h1>
        </div>

        {/* Players Grid - 5 per baris */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card py-5">
            <CardHeader className="text-center px-5">

              <motion.div
                className="relative flex items-center justify-center"
              >
                <Badge className="absolute bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] p-2 md:text-lg pixel-text glow-cyan top-0 left-0 gap-1 md:gap-3">
                  <Users className="!w-3 !h-3 md:!w-5 md:!h-5" />
                  {players.length}
                </Badge>

                <Activity className="w-10 text-[#00ffff] glow-cyan animate-pulse" />
                <h2 className="text-xl md:text-4xl font-bold text-[#00ffff] pixel-text glow-cyan mx-2">WAITING ROOM</h2>
                <Activity className="w-10 text-[#00ffff] glow-cyan animate-pulse" />

              </motion.div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Players Grid - 5 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {players.map((player) => (
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
                          src={carGifMap[player.car] || '/images/car/car5.gif'}
                          alt={`${player.car} car`}
                          className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                        />
                        {/* Ready Status Indicator */}
                        {player.isReady && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#00ff00] border-2 border-white rounded-full flex items-center justify-center animate-pulse glow-green">
                            <div className="w-4 h-4 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <h3 className="font-bold text-white pixel-text text-sm leading-tight glow-text">
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

        {/* Exit Button */}
        <div className="text-center mt-8">
          <Link href="/">
            <Button className="bg-[#ff6bff] border-4 border-white pixel-button-large hover:bg-[#ff8aff] glow-pink px-8 py-3">
              <span className="pixel-text text-lg">EXIT</span>
            </Button>
          </Link>
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