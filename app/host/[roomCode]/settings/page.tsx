"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
<<<<<<< HEAD
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Clock, Hash, Play, Menu, X, Settings } from "lucide-react"
import Link from "next/link"
=======
import { ArrowLeft, Clock, Hash, Play, Settings } from "lucide-react"
>>>>>>> a066909 (pnpm, pwa, hapus import an yang gak di pakai, icon fc google bermasalah selesai, menyesuaikan skor sesuai jumlah soal, implementasi pwa, penambahan variable score di kolom jsonb: participants, perbaikan fitur search(harus enter/button untuk hasil), reconnect player jika keluar dengan cara join lagi)
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion" // HAPUS: AnimatePresence, karena nggak ada transisi lagi
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"
import { t } from "i18next"

// HAPUS: backgroundGifs array, ganti jadi string statis untuk simplicity
const backgroundGif = "/assets/background/host/7.webp" // Satu GIF aja

// Shuffle array function
export function shuffleArray(array: any[]) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function HostSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const roomCode = params.roomCode as string

  const [duration, setDuration] = useState("300") // Default: 5 minutes (300 seconds)
  const [questionCount, setQuestionCount] = useState("5") // Default: 5 questions
  const [quiz, setQuiz] = useState<any>(null); // Full quiz untuk questions
  const [quizDetail, setQuizDetail] = useState<any>(null); // Parsed dari game_sessions.quiz_detail
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState("easy");

<<<<<<< HEAD


