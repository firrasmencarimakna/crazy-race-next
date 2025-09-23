"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Car, ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { ConnectionStatus } from "@/components/connection-status"
import { motion, AnimatePresence } from "framer-motion"

// Mock lobby data - in real app this would come from real-time database
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
  ],
}

// List of background GIFs in filename order
const backgroundGifs = [
  "/images/lobbyphase/gif1.gif",
  "/images/lobbyphase/gif2.gif",
  "/images/lobbyphase/gif3.gif",
  "/images/lobbyphase/gif4.gif",
  "/images/lobbyphase/gif5.gif",
  "/images/lobbyphase/gif6.gif",
]

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // Mock current player data - would come from session/auth
  const currentPlayer = { id: "player-1", nickname: "SpeedRacer", car: "red" }

  const { isConnected, players, gamePhase, joinRoom } = useMultiplayer(roomCode, currentPlayer.id)

  const [countdown, setCountdown] = useState(0)
  const [gameStarting, setGameStarting] = useState(false)
  const [isGlitch, setIsGlitch] = useState(false)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitch(true)
        setTimeout(() => setIsGlitch(false), 100)
      }
    }, 3000)
    return () => clearInterval(glitchInterval)
  }, [])

  // Background image cycling with smooth transition
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setIsTransitioning(true)
      
      // Start fade out
      setTimeout(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
        
        // Complete fade in
        setTimeout(() => {
          setIsTransitioning(false)
        }, 500)
      }, 500)
      
    }, 5000) // Total cycle: 5 seconds (2.5s visible, 1s transition, 1.5s visible)
    
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

  const getCarColor = (car: string) => {
    const colors = {
      red: "bg-gradient-to-r from-[#ff6bff] to-[#d400ff] glow-pink",
      blue: "bg-gradient-to-r from-[#00ffff] to-[#0099cc] glow-cyan",
      green: "bg-gradient-to-r from-[#00ff00] to-[#00cc00] glow-green",
      yellow: "bg-gradient-to-r from-[#ffff00] to-[#ffcc00] glow-yellow",
      purple: "bg-gradient-to-r from-[#cc00cc] to-[#990099] glow-purple",
      orange: "bg-gradient-to-r from-[#ff9900] to-[#cc6600] glow-orange",
    }
    return colors[car as keyof typeof colors] || "bg-gray-500"
  }

  const getCarEmoji = (car: string) => {
    const emojis = {
      red: "🏎️",
      blue: "🚗",
      green: "🚙",
      yellow: "🚕",
      purple: "🚐",
      orange: "🚛",
    }
    return emojis[car as keyof typeof emojis] || "🚗"
  }

  if (countdown > 0) {
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
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

        {/* <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} /> */}
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
            <div className="mt-12 flex justify-center space-x-8">
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className="text-center relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`w-16 h-10 ${getCarColor(player.car)} rounded-md mb-2 mx-auto relative border-4 border-white animate-neon-bounce pixel-button`}>
                    <Car className="h-8 w-8 text-white relative z-10" />
                  </div>
                  <div className="text-sm font-bold text-white pixel-text">{player.nickname}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
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

      {/* <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} /> */}

      <div className="relative z-10 max-w-6xl mx-auto pt-8">

        {/* ———————————————————————————————————————— */}
        {/* JUDUL UTAMA: CRAZY RACE — DIPERBESAR & CENTERED */}
        {/* ———————————————————————————————————————— */}
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold text-[#00ffff] pixel-text glow-cyan mb-4 tracking-wider">
            CRAZY RACE
          </h1>
          <p className="text-xl md:text-2xl text-[#ff6bff] pixel-text glow-pink-subtle">
            Access Code: {roomCode.toUpperCase()}
          </p>
        </div>

        {/* ———————————————————————————————————————— */}
        {/* HEADER BAR: Tombol Kiri | Kosong Tengah | Badge Kanan */}
        {/* ———————————————————————————————————————— */}
        <div className="flex items-center justify-between mb-8 px-4">


          {/* KOSONG — karena judul sudah di atas */}
          <div></div>

        </div>

        {/* Players List - Cyber Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="group"
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-card">
            <CardHeader className="text-center">
              <motion.div
                className="flex items-center justify-center mb-4"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Activity className="mr-2 h-8 w-8 text-[#00ffff] glow-cyan animate-pulse" />
                <h2 className="text-3xl font-bold text-[#00ffff] pixel-text glow-cyan">ACTIVE TERMINALS</h2>
              </motion.div>
              <Badge className="bg-[#1a0a2a]/50 border-[#00ff00] text-[#00ff00] pixel-text glow-green">
                {players.filter((p) => p.isReady).length}/{players.length} SYNCHRONIZED
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    className={`p-6 rounded-xl border-4 transition-all duration-300 bg-[#1a0a2a]/20 relative overflow-hidden ${
                      player.id === currentPlayer.id 
                        ? "border-[#00ffff] glow-cyan" 
                        : "border-[#ff6bff]/50 hover:border-[#ff6bff] glow-pink-subtle"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div
                          className={`w-16 h-10 ${getCarColor(player.car)} rounded-md flex items-center justify-center border-4 border-white relative pixel-button`}
                        >
                          <Car className="h-8 w-8 text-white relative z-10" />
                        </div>
                        {player.isReady && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#00ff00]/80 border-2 border-[#00ff00] rounded-full flex items-center justify-center animate-bounce">
                            <div className="w-3 h-3 bg-[#00ff00] rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-white pixel-text">{player.nickname}</h3>
                          {player.id === currentPlayer.id && (
                            <Badge className="bg-[#00ffff]/20 text-[#00ffff] border-[#00ffff]/50 text-xs pixel-text glow-cyan-subtle">
                              CORE USER
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-[#ff6bff] pixel-text capitalize">{player.car} VECTOR</div>
                      </div>
                      <div className="text-right">
                        {player.isReady ? (
                          <Badge className="bg-[#00ff00]/80 text-black border-[#00ff00] pixel-text glow-green animate-pulse">
                            ONLINE
                          </Badge>
                        ) : (
                          <Badge className="border-[#ffff00] text-[#ffff00] pixel-text glow-yellow-subtle">
                            SCANNING
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {gameStarting ? (
                <div className="mt-12 text-center">
                  <div className="p-8 bg-[#1a0a2a]/50 rounded-xl border-4 border-[#00ffff] pixel-border-small glow-cyan">
                    <h3 className="text-2xl font-bold text-[#00ffff] mb-4 pixel-text glow-cyan animate-pulse">NETWORK BREACH IMMINENT</h3>
                    <p className="text-white pixel-text glow-cyan-subtle">Core operator has initiated protocol. Prepare neural interface.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-12 text-center">
                  <div className="p-8 bg-[#1a0a2a]/50 rounded-xl border-4 border-[#ff6bff] pixel-border-small glow-pink">
                    <Clock className="h-16 w-16 mx-auto mb-6 text-[#ff6bff] glow-pink animate-spin-slow" />
                    <h3 className="text-xl font-bold mb-4 text-[#ff6bff] pixel-text glow-pink">STANDBY MODE</h3>
                    <p className="text-white pixel-text glow-pink-subtle">Awaiting core operator signal for grid activation</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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
        .pixel-border-small {
          border: 2px solid #ffff00;
          background: #1a0a2a;
          box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
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
        .glow-green {
          animation: glow-green 1.5s ease-in-out infinite;
        }
        .glow-yellow-subtle {
          animation: glow-yellow 2s ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(255, 255, 0, 0.5));
        }
        .glow-purple {
          animation: glow-purple 1.5s ease-in-out infinite;
        }
        .glow-orange {
          animation: glow-orange 1.5s ease-in-out infinite;
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
        @keyframes glow-green {
          0%, 100% { filter: drop-shadow(0 0 5px #00ff00); }
          50% { filter: drop-shadow(0 0 15px #00ff00); }
        }
        @keyframes glow-yellow {
          0%, 100% { filter: drop-shadow(0 0 5px #ffff00); }
          50% { filter: drop-shadow(0 0 15px #ffff00); }
        }
        @keyframes glow-purple {
          0%, 100% { filter: drop-shadow(0 0 5px #cc00cc); }
          50% { filter: drop-shadow(0 0 15px #cc00cc); }
        }
        @keyframes glow-orange {
          0%, 100% { filter: drop-shadow(0 0 5px #ff9900); }
          50% { filter: drop-shadow(0 0 15px #ff9900); }
        }
        @keyframes neon-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}