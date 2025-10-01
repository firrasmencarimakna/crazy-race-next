"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Users, Play, ArrowLeft, VolumeX, Volume2, Maximize2, Check } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// List of background GIFs (same as previous pages for consistency)
const backgroundGifs = [
  "/assets/gif/4.gif",
]

const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.gif",
  blue: "/assets/car/car2.gif",
  green: "/assets/car/car3.gif",
  yellow: "/assets/car/car4.gif",
  purple: "/assets/car/car5.gif",
  orange: "/assets/car/car5.gif",
}

export default function HostRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [players, setPlayers] = useState<any[]>([])
  const [room, setRoom] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [open, setOpen] = useState(false);
  const [joinLink, setJoinLink] = useState('')
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  // Base URL for the join link (replace with your app's URL)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinLink(`${window.location.origin}/?code=${roomCode}`)
    }
  }, [roomCode])

  // Fetch room details and set up real-time player subscription
  useEffect(() => {
    const fetchRoomAndPlayers = async () => {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, settings, questions, status")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError)
        setIsConnected(false)
        return
      }

      setRoom(roomData)
      setIsConnected(true)

      // Fetch initial players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, nickname, car, joined_at")
        .eq("room_id", roomData.id)

      if (playersError) {
        console.error("Error fetching players:", playersError)
      } else {
        setPlayers(playersData || [])
      }

      // Set up real-time subscription for players
      const subscription = supabase
        .channel(`host-${roomCode}`)
        .on(
          'postgres_changes',
          {
            event: '*', // <-- INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomData.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setPlayers((prev) => {
                const exists = prev.some((p) => p.id === payload.new.id);
                if (exists) return prev;
                return [...prev, payload.new];
              });
            }
            if (payload.eventType === 'DELETE') {
              setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription)
      }
    }

    if (roomCode) {
      fetchRoomAndPlayers()
    }
  }, [roomCode])

  // Background image cycling (same as previous pages)
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

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch (err) {
      console.error("Room copy failed:", err);
    }
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
    } catch (err) {
      console.error("Join copy failed:", err);
    }
  };

  const startGame = async () => {
    if (players.length === 0 || !room) return

    // Update room status to countdown
    const { error } = await supabase
      .from("game_rooms")
      .update({ status: "countdown" })
      .eq("room_code", roomCode)

    if (error) {
      console.error("Error starting game:", error)
      return
    }

    setGameStarted(true)
    setCountdown(10)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/host/${roomCode}/game`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  if (countdown > 0) {
    return (
      <div className={`min-h-screen bg-[#1a0a2a] flex items-center justify-center pixel-font`}>
        <div className="text-center">
          <motion.div
            className="text-6xl md:text-8xl font-bold text-[#00ffff] pixel-text glow-cyan race-pulse"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {countdown}
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font`}>
      {/* Preload Background GIFs */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
      ))}
      {Object.values(carGifMap).map((gif, idx) => (
        <link key={`car-${idx}`} rel="preload" href={gif} as="image" />
      ))}

      {/* Background Image with Smooth Transition */}
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

      {/* CRT Monitor Effect */}
      <div className="crt-effect"></div>
      {/* Static Noise */}
      <div className="noise-effect"></div>
      {/* Purple Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-100/20 pointer-events-none"></div>

      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 opacity-30 hidden sm:block">
        <div className="w-6 h-6 border-2 border-[#00ffff]"></div>
      </div>
      <div className="absolute top-4 right-4 opacity-30 hidden sm:block">
        <div className="w-6 h-6 border-2 border-[#ff6bff]"></div>
      </div>
      <div className="absolute bottom-4 left-4 opacity-40 hidden sm:block">
        <div className="flex gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#00ffff]"></div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 opacity-40 hidden sm:block">
        <div className="flex flex-col gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#ff6bff]"></div>
          ))}
        </div>
      </div>

      {/* Header Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-[#ff6bff] border-2 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
          size="sm"
        >
          {isMuted ? <VolumeX size={14} className="text-white" /> : <Volume2 size={14} className="text-white" />}
        </Button>
      </div>

      <div className="relative z-10 max-w-8xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-4 sm:pb-5"
        >
          <div className="inline-block p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan">
              Crazy Race
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* Room Info & QR Code */}
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-4 sm:p-6 md:p-8 lg:col-span-2 order-2 lg:order-1">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] border-2 sm:border-3 border-[#6a4c93] rounded-lg">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#00ffff] pixel-text glow-cyan">{roomCode}</div>
                <Button
                  onClick={copyRoomCode}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  {copiedRoom ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                </Button>
              </div>

              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] border-2 sm:border-1 rounded-lg">
                {/* QR normal */}
                <QRCode
                  value={joinLink}
                  size={256}
                  className="mx-auto w-full max-w-[280px] sm:max-w-none"
                />

                {/* Tombol maximize */}
                <Button
                  onClick={() => setOpen(true)}
                  className="absolute top-1 right-1 bg-transparent hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </Button>

                {/* Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className="bg-[#0a0a0f] border-2 border-[#6a4c93] rounded-lg max-w-[90vw] sm:max-w-3xl p-4 sm:p-6">
                    <div className="flex justify-center">
                      <QRCode
                        value={joinLink}
                        size={Math.min(625, window.innerWidth * 0.8)}
                        className=" rounded-lg w-full"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] border-2 sm:border-3 border-[#6a4c93] rounded-lg">
                <div className="text-xs sm:text-sm text-[#00ffff] pixel-text glow-cyan break-all">{joinLink}</div>
                <Button
                  onClick={copyJoinLink}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  {copiedJoin ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Players List */}
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-4 sm:p-6 md:p-8 lg:col-span-3 order-1 lg:order-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#00ffff] pixel-text glow-cyan text-center sm:text-left">
                {players.length} Player{players.length <= 1 ? "" : "s"}
              </h2>
              <Button
                onClick={startGame}
                disabled={players.length === 0 || gameStarted}
                className="text-base sm:text-lg py-3 sm:py-4 bg-[#00ffff] border-2 sm:border-3 border-white pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Start Game
              </Button>
            </div>

            <div className="space-y-4 mb-6 sm:mb-8">
              {players.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400 pixel-text">
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {players.map((player) => (
                    <motion.div
                      key={player.id}
                      className="relative group glow-pink-subtle"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 sm:border-3 border-double transition-all duration-300 
                   bg-transparent backdrop-blur-sm 
                   border-[#ff6bff]/70 hover:border-[#ff6bff]"
                      >
                        {/* Car GIF */}
                        <div className="relative mb-2 sm:mb-3">
                          <img
                            src={carGifMap[player.car] || '/assets/car/car5.gif'}
                            alt={`${player.car} car`}
                            className="h-16 sm:h-20 md:h-24 lg:h-28 w-20 sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce
                       filter brightness-125 contrast-150"
                          />
                        </div>

                        {/* Player Nickname */}
                        <div className="text-center">
                          <h3 className="font-bold text-white pixel-text text-xs sm:text-sm leading-tight glow-text line-clamp-2">
                            {player.nickname}
                          </h3>
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
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }
        .pixel-button:hover:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
        }
        .pixel-border-large {
          border: 4px solid #00ffff;
          background: linear-gradient(45deg, #1a0a2a, #2d1b69);
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
        .pixel-card {
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
          transition: all 0.2s ease;
        }
        .pixel-card:hover {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4);
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
        .race-pulse {
          animation: race-pulse 0.5s ease-in-out infinite;
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
        @keyframes race-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
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
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Responsive improvements */
        @media (max-width: 640px) {
          .pixel-button {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
          .pixel-card {
            margin-bottom: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .pixel-text {
            font-size: 0.75rem;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}