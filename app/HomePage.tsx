"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Flag, Volume2, VolumeX, Settings, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [joining, setJoining] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")

  useEffect(() => {
    localStorage.removeItem("nickname")
    localStorage.removeItem("playerId")
  }, [])

  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setRoomCode(code.toUpperCase())
      // hapus query string
      router.replace(pathname, undefined) // <--- ini otomatis bersih
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleJoin = async () => {
    if (!roomCode || !nickname || joining) return;
    setJoining(true);

    try {
      // Verify room exists
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, status")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error: Room not found", roomError)
        setJoining(false)
        return
      }

      // Check if room is in 'waiting' status
      if (roomData.status !== "waiting") {
        console.error("Error: Room is not accepting players")
        setJoining(false)
        return
      }

      // Insert player
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          nickname,
          car: ["red", "blue", "green", "yellow", "purple", "orange"][Math.floor(Math.random() * 6)]
        })

      if (playerError) {
        console.error("Error joining room:", playerError)
        setJoining(false)
        return
      }

      // Store nickname in localStorage
      localStorage.setItem("nickname", nickname)

      // Navigate to game page
      router.push(`/join/${roomCode}`)
    } catch (error) {
      console.error("Unexpected error:", error)
      setJoining(false)
    }
  }

  return (
    <div className={`min-h-[100dvh] w-full relative overflow-hidden pixel-font p-2`}>
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: "url('/images/carbackground.gif')" }}
      />

      {/* CRT Monitor Effect */}
      <div className="crt-effect"></div>

      {/* Static Noise */}
      <div className="noise-effect"></div>

      {/* Purple Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

      {/* Header Controls (Volume, Settings) */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        {/* kiri di mobile, kanan di desktop */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 sm:p-2 bg-[#ff6bff] border-2 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
        >
          {isMuted ? <VolumeX size={14} className="sm:w-4 sm:h-4" /> : <Volume2 size={14} className="sm:w-4 sm:h-4" />}
        </button>
        <button className="p-1.5 sm:p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan">
          <Settings size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        {/* Main Title dengan efek pixel art */}
        <div className="text-center relative pb-5 sm:pt-3 pt-16 space-y-3">
          {/* Title Border */}
          <div className="pixel-border-large mx-auto" >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-white pixel-text-outline">
              CRAZY
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] pixel-text">
              RACE
            </h2>
          </div>

          {/* Subtitle dengan pixel border */}
          <div className="pixel-border-small inline-block">
            <p className="text-sm md:text-base text-purple px-4 py-2 bg-[#] pixel-text">
              ANSWER • RACE • WIN
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="
        grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full px-4
        sm:grid-rows-1 grid-rows-2 sm:grid-flow-row grid-flow-dense
        max-sm:[grid-template-areas:'join'_'host']">
          {/* Host Game Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:host]"
          >
            <Link href="/host">
              <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 hover:border-[#ff6bff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(255,107,255,0.3)] pixel-card">
                <CardHeader className="text-center">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-[#ff6bff] to-[#1a0a2a] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_15px_rgba(255,107,255,0.7)] transition-all duration-300"
                    whileHover={{ rotate: 5 }}
                  >
                    <Flag className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-xl font-bold text-[#ff6bff] pixel-text glow-pink">
                    HOST GAME
                  </CardTitle>
                  <CardDescription className="text-[#ff6bff]/80 text-sm pixel-text glow-pink-subtle">
                    Create your own race and challenge others
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-[#ff6bff] to-[#d400ff] hover:from-[#ff8aff] hover:to-[#e633ff] text-white border-2 border-[#ff6bff] pixel-button-large retro-button glow-pink">
                    Create Room
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Join Race Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group max-sm:[grid-area:join]"
          >
            <Card className="bg-[#1a0a2a]/40 border-[#00ffff]/50 hover:border-[#00ffff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(0,255,255,0.3)] pixel-card">
              <CardHeader className="text-center">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-br from-[#00ffff] to-[#1a0a2a] border-2 border-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_15px_rgba(0,255,255,0.7)] transition-all duration-300"
                  whileHover={{ rotate: -5 }}
                >
                  <Users className="w-8 h-8 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-bold text-[#00ffff] pixel-text glow-cyan">
                  JOIN RACE
                </CardTitle>
                <CardDescription className="text-[#00ffff]/80 text-sm pixel-text glow-cyan-subtle">
                  Enter a code to join an existing race
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  maxLength={6}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                    setRoomCode(value);
                  }}
                  className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30"
                  aria-label="Room Code"
                />
                <Input
                  placeholder="Nickname"
                  value={nickname}
                  maxLength={26}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-[#1a0a2a]/50 border-[#00ffff]/50 text-[#00ffff] placeholder:text-[#00ffff]/50 text-center text-sm pixel-text h-10 rounded-xl focus:border-[#00ffff] focus:ring-[#00ffff]/30"
                  aria-label="Nickname"
                />

              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  className={`w-full bg-gradient-to-r from-[#00ffff] to-[#0099cc] hover:from-[#33ffff] hover:to-[#00aadd] text-white border-2 border-[#00ffff] pixel-button-large retro-button glow-cyan ${!roomCode || !nickname ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={roomCode.length !== 6 || !nickname || joining}
                >
                  JOIN
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Pixel Art Decoration */}
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

        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 opacity-30">
          <div className="w-6 h-6 border-2 border-[#00ffff]"></div>
        </div>
        <div className="absolute top-4 right-4 opacity-30">
          <div className="w-6 h-6 border-2 border-[#ff6bff]"></div>
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
          }

          .retro-button:hover {
            transform: scale(1.05);
            box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 107, 255, 0.6);
            filter: brightness(1.2);
          }

          .pixel-border-large {
            border: 4px solid #00ffff;
            position: relative;
            background: linear-gradient(45deg, #1a0a2a, #2d1b69);
            padding: 2rem;
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
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E");
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

          @politics: scanline {
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

            
          }
            
        `}</style>


    </div>
  )
}