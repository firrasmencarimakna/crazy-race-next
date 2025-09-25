"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { ConnectionStatus } from "@/components/connection-status"
import { motion, AnimatePresence } from "framer-motion"

// Mock lobby data
const mockLobbyData = {
  roomCode: "ABC123",
  quiz: "General Knowledge",
  questionCount: 10,
  duration: 60,
  host: "GameMaster",
  players: [
    { id: "player-1", nickname: "SpeedRacer", car: "red", isReady: true },
    { id: "player-2", nickname: "QuizMaster", car: "blue", isReady: true },
    { id: "player-3", nickname: "FastLane", car: "green", isReady: false },
    { id: "player-4", nickname: "RoadRunner", car: "yellow", isReady: true },
    { id: "player-5", nickname: "Thunder", car: "purple", isReady: true },
    { id: "player-6", nickname: "Lightning", car: "orange", isReady: false },
  ],
}

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

  // Mock current player
  const currentPlayer = { id: "player-1", nickname: "SpeedRacer", car: "red" }

  const { isConnected, players, gamePhase, joinRoom } = useMultiplayer(roomCode, currentPlayer.id)

  const [countdown, setCountdown] = useState(0)
  const [gameStarting, setGameStarting] = useState(false)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  useEffect(() => {
    if (roomCode && currentPlayer.id) {
      joinRoom(currentPlayer.nickname, currentPlayer.car)
    }
  }, [roomCode, currentPlayer.id, currentPlayer.nickname, currentPlayer.car, joinRoom])

  useEffect(() => {
    if (gamePhase === "quiz" && !gameStarting) {
      setGameStarting(true)
      setCountdown(10)
    }
  }, [gamePhase, gameStarting])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push(`/play/quiz/${roomCode}`)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [countdown, router, roomCode])

  if (countdown > 0) {
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

        <div className="relative z-10 flex items-center justify-center min-h-screen text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="pixel-border-large p-8"
          >
            <div className="text-9xl font-bold text-[#00ffff] mb-4 pixel-text glow-cyan">
              {countdown}
            </div>
            <h2 className="text-4xl font-bold mb-2 text-[#ff6bff] pixel-text glow-pink">SYSTEM BOOT</h2>
            <p className="text-xl text-white pixel-text glow-cyan-subtle">Neural link engaged... Query protocols loading...</p>

            {/* Players Grid - 5 per row */}
            <div className="mt-12 grid grid-cols-5 gap-4 max-w-4xl mx-auto">
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className="text-center relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <img
                      src={carGifMap[player.car] || "/images/car/car5.gif"}
                      alt={`${player.car} car`}
                      className="h-32 w-48 mx-auto mb-2 relative z-10 pointer-events-none object-contain animate-neon-bounce"
                    />
                    {player.isReady && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#00ff00] border-2 border-[#00ff00] rounded-full flex items-center justify-center animate-bounce">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white pixel-text px-2 py-1 rounded">
                    {player.nickname}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    )
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
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card">
            <CardHeader className="text-center">

              <motion.div
                className="relative flex items-center justify-center"
              >
                <Badge className="absolute bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] px-4 py-2 text-lg pixel-text glow-cyan top-0 left-0">
                  <Users className="h-5 w-5 mr-2" />
                  {players.length}
                </Badge>
                <Activity className="mr-3 h-10 w-10 text-[#00ffff] glow-cyan animate-pulse" />
                <h2 className="text-4xl font-bold text-[#00ffff] pixel-text glow-cyan">WAITING ROOM</h2>
                <Activity className="ml-3 h-10 w-10 text-[#00ffff] glow-cyan animate-pulse" />

              </motion.div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Players Grid - 5 columns */}
              <div className="grid grid-cols-5 gap-6 mb-8">
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
                          {player.id === currentPlayer.id && (
                            <Badge className="bg-transparent text-[#00ffff] border-[#00ffff]/70 text-xs pixel-text glow-cyan-subtle">
                              YOU
                            </Badge>
                          )}
                        </div>

                        {/* Status Badge */}
                        <Badge
                          className={`text-xs pixel-text bg-transparent ${player.isReady
                            ? 'text-[#00ff00] border-[#00ff00]/70 glow-green animate-pulse'
                            : 'text-[#ff6bff] border-[#ff6bff]/70 glow-pink-subtle'
                            }`}
                        >
                          {player.isReady ? 'ONLINE' : 'WAITING'}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Game Status */}
              {gameStarting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="p-6 bg-[#1a0a2a]/50 rounded-xl border-4 border-[#00ffff] pixel-border-small glow-cyan">
                    <h3 className="text-2xl font-bold text-[#00ffff] mb-3 pixel-text glow-cyan animate-pulse">
                      GAME STARTING SOON
                    </h3>
                    <p className="text-white pixel-text glow-cyan-subtle">
                      Prepare for the race! Starting in {countdown} seconds...
                    </p>
                  </div>
                </motion.div>
              )}
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
        .glitch-effect {
          animation: glitch 0.3s linear;
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
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
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