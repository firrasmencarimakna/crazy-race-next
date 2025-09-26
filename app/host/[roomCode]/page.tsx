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
  "/images/host/gif1.gif",
]

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
  const [isGlitch, setIsGlitch] = useState(false)
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
        .select("id, nickname, joined_at")
        .eq("room_id", roomData.id)

      if (playersError) {
        console.error("Error fetching players:", playersError)
      } else {
        setPlayers(playersData || [])
      }

      // Set up real-time subscription for players
      const subscription = supabase
        .channel(`players:room=${roomCode}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomData.id}`,
          },
          (payload) => {
            setPlayers((prev) => [...prev, {
              id: payload.new.id,
              nickname: payload.new.nickname,
              joined_at: new Date(payload.new.joined_at),
            }])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }

    if (roomCode) {
      fetchRoomAndPlayers()
    }
  }, [roomCode])

  // Glitch effect (same as previous pages)
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitch(true)
        setTimeout(() => setIsGlitch(false), 100)
      }
    }, 3000)
    return () => clearInterval(glitchInterval)
  }, [])

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

  const getCarColor = (car: string) => {
    const colors = {
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    }
    return colors[car as keyof typeof colors] || "bg-gray-500"
  }

  if (countdown > 0) {
    return (
      <div className={`min-h-screen bg-[#1a0a2a] flex items-center justify-center pixel-font ${isGlitch ? 'glitch-effect' : ''}`}>
        <div className="text-center">
          <motion.div
            className="text-8xl font-bold text-[#00ffff] pixel-text glow-cyan race-pulse"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {countdown}
          </motion.div>
          <h2 className="text-3xl font-bold text-[#ff6bff] pixel-text glow-pink mt-4">Game Starting...</h2>
          <p className="text-xl text-gray-400 pixel-text glow-pink-subtle">Get ready to race!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font ${isGlitch ? 'glitch-effect' : ''}`}>
      {/* Preload Background GIFs */}
      {backgroundGifs.map((gif, index) => (
        <link key={index} rel="preload" href={gif} as="image" />
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

      {/* Header Controls */}
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <Button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-[#ff6bff] border-3 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
        >
          {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
        </Button>
      </div>

      <div className="relative z-10 max-w-8xl mx-auto p-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-5"
        >
          <div className="inline-block p-6">
            <h1 className="text-4xl md:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan">
              Crazy Race
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Room Info & QR Code */}
          <Card className="bg-[#1a0a2a]/60 border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-8 col-span-2">
            <div className="text-center space-y-2">
              {/* <h2 className="text-xl font-bold text-[#00ffff] pixel-text glow-cyan">Room Code</h2> */}

              <div className="relative p-5 bg-[#0a0a0f] border-3 border-[#6a4c93] rounded-lg">
                <div className="text-3xl font-bold text-[#00ffff] pixel-text glow-cyan">{roomCode}</div>
                <Button
                  onClick={copyRoomCode}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors"
                >
                  {copiedRoom ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-white" />}
                </Button>

              </div>

              <div className="relative p-5 bg-[#0a0a0f] border-3 border-[#6a4c93] rounded-lg">
                {/* QR normal */}
                <QRCode
                  value={joinLink}
                  size={356}
                  // bgColor="#0a0a0f"
                  // fgColor="#00ffff"
                  className="mx-auto p-2 bg-[#6a4c93] rounded-lg"
                />

                {/* Tombol maximize */}
                <Button
                  onClick={() => setOpen(true)}
                  className="absolute top-1 right-1 bg-transparent hover:bg-gray-500/20 transition-colors"
                >
                  <Maximize2 className="h-5 w-5 text-white" />
                </Button>

                {/* Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className="bg-[#0a0a0f] border-2 border-[#6a4c93] rounded-lg sm:max-w-3xl">
                    <div className="flex justify-center">
                      <QRCode
                        value={joinLink}
                        size={625}
                        // bgColor="#0a0a0f"
                        // fgColor="#00ffff"
                        className="p-3 bg-[#6a4c93] rounded-lg"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative p-5 bg-[#0a0a0f] border-3 border-[#6a4c93] rounded-lg">
                <div className="text-sm text-[#00ffff] pixel-text glow-cyan break-all">{joinLink}</div>
                <Button
                  onClick={copyJoinLink}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors"
                >
                  {copiedJoin ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-white" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Players List */}
          <Card className="bg-[#1a0a2a]/60 border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-8 col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#00ffff] pixel-text glow-cyan">{players.length} Player{players.length <= 1 ? "" : "s"}</h2>
              <Button
                onClick={startGame}
                disabled={players.length === 0 || gameStarted}
                className="text-lg py-4 bg-[#00ffff] border-3 border-white pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed"
              >
                <Play className="mr-2 h-5 w-5" />
                Start
              </Button>
            </div>

            <div className="space-y-4 mb-8">
              {players.length === 0 ? (
                <div className="text-center py-8 text-gray-400 pixel-text glow-pink-subtle">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for players to join...</p>
                </div>
              ) : (
                players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center space-x-4 p-4 bg-[#0a0a0f]/50 border-2 border-[#6a4c93] rounded-lg"
                  >
                    <div className={`w-8 h-6 ${getCarColor(player.car)} rounded-sm`}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#00ffff] pixel-text glow-cyan">{player.nickname}</div>
                      <div className="text-sm text-gray-400 pixel-text glow-pink-subtle">
                        Joined {new Date(player.joined_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge className="bg-[#ff6bff] text-black pixel-text glow-pink">{player.car} car</Badge>
                  </motion.div>
                ))
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
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8);
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
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
          transition: all 0.2s ease;
        }
        .pixel-card:hover {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4);
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
        .glitch-effect {
          animation: glitch 0.3s linear;
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
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
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
        /* Responsive */
        @media (max-width: 768px) {
          .pixel-border-large {
            padding: 1rem;
          }
          .pixel-button {
            padding: 0.5rem;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}