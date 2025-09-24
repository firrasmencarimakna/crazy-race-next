"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Clock, Star, Zap, Volume2, VolumeX, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// List of background GIFs in filename order
const backgroundGifs = [
 
  "/images/host/gif1.gif",

]

export default function QuestionListPage() {
  const router = useRouter()
  const [isMuted, setIsMuted] = useState(false)
  const [isGlitch, setIsGlitch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Fetch quizzes from Supabase
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
      
    }, 5000) // Total cycle: 5 seconds
    
    return () => clearInterval(bgInterval)
  }, [])

  // Handle quiz selection
  const handleQuizSelect = (quizId: string) => {
    router.push(`/host/${quizId}/lobby`)
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

      {/* Header Controls */}
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        <Button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-[#ff6bff] border-4 border-white pixel-button hover:bg-[#ff8aff] glow-pink"
        >
          {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
        </Button>
        <Link href="/host">
          <Button className="p-2 bg-[#00ffff] border-4 border-white pixel-button hover:bg-[#33ffff] glow-cyan">
            <ArrowLeft size={16} className="text-white" />
          </Button>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">
        {/* Title */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pixel-border-large inline-block p-6"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan">
             Select Quiz
            </h1>
          </motion.div>
        </div>

        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 rounded-xl p-6 mb-8 pixel-card glow-pink-subtle"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00ffff] h-5 w-5 glow-cyan" />
            <Input
              placeholder="Search Quiz..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#0a0a0f] border-4 border-[#6a4c93] text-white placeholder:text-gray-400 focus:border-[#00ffff] focus:ring-0 text-lg pixel-text glow-cyan-subtle"
            />
          </div>
        </motion.div>

        {/* Questions Grid */}
        {loading ? (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white pixel-text glow-cyan-subtle"
          >
            INITIALIZING...
          </motion.p>
        ) : filteredQuestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuestions.map((quiz, index) => (
              <motion.div
                key={quiz.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className="bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-card glow-pink-subtle cursor-pointer"
                  onClick={() => handleQuizSelect(quiz.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-[#00ffff] pixel-text glow-cyan">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-200 mb-4 line-clamp-3 pixel-text">{quiz.description}</p>
                    <div className="flex items-center gap-2 text-[#ff6bff] text-sm pixel-text glow-pink-subtle">
                      <HelpCircle className="h-4 w-4" /> {quiz.questions?.length ?? 0}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-400 pixel-text glow-pink-subtle"
          >
            NO ARCHIVES FOUND
          </motion.p>
        )}
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
            padding: 0.5rem;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}