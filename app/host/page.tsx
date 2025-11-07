"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, ArrowLeft, Clock, Star, Zap, HelpCircle, Menu, X, Settings } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"
import { useAuth } from "@/contexts/authContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { t } from "i18next"


// List of background GIFs in filename order
const backgroundGifs = [
  "/assets/background/2_v2.webp",
]

// UPDATE: generateRoomCode - rename ke generateGamePin (sama logic)
export function generateGamePin(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function QuestionListPage() {
  const router = useRouter()
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const audioRef = useRef<HTMLAudioElement>(null)
  const [profile, setProfile] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const itemsPerPage = 9;
  useEffect(() => {

    console.log("============== hanya untuk debug =================")

  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, favorite_quiz') // Tambah 'id' untuk creator_id di fetchQuizzes
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(profileData);
        console.log("tersambung dengan supabase gameforsmart.com")
        if (profileData?.favorite_quiz) {
          try {
            let parsed;
            if (typeof profileData.favorite_quiz === 'string') {
              // Kalau masih string (jarang, tapi aman)
              parsed = JSON.parse(profileData.favorite_quiz);
            } else {
              // Supabase auto-parse: udah object
              parsed = profileData.favorite_quiz;
            }
            setFavorites(parsed.favorites || []); // Ambil array IDs
            console.log('Parsed favorites:', parsed.favorites); // Debug: Cek di console
          } catch (e) {
            console.error('Error parsing favorites:', e);
            setFavorites([]);
          }
        } else {
          setFavorites([]);
        }
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setFavorites([]);
      setProfile(null);
    }
  }, [user]);



  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      let query = supabase
        .from("quizzes")
        .select("id, title, description, category, questions, is_public, created_at, updated_at")
        .order("created_at", { ascending: false });

      // FIX: Tambah OR filter - public ATAU milik user (untuk favorites)
      if (profile?.id) {
        query = query.or(`is_public.eq.true,creator_id.eq.${profile.id}`);
      } else {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching quizzes:", error);
      } else {
        setQuizzes(data || []);
        console.log('Fetched quizzes:', data?.length); // Debug
      }
      setLoading(false);
    };

    fetchQuizzes();
  }, [profile?.id]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  // UPDATE: Compute categories - tambah "Favorites" sebagai opsi
  const categories = [
    "All",
    ...new Set(quizzes.map(q => q.category).filter(Boolean)),
    "Favorites" // Tambah opsi Favorites
  ];

  const filteredQuestions = quizzes.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesCategory = selectedCategory === "All" || q.category === selectedCategory;

    if (selectedCategory === "Favorites") {
      matchesCategory = favorites.includes(q.id);
      console.log(`Favorites check for ${q.title}: ${q.id} in favorites?`, favorites.includes(q.id)); // Debug per quiz
    }

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage)
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // UPDATE: handleSelectQuiz - migrasi ke game_sessions, pakai host_id dari profile
  async function handleSelectQuiz(quizId: string, router: any) {
    if (creating) return;
    setCreating(true);

    const gamePin = generateGamePin();

    // Defaults untuk game_sessions baru (adjust sesuai kebutuhan)
    const newSession = {
      quiz_id: quizId,
      host_id: profile?.id || user?.id, // Prioritas profile.id, fallback user.id
      game_pin: gamePin,
      status: "waiting",
      total_time_minutes: 5, // Default dari contoh
      question_limit: 10, // Default
      difficulty: null,
      game_end_mode: "manual", // Default 
      allow_join_after_start: false, // Default
      participants: [], // Mulai kosong
      responses: [], // Kosong
      current_questions: [], // Akan diisi di settings atau game start
      application: "crazyrace"
    };

    const { data, error } = await supabase
      .from("game_sessions")
      .insert(newSession)
      .select("game_pin")
      .single();

    if (error) {
      console.error("Error creating session:", error);
      setCreating(false);
      return;
    }

    // Simpan pin untuk host session
    localStorage.setItem("hostGamePin", gamePin);

    router.push(`/host/${data.game_pin}/settings`); // Path sama, adjust kalau perlu
    setCreating(false);
  }

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
  const handleQuizSelect = async (quizId: string) => {
    await handleSelectQuiz(quizId, router);   // panggil yang bikin room + redirect
  };

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font"> {/* pt-20 untuk ruang burger */}

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
        className="absolute top-4 left-4 z-40 p-3 bg-[#00ffff]/20 border-2 border-[#00ffff] pixel-button hover:bg-[#33ffff]/30 glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Back to Home"
        onClick={() => router.push('/')}
      >
        <ArrowLeft size={20} className="text-white" />
      </motion.button>

      <h1 className="absolute top-5 right-20 hidden md:block">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={64}
        />
      </h1>

      <h1 className="absolute top-6 left-20 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      {(loading || creating) && (
        <LoadingRetro />
      )}

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl">
        {/* Title */}
        <div className="text-center m-7">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pixel-border-large inline-block p-6"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#ffefff] pixel-text glow-pink">
             {t('soal.title')}
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
                placeholder= {t('soal.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0a0a0f] border-4 border-[#6a4c93] text-white placeholder:text-gray-400 focus:border-[#00ffff] focus:ring-0 text-lg pixel-text glow-cyan-subtle"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger
                className="w-full sm:w-auto bg-[#0a0a0f] border-4 border-[#6a4c93] 
             text-white focus:border-[#00ffff] focus:ring-0 text-lg pixel-text 
             glow-cyan-subtle py-4 px-4 h-auto"
              >
                <SelectValue placeholder={t('soal.categories')} />
              </SelectTrigger>

              <SelectContent className="bg-[#1a0a2a] border-4 border-[#ff6bff]/50 text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="pixel-text capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Questions Grid */}
        {paginatedQuestions.length > 0 ? (
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
                    className="bg-[#1a0a2a]/60 border-4 border-[#ff6bff]/50 hover:border-[#ff6bff] pixel-card glow-pink-subtle cursor-pointer h-full justify-end gap-3"
                    onClick={() => handleQuizSelect(quiz.id)}
                  >
                    <TooltipProvider>
                      <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                          <div>
                            <CardHeader>
                              <CardTitle className="text-base text-[#00ffff] pixel-text glow-cyan md:line-clamp-3 ">
                                {quiz.title}
                              </CardTitle>
                            </CardHeader>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="text-xs bg-black/80 text-cyan-300 max-w-xs border border-cyan-500/50"
                        >
                          {quiz.title}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <CardFooter className="flex justify-between items-center">
                      {quiz.category && (
                        <div className="text-xs text-[#ff6bff] pixel-text glow-pink-subtle capitalize">{quiz.category}</div>
                      )}
                      <div className="flex items-center gap-2 text-[#ff6bff] text-sm pixel-text glow-pink-subtle">
                        <HelpCircle className="h-4 w-4" /> {quiz.questions?.length ?? 0}
                      </div>
                    </CardFooter>
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
            NO QUIZZES FOUND
          </motion.p>
        )}
      </div>

      {/* Audio Element untuk Background Music */}
      {/* <audio
        ref={audioRef}
        src="/assets/music/resonance.mp3"
        loop
        preload="auto"
        className="hidden"
      /> */}

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