"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { mysupa, supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"
import { formatTime } from "@/utils/game"
import { syncServerTime, getSyncedServerTime } from "@/utils/serverTime"
import { generateXID } from "@/lib/id-generator"

// Background GIFs
const backgroundGifs = [
  "/assets/background/1.webp",
  "/assets/background/host/1.webp",
  "/assets/background/host/3.webp",
  "/assets/background/host/4.webp",
  "/assets/background/host/7.webp",
]

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

const APP_NAME = "crazyrace"; // Safety check for multi-tenant DB

export default function QuizGamePage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const [participantId, setParticipantId] = useState<string>("")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [gameDuration, setGameDuration] = useState(0)
  const [session, setSession] = useState<any>(null);
  const sessionRef = useRef(session);
  const hasBootstrapped = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    // Sync time once on component load to get the offset
    syncServerTime();
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const pid = localStorage.getItem("participantId") || "";
    if (!pid) {
      router.replace(`/`);
      return;
    }
    setParticipantId(pid);
  }, [router])

  const fetchGameData = useCallback(async () => {
    if (!participantId || !roomCode) return;

    try {
      // 1. Ambil session
      const { data: sess, error } = await mysupa
        .from("sessions")
        .select("id, status, started_at, total_time_minutes, current_questions")
        .eq("game_pin", roomCode)
        .single();

      if (error || !sess || sess.status !== "active") {
        router.replace(`/join/${roomCode}`);
        return;
      }

      // 2. Parse questions DULU (tapi JANGAN setState dulu)
      const parsedQuestions = (sess.current_questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.answers.map((a: any) => a.answer),
        correctAnswer: parseInt(q.correct),
      }));

      // 3. Ambil participant DULU
      const { data: participant } = await mysupa
        .from("participants")
        .select("answers, completion, current_question")
        .eq("id", participantId)
        .single();

      // 4. CEK DULU sebelum setQuestions!
      if (participant) {
        const answeredCount = (participant.answers || []).length;

        if (participant.completion || answeredCount >= parsedQuestions.length) {
          router.replace(`/join/${roomCode}/result`);
          return;
        }

        // Baru set index setelah yakin tidak selesai
        setCurrentQuestionIndex(answeredCount);
      }

      // 5. BARU SET SEMUA STATE (setelah semua pengecekan selesai)
      setSession(sess);
      setQuestions(parsedQuestions);  // ← pindah ke bawah!
      setGameDuration((sess.total_time_minutes || 5) * 60);
      setGameStartTime(new Date(sess.started_at).getTime());
      setLoading(false);

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Gagal memuat game.");
    }
  }, [participantId, roomCode, router]);

  useEffect(() => {
    if (participantId) {
      fetchGameData();
    }
  }, [participantId, fetchGameData]);

  const saveProgressAndRedirect = async () => {
    await mysupa
      .from("participants")
      .update({ 
        completion: true,
        finished_at: new Date(getSyncedServerTime()).toISOString()
      })
      .eq("id", participantId);

    router.push(`/join/${roomCode}/result`);
  };

  useEffect(() => {
    if (loading || !gameStartTime || gameDuration === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Math.floor((getSyncedServerTime() - gameStartTime) / 1000);
      const remaining = gameDuration - elapsed;
      setTotalTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        saveProgressAndRedirect();
      }
    };

    updateRemaining();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameStartTime, loading, gameDuration, saveProgressAndRedirect]);

  useEffect(() => {
    if (!roomCode || !saveProgressAndRedirect) return;

    const channel = mysupa
      .channel(`minigame-session-updates-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `game_pin=eq.${roomCode}`,
        },
        (payload) => {
          const newSession = payload.new as any;
          if (newSession.status === 'finished') {
            console.log("Host ended the game. Finalizing player session.");
            saveProgressAndRedirect();
          }
        }
      )
      .subscribe();

    return () => {
      mysupa.removeChannel(channel);
    };
  }, [roomCode, saveProgressAndRedirect]);

  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length);
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  const handleAnswerSelect = async (answerIndex: number) => {
    if (isAnswered || !currentQuestion || !participantId) return;

    setIsAnswered(true);
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    const nextIndex = currentQuestionIndex + 1;

    try {
      // 1. Ambil data participant dulu (termasuk answers yang sudah ada)
      const { data: participant, error: fetchError } = await mysupa
        .from("participants")
        .select("answers, score, correct")
        .eq("id", participantId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Siapkan jawaban baru
      const newAnswer = {
        id: generateXID(),
        question_id: currentQuestion.id,
        answer: answerIndex,
        correct: isCorrect,
      };

      // 3. Gabungkan dengan jawaban lama (kalau null → jadi array kosong)
      const updatedAnswers = [...(participant.answers || []), newAnswer];

      // 4. Hitung score & correct baru
      const scorePerQuestion = Math.max(1, Math.floor(100 / totalQuestions));
      const newScore = (participant.score || 0) + (isCorrect ? scorePerQuestion : 0);
      const newCorrect = (participant.correct || 0) + (isCorrect ? 1 : 0);

      // 5. Update semua sekaligus
      const { error } = await mysupa
        .from("participants")
        .update({
          answers: updatedAnswers,
          current_question: nextIndex,
          score: newScore,
          correct: newCorrect,
          completion: nextIndex >= totalQuestions,
          racing: nextIndex % 3 === 0 ? true : false, // auto set racing kalau masuk minigame
        })
        .eq("id", participantId);

      if (error) throw error;

      setTimeout(() => {
        if (nextIndex >= totalQuestions) {
          saveProgressAndRedirect()
        } else if (nextIndex % 3 === 0 && nextIndex < totalQuestions) {
          // Hanya masuk minigame kalau BELUM selesai semua soal
          localStorage.setItem("nextQuestionIndex", nextIndex.toString());
          router.push(`/join/${roomCode}/minigame`);
        } else {
          setCurrentQuestionIndex(nextIndex);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setShowResult(false);
        }
      }, 800);

    } catch (err: any) {
      console.error("Gagal simpan jawaban:", err);
      setError("Gagal menyimpan jawaban. Coba lagi.");
      setIsAnswered(false);
      setShowResult(false);
      setSelectedAnswer(null);
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle";
    }
    if (optionIndex === selectedAnswer) {
      return optionIndex === currentQuestion.correctAnswer
        ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green" // BENAR: Hijau
        : "border-red-500 bg-red-500/10 text-red-500"; // SALAH: Merah
    }
    return "border-[#ff6bff]/50 bg-[#1a0a2a]/50 opacity-60";
  };

  const getTimeColor = () => {
    if (totalTimeRemaining <= 10) return "text-red-500";
    if (totalTimeRemaining <= 20) return "text-[#ff6bff] glow-pink-subtle";
    return "text-[#00ffff] glow-cyan";
  };

  const isReady = !loading && !error && questions.length > 0 && gameStartTime && gameDuration > 0 && !!currentQuestion;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBgIndex}
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundGifs[currentBgIndex]})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        </AnimatePresence>
        <LoadingRetro />
        {error && (
          <div className="absolute top-4 left-4 bg-red-500/90 text-white p-2 rounded pixel-text">
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden">
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
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan tracking-wider">
            CRAZY RACE
          </h1>
        </div>
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card my-8 px-4 py-2">
          <CardContent className="px-0">
            <div className="flex sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Clock className={`h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 ${getTimeColor()}`} />
                <div>
                  <div className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold ${getTimeColor()}`}>
                    {formatTime(totalTimeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <Badge className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] px-3 sm:px-4 sm:py-2 text-base sm:text-lg md:text-xl lg:text-2xl pixel-text glow-cyan">
                  {(currentQuestionIndex + 1) > totalQuestions ? totalQuestions : (currentQuestionIndex + 1)}/{totalQuestions}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card">
          <CardHeader className="text-center">
            <h2 className="text-lg sm:text-2xl font-bold text-[#00ffff] pixel-text glow-cyan text-balance">
              {currentQuestion.question}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`p-3 sm:p-4 rounded-xl border-4 border-double transition-all duration-200 text-left bg-[#1a0a2a]/50 ${getOptionStyle(index)}`}
                  whileHover={{ scale: isAnswered ? 1 : 1.01 }}
                  whileTap={{ scale: isAnswered ? 1 : 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#ff6bff]/20 flex items-center justify-center font-bold text-[#ff6bff] pixel-text glow-pink-subtle">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-base sm:text-lg font-medium text-white pixel-text glow-text">{option}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <style jsx>{`
        .pixel-text { image-rendering: pixelated; text-shadow: 2px 2px 0px #000; }
        .pixel-card { box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3); }
        .glow-cyan { filter: drop-shadow(0 0 10px #00ffff); }
        .glow-pink-subtle { animation: neon-pulse-pink 1.5s ease-in-out infinite; }
        .glow-green { filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8)); }
        .glow-text { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)); }
        .animate-neon-pulse { animation: neon-pulse 1.5s ease-in-out infinite; }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
      `}</style>


      {isFinalizing && (
        <div className="absolute inset-0 bg-[#1a0a2a]/80 flex items-center justify-center z-50">
          <LoadingRetro />
        </div>
      )}
    </div>
  )
}
