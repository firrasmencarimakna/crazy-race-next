"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, ArrowLeft, Clock, Star, Zap, Volume2, VolumeX, HelpCircle, Menu, X, Settings } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import LoadingRetro from "@/components/loadingRetro"

// List of background GIFs in filename order
const backgroundGifs = [
  "/assets/gif/2.gif",
]

export default function QuestionListPage() {
  const router = useRouter()
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50) // 0-100, default 50%
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const [nickname, setNickname] = useState(''); // Default kosong
  const audioRef = useRef<HTMLAudioElement>(null)

  // State untuk mode solo dan settings
  const [isSoloMode, setIsSoloMode] = useState(false); // Deteksi mode solo
  const [timeLimit, setTimeLimit] = useState(5); // Default 5 menit
  const [numQuestions, setNumQuestions] = useState(10); // Default 10 soal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  const itemsPerPage = 9;

  // Inisialisasi audio: play otomatis dengan volume default
  useEffect(() => {
    if (audioRef.current) {
      const initialVolume = volume / 100
      audioRef.current.volume = isMuted ? 0 : initialVolume
      audioRef.current.play().catch((e) => {
        console.log("Autoplay dicegah oleh browser:", e)
      })
    }
  }, [])

  // Update audio volume berdasarkan state volume dan isMuted
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : (volume / 100)
    }
  }, [volume, isMuted])

  // Handle toggle mute/unmute
  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (isMuted && value[0] > 0) {
      setIsMuted(false) // Auto unmute jika volume dinaikkan
    }
  }

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

  //use effect untuk load mode solo ke localstorage 
  useEffect(() => {
    const savedMode = localStorage.getItem('tryout_mode');
    const savedNickname = localStorage.getItem('tryout_nickname');
    const savedSettings = localStorage.getItem('tryout_settings'); // JSON settings
    
    if (savedMode === 'solo' && savedNickname) {
      setIsSoloMode(true);
      console.log('Loaded Solo Mode with Nickname:', savedNickname); // Debug
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setTimeLimit(parsed.timeLimit || 5);
        setNumQuestions(parsed.numQuestions || 10);
        console.log('Loaded Settings:', parsed); // Debug
      }
    }
  }, []);

  //menambahkan useeffect untuk load nickname dari local storage
  useEffect(() => {
    const savedNickname = localStorage.getItem('tryout_nickname');
    if (savedNickname) {
      setNickname(savedNickname);
      console.log('Loaded Tryout Nickname:', savedNickname); // Debug log di sini
    } else {
      console.log('No saved tryout nickname found'); // Log jika kosong
    }
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  // Compute unique categories
  const categories = ["All", ...new Set(quizzes.map(q => q.category).filter(Boolean))]

  // Filter quizzes
  const filteredQuestions = quizzes.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || q.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage)
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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

  // Handle quiz select yang sudah diganti untuk membuka dialog
  const handleQuizSelect = (quiz: any) => {
    setSelectedQuiz(quiz);
    if (isSoloMode) {
      setShowSettingsModal(true); // Buka modal untuk settings solo
    } else {
      // Fallback ke mode host jika bukan solo (opsional, sesuaikan)
      handleSelectQuiz(quiz.id, timeLimit, numQuestions, router);
    }
  };

  async function handleSelectQuiz(quizId: string, time: number, numQ: number, router: any) {
    if (creating) return;
    setCreating(true);

    if (isSoloMode) {
      // Solo: Simpan ke localStorage, termasuk questions untuk menghindari fetch ulang
      const formattedQuestions = selectedQuiz.questions.slice(0, numQ).map((q: any, index: number) => ({
        id: `${quizId}-${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
      }));

      localStorage.setItem('tryout_settings', JSON.stringify({ 
        quizId, 
        timeLimit: time, 
        numQuestions: numQ,
        questions: formattedQuestions
      }));
      console.log('Solo Settings saved to localStorage:', { quizId, timeLimit: time, numQuestions: numQ, questions: formattedQuestions.length }); // Debug
      setShowSettingsModal(false);
      setCreating(false);
      router.push('/tryout/game'); // Route langsung ke tryout tanpa room
      return;
    }
    // Tambahkan logic untuk mode non-solo di sini jika diperlukan
    setCreating(false);
  }

  console.log('Settings saved:', { timeLimit: `${timeLimit} menit`, numQuestions: `${numQuestions} soal` }); // Debug log

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font"> {/* pt-20 untuk ruang burger */}
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

      {/* Back Button - Fixed Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        className="fixed top-4 left-4 z-40 p-3 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Back to Home"
      >
        <Link href="/">
          <ArrowLeft size={20} className="text-white" />
        </Link>
      </motion.button>

      {/* Burger Menu Button - Fixed Top Right */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 right-4 z-40 p-3 bg-[#ff6bff] border-2 border-white pixel-button hover:bg-[#ff8aff] glow-pink rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      {/* Menu Dropdown - Muncul saat burger diklik, dari kanan */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-20 right-4 z-30 w-64 bg-[#1a0a2a]/90 border border-[#ff6bff]/50 rounded-lg p-4 shadow-xl shadow-[#ff6bff]/30 backdrop-blur-sm"
        >
          <div className="space-y-4">
            {/* Mute Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white pixel-text">Audio</span>
              <button
                onClick={handleMuteToggle}
                className="p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan rounded"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2">
              <span className="text-xs text-[#ff6bff] pixel-text">Volume</span>
              <div className="bg-[#1a0a2a]/60 border border-[#ff6bff]/50 rounded px-2 py-1">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                  orientation="horizontal"
                />
              </div>
            </div>

            {/* Settings Button */}
            <button 
              className="w-full p-2 bg-[#00ffff] border-2 border-white pixel-button hover:bg-[#33ffff] glow-cyan rounded text-center"
              aria-label="Settings"
            >
              <div className="flex items-center justify-center gap-2">
                <Settings size={16} />
                <span className="text-sm">Settings</span>
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {(loading || creating) && (
        <LoadingRetro />
      )}

      <AnimatePresence>
        {showSettingsModal && selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowSettingsModal(false)} // Tutup saat klik luar
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0a2a]/90 border-4 border-[#ff6bff]/50 rounded-xl p-6 max-w-md w-full pixel-card"
              onClick={(e) => e.stopPropagation()} // Cegah tutup saat klik dalam
            >
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-[#00ffff] pixel-text glow-cyan">
                   {selectedQuiz.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-white pixel-text">Time</label>
                  <Slider
                    value={[timeLimit]}
                    onValueChange={(value) => setTimeLimit(value[0])}
                    max={60}
                    min={5}
                    step={5}
                    className="mt-2"
                  />
                  <span className="text-xs text-[#ff6bff]">{timeLimit} Minute</span>
                </div>
                <div>
                  <label className="text-sm text-white pixel-text">Questions</label>
                  <Slider
                    value={[numQuestions]}
                    onValueChange={(value) => setNumQuestions(value[0])}
                    max={selectedQuiz.questions?.length || 50}  // Max sesuai quiz
                    min={5}   // Mulai dari 5 soal
                    step={5}  // Kelipatan 5
                    className="mt-2"
                  />
                  <span className="text-xs text-[#ff6bff]">{numQuestions} Question</span>
                  
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowSettingsModal(false)}
                  variant="outline"
                  className="flex-1 bg-[#ff6bff] border-white pixel-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSelectQuiz(selectedQuiz.id, timeLimit, numQuestions, router)}
                  className="flex-1 bg-[#00ffff] border-white pixel-button glow-cyan"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Start'}
                </Button>
              </CardFooter>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">
        {/* Title */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pixel-border-large inline-block p-6"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan">
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00ffff] h-5 w-5 glow-cyan" />
              <Input
                placeholder="Search Quiz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0a0a0f] border-4 border-[#6a4c93] text-white placeholder:text-gray-400 focus:border-[#00ffff] focus:ring-0 text-lg pixel-text glow-cyan-subtle"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-auto bg-[#0a0a0f] border-4 border-[#6a4c93] text-white focus:border-[#00ffff] focus:ring-0 text-lg pixel-text glow-cyan-subtle">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a0a2a] border-4 border-[#ff6bff]/50 text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="pixel-text">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        ) : paginatedQuestions.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedQuestions.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card
                    className="bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-card glow-pink-subtle cursor-pointer h-full"
                    onClick={() => handleQuizSelect(quiz)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-[#00ffff] pixel-text glow-cyan">{quiz.title}</CardTitle>
                      {quiz.category && (
                        <div className="text-xs text-[#ff6bff] mt-1 pixel-text glow-pink-subtle">{quiz.category}</div>
                      )}
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
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pixel-button bg-[#ff6bff] border-4 border-white hover:bg-[#ff8aff] glow-pink"
                  variant="outline"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant={page === currentPage ? "default" : "outline"}
                    className={`pixel-button ${page === currentPage ? 'bg-[#00ffff] border-4 border-white hover:bg-[#33ffff] glow-cyan' : 'bg-[#ff6bff] border-4 border-white hover:bg-[#ff8aff] glow-pink'}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pixel-button bg-[#ff6bff] border-4 border-white hover:bg-[#ff8aff] glow-pink"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </>
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

      {/* Audio Element untuk Background Music */}
      <audio
        ref={audioRef}
        src="/assets/music/resonance.mp3"
        loop
        preload="auto"
        className="hidden"
      />

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