=======
>>>>>>> a066909 (pnpm, pwa, hapus import an yang gak di pakai, icon fc google bermasalah selesai, menyesuaikan skor sesuai jumlah soal, implementasi pwa, penambahan variable score di kolom jsonb: participants, perbaikan fitur search(harus enter/button untuk hasil), reconnect player jika keluar dengan cara join lagi)
  // Generate dynamic question count options
  const totalQuestions = quiz?.questions?.length || 0;
  const baseOptions = [5, 10, 20];
  const questionCountOptions =
    totalQuestions > 0
      ? baseOptions.filter((count) => count <= totalQuestions)
      : baseOptions;

  // Set default question count to 10 or closest valid option
  // useEffect(() => {
  //   if (totalQuestions > 0) {
  //     const closest = questionCountOptions.reduce((prev, curr) =>
  //       Math.abs(curr - 10) < Math.abs(prev - 10) ? curr : prev
  //     );
  //     setQuestionCount(closest.toString());
  //   }
  // }, [totalQuestions]);

  // Set default question count → 5 (atau nilai terdekat yang mungkin)
  useEffect(() => {
    if (totalQuestions > 0) {
      if (questionCountOptions.includes(5)) {
        setQuestionCount("5");
      } else {
        const smallest = Math.min(...questionCountOptions);
        setQuestionCount(smallest.toString());
      }
    }
  }, [totalQuestions]);

  // UPDATE: Fetch - dari game_sessions by game_pin, parse quiz_detail, fetch full quiz untuk questions
  useEffect(() => {
    const fetchSessionDetails = async () => {
      setLoading(true);
      // Step 1: Get game_sessions by game_pin untuk quiz_id & quiz_detail
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("quiz_id, quiz_detail, total_time_minutes, question_limit, difficulty") // Select existing settings
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData) {
        console.error("Error fetching game session:", sessionError);
        setLoading(false);
        return;
      }

      // Set existing settings (kalau ada)
      if (sessionData.total_time_minutes) {
        setDuration((sessionData.total_time_minutes * 60).toString()); // Minutes → seconds
      }
      if (sessionData.question_limit) {
        setQuestionCount(sessionData.question_limit.toString());
      }
      if (sessionData.difficulty) {
        setSelectedDifficulty(sessionData.difficulty);
      }

      // Parse quiz_detail JSON
      try {
        const parsedDetail = typeof sessionData.quiz_detail === 'string'
          ? JSON.parse(sessionData.quiz_detail)
          : sessionData.quiz_detail;
        setQuizDetail(parsedDetail);
      } catch (e) {
        console.error("Error parsing quiz_detail:", e);
      }

      // Step 2: Fetch full quiz untuk questions (pakai quiz_id)
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", sessionData.quiz_id)
        .single();

      if (quizError) {
        console.error("Error fetching quiz:", quizError);
      } else {
        setQuiz(quizData);
      }
      setLoading(false);
    };

    if (roomCode) {
      fetchSessionDetails();
    }
  }, [roomCode]);

  const handleCreateRoom = async () => {
    if (saving || loading || !quiz) return;
    setSaving(true);

    const settings = {
      total_time_minutes: Math.floor(parseInt(duration) / 60), // Seconds → minutes
      question_limit: parseInt(questionCount),
      difficulty: selectedDifficulty,
      game_end_mode: "manual", // Hardcode dari contoh, atau tambah state
      current_questions: [] as any[],
    };

    // Prepare questions: Shuffle & slice
    const shuffledQuestions = shuffleArray(quiz.questions).slice(0, settings.question_limit);
    settings.current_questions = shuffledQuestions; // Isi array questions

    // Update game_sessions
    const { error } = await supabase
      .from("game_sessions")
      .update(settings)
      .eq("game_pin", roomCode);

    if (error) {
      console.error("Error updating session settings:", error);
      setSaving(false);
      return;
    }

    // Simpan pin untuk next page (host lobby)
    localStorage.setItem("hostroomCode", roomCode);

    router.push(`/host/${roomCode}`); // Path sama, adjust kalau perlu
  };

  if (saving || loading) return <LoadingRetro />

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">

      {/* HAPUS: AnimatePresence, ganti jadi motion.div sederhana untuk fade-in awal */}
      <motion.div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundGif})` }} // Statis, pakai backgroundGif
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />

      {/* Back Button - Fixed Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        className="absolute top-4 left-4 z-40 p-3 bg-[#00ffff]/20 border-2 border-[#00ffff] pixel-button hover:bg-[#33ffff]/20 glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Back to Host"
        onClick={() => router.push('/host')}
      >
        <ArrowLeft size={20} className="text-white" />
      </motion.button>

      <h1 className="absolute top-5 right-5 hidden md:block display-flex">
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

      {saving && <LoadingRetro />}
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-6 max-w-4xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="p-4 sm:p-6 sm:mt-7">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#ffefff] pixel-text glow-pink">
              {t('settings.title')}
            </h1>
          </div>
        </motion.div>

        {/* Loading State */}
        {!quizDetail ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-400 pixel-text  text-sm sm:text-base"
          >
            ERROR: QUIZ NOT FOUND
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-[#1a0a2a]/60 border-2 sm:border-4 border-[#ff87ff]/50 pixel-card glow-pink-subtle p-6 sm:p-8">
              <div className="space-y-6 sm:space-y-8">
                {/* Selected Quiz - Ditambahkan ikon dan wrapper untuk konsistensi */}
                <div className="p-3 sm:p-4 bg-[#0a0a0f] border-2 border-[#ff87ff]/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Hash className="h-5 w-5 text-[#ff87ff]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-base sm:text-lg text-[#ff87ff] pixel-text font-semibold">
                        {quizDetail.title || quiz?.title || 'Unknown Quiz'}
                      </p>
                      <p className="text-[#00ffff] pixel-text text-xs sm:text-sm overflow-y-auto max-h-[60px]">
                        {quizDetail.description || quiz?.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settings Grid - Diubah ke grid 2 kolom di sm+ untuk layout lebih compact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Duration */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-base sm:text-lg font-semibold flex items-center space-x-2 text-[#00ffff] pixel-text glow-cyan">
                      <Clock className="h-4 w-4" />
                      <span>{t('settings.title')}</span>
                    </Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="text-base sm:text-lg p-3 sm:p-5 bg-[#0a0a0f] border-2 border-[#00ffff]/30 text-white pixel-text focus:border-[#00ffff] w-full transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border-2 sm:border-4 border-[#6a4c93] text-white pixel-text">
                        {Array.from({ length: 6 }, (_, i) => (i + 1) * 5).map((min) => (
                          <SelectItem key={min} value={(min * 60).toString()}>
                            {min} Minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Number of Questions */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-base sm:text-lg font-semibold flex items-center space-x-2 text-[#00ffff] pixel-text glow-cyan">
                      <Hash className="h-4 w-4" />
                      <span>{t('settings.questions')}</span>
                    </Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger className="text-base sm:text-lg p-3 sm:p-5 bg-[#0a0a0f] border-2 border-[#00ffff]/30 text-white pixel-text focus:border-[#00ffff] w-full transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0f] border-2 sm:border-4 border-[#6a4c93] text-white pixel-text">
                        {questionCountOptions.map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {count}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Difficulty Selection */}
                <div className="space-y-4 sm:space-y-6">
                  <Label className="text-base sm:text-lg font-semibold flex items-center justify-center space-x-2 text-[#00ffff] pixel-text glow-cyan mb-4">
                    <Settings className="h-4 w-4" />
                    <span>{t('settings.difficulty')}</span>
                  </Label>

                  {/* Difficulty Buttons dengan Terjemahan */}
                  <div className="flex justify-center space-x-3 sm:space-x-6">
                    {["Easy", "Medium", "Hard"].map((diff) => (
                      <Button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff.toLowerCase().replace('medium', 'normal'))} // Map ke lowercase + 'normal' untuk Medium, sesuaikan kalau perlu
                        className={`
                          pixel-button text-sm sm:text-base px-6 sm:px-8 py-3 font-bold 
                          w-24 sm:w-28 transition-all duration-200 border-2 capitalize
                          ${selectedDifficulty === diff.toLowerCase().replace('medium', 'normal')
                              ? "bg-[#ff6bff] hover:bg-[#ff8aff] glow-pink text-white border-white shadow-lg shadow-[#ff6bff]/50"
                              : "bg-[#0a0a0f] border-[#00ffff]/40 text-[#00ffff] hover:bg-[#00ffff]/10 hover:border-[#00ffff] hover:shadow-md hover:shadow-[#00ffff]/30"
                            }
                        `}
                      >
                        {t(`settings.difficultyOptions.${diff}`)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Continue Button - Ditambahkan subtle glow dan spacing */}
                <div className="pt-4 border-t border-[#ff87ff]/20">
                  <Button
                    onClick={handleCreateRoom}
                    disabled={saving}
                    className="w-full text-base sm:text-xl py-4 sm:py-6 bg-[#00ffff] pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg shadow-[#00ffff]/30"
                  >
                    <Play className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                    {t('settings.start')}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
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
        .pixel-button:hover:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
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
            padding: 0.75rem;
          }
          .pixel-button {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
          .pixel-card {
            padding: 1rem !important;
          }
          .crt-effect,
          .noise-effect {
            background-size: 100% 2px;
          }
          .glow-pink,
          .glow-cyan {
            animation-duration: 2s;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}