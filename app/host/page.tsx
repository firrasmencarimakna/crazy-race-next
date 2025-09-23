"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Clock, Star, Zap, Volume2, VolumeX, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function QuestionListPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isGlitch, setIsGlitch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching quizzes:", error)
      } else {
        setQuizzes(data || [])
      }
      setLoading(false)
    }

    fetchQuizzes()
  }, [])

  // Filter soal
  const filteredQuestions = quizzes.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function handleSelectQuiz(quizId: string, router: any) {
  const roomCode = generateRoomCode();

  const { data, error } = await supabase
    .from("game_rooms")
    .insert({
      room_code: roomCode,
      quiz_id: quizId,
      settings: {} // tetap bisa isi default JSON
    })
    .select("room_code")
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return;
  }

  router.push(`/host/${data.room_code}/settings`);
}


  // Efek glitch sesekali
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitch(true)
        setTimeout(() => setIsGlitch(false), 100)
      }
    }, 3000)
    return () => clearInterval(glitchInterval)
  }, [])

  // Canvas background animasi (sama seperti HomePage)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const pixelSize = 8
    const cols = Math.ceil(canvas.width / pixelSize)
    const rows = Math.ceil(canvas.height / pixelSize)

    const palette = [
      '#0a0a0f', '#1a0a2a', '#2d1b69', '#6a4c93', '#9d7cce',
      '#ff6bff', '#00ffff', '#ffff00'
    ]

    const drawBackground = () => {
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if ((x + y) % 3 === 0 && Math.random() > 0.8) {
            const colorIndex = Math.floor(Math.random() * 4) + 1
            ctx.fillStyle = palette[colorIndex]
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
          }
        }
      }
    }

    drawBackground()

    const drawScanlines = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillRect(0, y, canvas.width, 1)
      }
    }

    drawScanlines()

    const racingPixels = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 4 + 3,
      color: palette[Math.floor(Math.random() * 3) + 5],
      size: Math.random() * 4 + 2
    }))

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawBackground()

      racingPixels.forEach(pixel => {
        pixel.x += pixel.speed
        if (pixel.x > canvas.width) {
          pixel.x = -10
          pixel.y = Math.random() * canvas.height
        }

        const drawX = Math.floor(pixel.x / pixelSize) * pixelSize
        const drawY = Math.floor(pixel.y / pixelSize) * pixelSize
        ctx.fillStyle = pixel.color
        ctx.fillRect(drawX, drawY, pixelSize, pixelSize)

        ctx.shadowBlur = 15
        ctx.shadowColor = pixel.color
        ctx.fillRect(drawX, drawY, pixelSize, pixelSize)
        ctx.shadowBlur = 0
      })

      drawScanlines()
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className={`w-full bg-gradient-to-br from-[#0a0a0f] via-[#1a0a2a] to-[#0a0a0f] relative  pixel-font ${isGlitch ? 'glitch-effect' : ''}`}>

      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* CRT & Noise Effect */}
      <div className="crt-effect"></div>
      <div className="noise-effect"></div>

      {/* Purple Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

      {/* Header Controls */}
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-[#ff6bff] border-2 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
          <button className="p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan">
          <ArrowLeft size={16} />
        </button>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">

        {/* Title */}
        <div className="text-center mb-12">
          <div className="pixel-border-large inline-ck mb-6">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] pixel-text-outline">
              Select Quiz
            </h1>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[#1a0a2a]/60 border-2 border-[#6a4c93] rounded-xl p-6 mb-8 pixel-card">
          <div className="space-y-4">

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Cari soal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0a0a0f] border-2 border-[#6a4c93] text-white placeholder:text-gray-400 focus:border-[#00ffff] focus:ring-0 text-lg pixel-text"
              />
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        {loading ? (
          <p className="text-center text-white">Loading...</p>
        ) : filteredQuestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuestions.map((quiz) => (
              <motion.div key={quiz.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="bg-[#1a0a2a]/60 border-2 border-[#6a4c93]">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-200 mb-4 line-clamp-3">{quiz.description}</p>
                    <p className="flex items-center gap-2 text-gray-400 text-sm">
                      <HelpCircle /> {quiz.questions?.length ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">No quiz found</p>
        )}


        {/* Corner Decorations */}
        <div className="absolute bottom-8 left-8 opacity-40">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-[#00ffff]"></div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 right-8 opacity-40">
          <div className="flex flex-col gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-[#ff6bff]"></div>
            ))}
          </div>
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
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }

        .pixel-button:hover {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8);
        }

        .pixel-card {
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.2s ease;
        }

        .pixel-card:hover {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.9);
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

        .glitch-effect {
          animation: glitch 0.3s linear;
        }

        .glow-pink {
          animation: glow-pink 1.5s ease-in-out infinite;
        }

        .glow-cyan {
          animation: glow-cyan 1.5s ease-in-out infinite;
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

        /* Responsive */
        @media (max-width: 768px) {
          .pixel-border-large {
            padding: 1rem;
          }
          
          .pixel-button {
            padding: 0.5rem 1rem;
            font-size: 0.8rem;
          }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}