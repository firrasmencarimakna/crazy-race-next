"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import LoadingRetro from "@/components/loadingRetro"
import { formatTime } from "@/utils/game"

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
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [gameDuration, setGameDuration] = useState(0)
  const [session, setSession] = useState<any>(null);
  const hasBootstrapped = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    const pid = localStorage.getItem("participantId") || "";
    if (!pid) {
      router.replace(`/`);
      return;
    }
    setParticipantId(pid);
  }, [router])

  const fetchGameData = useCallback(async (retryCount = 0) => {
    if (!participantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, started_at, status, total_time_minutes, current_questions, responses, application")
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData || sessionData.application !== APP_NAME) {
        throw new Error(`Session error: ${sessionError?.message || 'Invalid session or app'}`);
      }

      if (sessionData.status !== 'active') {
        router.replace(`/join/${roomCode}`);
        return;
      }

      setSession(sessionData);

      const parsedQuestions = (sessionData.current_questions || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.answers.map((a: any) => a.answer),
        correctAnswer: parseInt(q.correct),
      }));
      setQuestions(parsedQuestions);

      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);

      const startTime = new Date(sessionData.started_at).getTime();
      setGameStartTime(startTime);

      const myResponse = (sessionData.responses || []).find((r: any) => r.participant === participantId);
      if (myResponse) {
        // Set current question index from DB, but ensure it's not out of bounds
        const dbQuestionIndex = myResponse.current_question || 0;
        if (dbQuestionIndex < parsedQuestions.length) {
          setCurrentQuestionIndex(dbQuestionIndex);
        } else {
          // If player has answered all questions, move to result
          saveProgressAndRedirect();
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Fetch error:", err.message);
      setError(err.message);
      if (retryCount < 3) {
        setTimeout(() => fetchGameData(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        router.replace(`/`);
      }
    }
  }, [roomCode, participantId, router]);

  useEffect(() => {
    if (participantId) {
      fetchGameData();
    }
  }, [participantId, fetchGameData]);

  // REFACTORED: Use the new 'finalize_player_session' RPC for a safe, atomic update.
  const saveProgressAndRedirect = useCallback(async () => {
    if (!participantId || !session) return;

    // Stop the timer immediately
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    console.log("Finalizing session via RPC...");
    const { error: rpcError } = await supabase.rpc('finalize_player_session', {
      p_session_id: session.id,
      p_participant_id: participantId,
      p_app_name: APP_NAME
    });

    if (rpcError) {
      console.error("Error finalizing session:", rpcError);
    }

    router.push(`/join/${roomCode}/result`);
  }, [participantId, session, roomCode, router]);

  useEffect(() => {
    if (loading || !gameStartTime || gameDuration === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
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
    if (!roomCode || !participantId || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const channel = supabase.channel(`game-session-updates:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `game_pin=eq.${roomCode}`
      }, payload => {
        console.log('Game session update received:', payload.new.status);
        if (payload.new.status === "finished") {
          saveProgressAndRedirect();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, participantId, saveProgressAndRedirect]);

  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length);
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  // REFACTORED: This function is now much simpler and safer, using RPC calls.
  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (isAnswered || !session || !currentQuestion) return;

    setIsAnswered(true);
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    // Step 1: Submit the answer using the safe RPC function.
    const { error: rpcError } = await supabase.rpc('update_player_response', {
      p_session_id: session.id,
      p_participant_id: participantId,
      p_question_id: currentQuestion.id,
      p_answer_id: answerIndex.toString(),
      p_is_correct: isCorrect,
      p_total_questions: totalQuestions,
      p_app_name: APP_NAME
    });

    if (rpcError) {
      console.error("Fatal: Could not submit answer via RPC.", rpcError);
      setError("Could not save your answer. Please try again.");
      setIsAnswered(false); // Allow retry
      setShowResult(false);
      setSelectedAnswer(null);
      return;
    }

    // Step 2: Handle navigation after a short delay.
    const nextIndex = currentQuestionIndex + 1;
    setTimeout(async () => {
      if (nextIndex < totalQuestions) {
        // Check if it's time for a minigame
        if (nextIndex % 3 === 0) {
          const { error: racingRpcError } = await supabase.rpc('set_player_racing_status', {
            p_session_id: session.id,
            p_participant_id: participantId,
            p_is_racing: true,
            p_app_name: APP_NAME
          });
          if (racingRpcError) console.error("Error setting racing status:", racingRpcError);
          
          localStorage.setItem("nextQuestionIndex", nextIndex.toString());
          router.push(`/join/${roomCode}/minigame`);
        } else {
          // Just move to the next question
          setCurrentQuestionIndex(nextIndex);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setShowResult(false);
        }
      } else {
        // Last question answered, finalize and move to results
        await saveProgressAndRedirect();
      }
    }, 500);
  }, [isAnswered, session, currentQuestion, participantId, totalQuestions, currentQuestionIndex, roomCode, router, saveProgressAndRedirect]);

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle";
    }
    if (optionIndex === currentQuestion.correctAnswer) {
      return "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green";
    }
    if (optionIndex === selectedAnswer) {
      return "border-red-500 bg-red-500/10 text-red-500";
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
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center relative overflow-hidden pixel-font">
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
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
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
        .pixel-font { font-family: 'Press Start 2P', cursive, monospace; image-rendering: pixelated; }
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
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}
