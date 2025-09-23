"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Clock, Star, Zap, Volume2, VolumeX } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

export default function QuestionListPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isGlitch, setIsGlitch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)

  // Mock data soal
  const mockQuestions = [
    {
      id: 1,
      category: "science",
      categoryName: "SCIENCE",
      difficulty: "easy",
      difficultyName: "EASY",
      time: 30,
      question: "Apa simbol kimia untuk emas?",
      color: "#00ffff"
    },
    {
      id: 2,
      category: "history",
      categoryName: "HISTORY",
      difficulty: "medium",
      difficultyName: "MEDIUM",
      time: 20,
      question: "Siapa presiden pertama Indonesia?",
      color: "#ff6bff"
    },
    {
      id: 3,
      category: "sports",
      categoryName: "SPORTS",
      difficulty: "hard",
      difficultyName: "HARD",
      time: 15,
      question: "Di tahun berapa Michael Jordan pensiun pertama kali?",
      color: "#ffff00"
    },
    {
      id: 4,
      category: "entertainment",
      categoryName: "ENTERTAINMENT",
      difficulty: "easy",
      difficultyName: "EASY",
      time: 30,
      question: "Siapa sutradara film Avatar?",
      color: "#ff4444"
    },
    {
      id: 5,
      category: "geography",
      categoryName: "GEOGRAPHY",
      difficulty: "insane",
      difficultyName: "INSANE",
      time: 10,
      question: "Apa nama danau terdalam di dunia?",
      color: "#00ff88"
    },
    {
      id: 6,
      category: "technology",
      categoryName: "TECHNOLOGY",
      difficulty: "medium",
      difficultyName: "MEDIUM",
      time: 20,
      question: "Bahasa pemrograman apa yang diciptakan oleh Guido van Rossum?",
      color: "#0099ff"
    },
    {
      id: 7,
      category: "science",
      categoryName: "SCIENCE",
      difficulty: "hard",
      difficultyName: "HARD",
      time: 15,
      question: "Berapa jumlah proton dalam unsur Hidrogen?",
      color: "#00ffff"
    },
    {
      id: 8,
      category: "history",
      categoryName: "HISTORY",
      difficulty: "easy",
      difficultyName: "EASY",
      time: 30,
      question: "Tahun berapa Indonesia merdeka?",
      color: "#ff6bff"
    }
  ]

  // Kategori & Difficulty untuk filter
  const categories = [
    { id: "science", name: "SCIENCE", color: "#00ffff" },
    { id: "history", name: "HISTORY", color: "#ff6bff" },
    { id: "sports", name: "SPORTS", color: "#ffff00" },
    { id: "entertainment", name: "ENTERTAINMENT", color: "#ff4444" },
    { id: "geography", name: "GEOGRAPHY", color: "#00ff88" },
    { id: "technology", name: "TECHNOLOGY", color: "#0099ff" }
  ]

  const difficulties = [
    { id: "easy", name: "EASY", color: "#00ff88" },
    { id: "medium", name: "MEDIUM", color: "#ffff00" },
    { id: "hard", name: "HARD", color: "#ff4444" },
    { id: "insane", name: "INSANE", color: "#ff00ff" }
  ]

  // Filter soal
  const filteredQuestions = mockQuestions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || q.category === selectedCategory
    const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty
    return matchesSearch && matchesCategory && matchesDifficulty
  })

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
    <div className={`h-screen w-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a0a2a] to-[#0a0a0f] relative overflow-hidden pixel-font ${isGlitch ? 'glitch-effect' : ''}`}>
      
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
        <Link href="/">
          <Button className="p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan">
            <ArrowLeft size={16} />
          </Button>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">
        
        {/* Title */}
        <div className="text-center mb-12">
          <div className="pixel-border-large inline-ck mb-6">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6bff] to-[#00ffff] pixel-text-outline">
              Select Quiz
            </h1>
          </div>
          <p className="text-lg text-[#ff6bff] pixel-text">FIND YOUR PERFECT CHALLENGE</p>
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

            {/* Category Filter */}
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-white text-sm font-bold pixel-text">CATEGORY:</span>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 border-2 rounded-lg text-sm font-bold transition-all pixel-button ${
                    selectedCategory === cat.id
                      ? `border-[${cat.color}] bg-[${cat.color}]/20 text-[${cat.color}] glow-cyan`
                      : 'border-[#6a4c93] bg-[#0a0a0f] text-gray-300 hover:border-[#ff6bff] hover:bg-[#1a0a2a]'
                  }`}
                  style={{
                    borderColor: selectedCategory === cat.id ? cat.color : undefined,
                    color: selectedCategory === cat.id ? cat.color : undefined
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-white text-sm font-bold pixel-text">DIFFICULTY:</span>
              {difficulties.map(diff => (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === diff.id ? null : diff.id)}
                  className={`px-4 py-2 border-2 rounded-lg text-sm font-bold transition-all pixel-button ${
                    selectedDifficulty === diff.id
                      ? `border-[${diff.color}] bg-[${diff.color}]/20 text-[${diff.color}] glow-pink`
                      : 'border-[#6a4c93] bg-[#0a0a0f] text-gray-300 hover:border-[#ff6bff] hover:bg-[#1a0a2a]'
                  }`}
                  style={{
                    borderColor: selectedDifficulty === diff.id ? diff.color : undefined,
                    color: selectedDifficulty === diff.id ? diff.color : undefined
                  }}
                >
                  {diff.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-center">
          <p className="text-gray-300 pixel-text">
            Showing <span className="text-white font-bold">{filteredQuestions.length}</span> of {mockQuestions.length} questions
          </p>
        </div>

        {/* Questions Grid */}
        {filteredQuestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuestions.map((q) => (
              <motion.div
                key={q.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Card className="bg-[#1a0a2a]/60 border-2 border-[#6a4c93] hover:border-[#ff6bff] transition-all duration-300 h-full shadow-[0_0_15px_rgba(255,107,255,0.2)] pixel-card group-hover:shadow-[0_0_20px_rgba(255,107,255,0.4)]">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: q.color }}
                        ></div>
                        <CardTitle className="text-lg text-white group-hover:text-[#00ffff] transition-colors pixel-text">
                          {q.categoryName}
                        </CardTitle>
                      </div>
                      <span 
                        className="px-2 py-1 rounded text-xs font-bold border pixel-text"
                        style={{ 
                          backgroundColor: `${q.color}20`,
                          color: q.color,
                          borderColor: q.color
                        }}
                      >
                        {q.difficultyName}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-200 mb-4 leading-relaxed pixel-text">
                      {q.question}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className="pixel-text">{q.time}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="pixel-text">1 point</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ff6bff]/20 rounded-full mb-4 border-2 border-[#ff6bff]">
              <Search className="h-8 w-8 text-[#ff6bff]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 pixel-text">NO QUESTIONS FOUND</h3>
            <p className="text-gray-400 pixel-text">Try changing your search or filters</p>
          </div>
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