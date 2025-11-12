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
import { generateXID } from "@/lib/id-generator"

// Background GIFs
const backgroundGifs = [
  "/assets/background/1.webp",
  "/assets/background/host/1.webp",
  "/assets/background/host/3.webp",
  "/assets/background/host/4.webp",
  "/assets/background/host/7.webp",
]

// Car GIF mappings
const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

export default function QuizGamePage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const [participantId, setParticipantId] = useState<string>("") // Ganti dari playerId
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [gameDuration, setGameDuration] = useState(0)
  const [session, setSession] = useState<any>(null); // Tambah untuk update responses
  const hasBootstrapped = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    console.log("=== CHECK PLAYER STATE START ===");
    const pid = localStorage.getItem("participantId") || "";
    console.log("Participant ID from localStorage:", pid);
    if (!pid) {
      console.log("No PID, redirect to /");
      router.replace(`/`);
      return;
    }

    setParticipantId(pid);
    console.log("Set participantId:", pid);
  }, [])

  // UPDATE: Fetch game data dari game_sessions (with retry)
  const fetchGameData = useCallback(async (retryCount = 0) => {
    console.log(`=== FETCH GAME DATA START (attempt ${retryCount + 1}) ===`);
    setLoading(true)
    setError(null)
    try {
      // Fetch session data
      console.log("Querying game_sessions...");
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, started_at, status, total_time_minutes, current_questions, responses, participants")
        .eq("game_pin", roomCode)
        .single()

      if (sessionError || !sessionData) {
        console.error("Session query error:", sessionError);
        throw new Error(`Session error: ${sessionError?.message || 'No data'}`)
      }

      console.log("Session fetched:", { id: sessionData.id, status: sessionData.status, started_at: sessionData.started_at });

      if (sessionData.status !== 'active') {
        console.log("Status not active:", sessionData.status);
        throw new Error('Game not active')
      }

      setSession(sessionData);
      console.log("Set session");

      // Parse questions
      console.log("Parsing current_questions...");
      const parsedQuestions = sessionData.current_questions || [];
      console.log("Parsed questions length:", parsedQuestions.length);
      const formattedQuestions: QuizQuestion[] = parsedQuestions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.answers.map((a: any) => a.answer),
        correctAnswer: parseInt(q.correct),
      }));

      setQuestions(formattedQuestions);
      console.log("Set questions:", formattedQuestions.length);

      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);
      console.log("Set gameDuration:", duration);

      // Set game start time
      const startTime = sessionData.started_at ? new Date(sessionData.started_at).getTime() : null
      if (!startTime) {
        console.error("No started_at:", sessionData.started_at);
        throw new Error('Game start time missing')
      }
      setGameStartTime(startTime)
      console.log("Set gameStartTime:", startTime);

      // Parse responses
      console.log("Parsing responses...");
      const parsedResponses = sessionData.responses || [];
      console.log("Parsed responses length:", parsedResponses.length);
      let myResponse = parsedResponses.find((r: any) => r.participant === participantId);

      if (!myResponse) {
        console.log('No response found, creating initial...');
        myResponse = {
          id: generateXID(),
          participant: participantId,
          score: 0,
          racing: false,
          answers: [],
          correct: 0,
          accuracy: "0.00",
          duration: 0,
          total_question: formattedQuestions.length,
          current_question: 0,
        };
      } else {
        console.log("Found myResponse:", { correct: myResponse.correct, current_question: myResponse.current_question });
      }

      // Set state dari myResponse
      setCorrectAnswers(myResponse.correct || 0);
      setCurrentQuestionIndex(myResponse.current_question || 0);

      const savedAnswers = myResponse.answers.map((a: any) => parseInt(a.answer_id)) || new Array(formattedQuestions.length).fill(null);
      setAnswers(savedAnswers);
      console.log("Set answers length:", savedAnswers.length);

      setLoading(false)
      console.log('=== FETCH SUCCESS ===')
    } catch (err: any) {
      console.error("=== FETCH ERROR ===", err.message);
      setError(err.message)
      if (retryCount < 3) {
        console.log(`Retrying in ${1000 * (retryCount + 1)}ms...`)
        setTimeout(() => fetchGameData(retryCount + 1), 1000 * (retryCount + 1))
      } else {
        console.error('Max retries reached, redirecting to /')
        router.replace(`/`)  // <-- INI PENYEBAB! Ganti ke `/join/${roomCode}` kalau mau balik lobby aja
      }
      setLoading(false)
    }
  }, [roomCode, participantId, router])

  // UPDATE: Initialize participantId and check session (racing dari responses)
  useEffect(() => {
    if (!participantId) return;

    const checkPlayerState = async () => {
      // Fetch session untuk cek status
      console.log("Fetching session status...");
      const { data, error } = await supabase
        .from("game_sessions")
        .select("status")
        .eq("game_pin", roomCode)
        .single();

      if (error || !data) {
        console.error("Error fetching session status:", error);
        console.log("Redirect to lobby due to session error");
        router.replace(`/join/${roomCode}`);
        return;
      }

      console.log("Session status:", data.status);
      // Kalau gak active, balik lobby
      if (data.status !== 'active') {
        console.log("Status not active, redirect to lobby");
        router.replace(`/join/${roomCode}`);
        return;
      }

      // Cek racing dari responses
      console.log("Fetching responses for racing check...");
      const { data: participantData } = await supabase
        .from("game_sessions")
        .select("responses")
        .eq("game_pin", roomCode)
        .single();

      let parsedResponses = [];
      try {
        parsedResponses = typeof participantData?.responses === 'string'
          ? JSON.parse(participantData.responses)
          : participantData?.responses || [];
        console.log("Parsed responses length:", parsedResponses.length);
      } catch (e) {
        console.error("Error parsing responses:", e);
      }

      const myResponse = parsedResponses.find((r: any) => r.participant === participantId);
      console.log("My response found:", !!myResponse, myResponse?.racing);
      if (myResponse && myResponse.racing === true) {
        console.log("Racing true, redirect to minigame");
        router.push(`/join/${roomCode}/minigame`);
        return;
      }

      console.log("Proceed to fetchGameData");
      fetchGameData();
    };

    checkPlayerState();
  }, [roomCode, router, fetchGameData]);

  // UPDATE: Save progress - update responses object di game_sessions
  const saveProgressAndRedirect = useCallback(async () => {
    if (!gameStartTime || !participantId || !session) return

    const now = Date.now()
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000)
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00"

    // Parse responses
    let currentResponses = [];
    try {
      currentResponses = typeof session.responses === 'string' ? JSON.parse(session.responses) : session.responses || [];
    } catch (e) {
      console.error("Error parsing responses:", e);
    }

    const pointsPerQuestion = Math.floor(100 / totalQuestions);

    // Update myResponse dengan final summary
    let myResponse = currentResponses.find((r: any) => r.participant === participantId);
    if (myResponse) {
      myResponse.score = correctAnswers * pointsPerQuestion;
      myResponse.correct = correctAnswers;
      myResponse.accuracy = accuracy;
      myResponse.duration = elapsedSeconds;
      myResponse.current_question = totalQuestions;
      myResponse.total_question = totalQuestions;
      myResponse.racing = false; // Final false
      myResponse.completion = true
    }

    // TAMBAHAN: Update participants dengan score final
    let currentParticipants: any[] = [];
    try {
      currentParticipants = typeof session.participants === 'string'
        ? JSON.parse(session.participants)
        : session.participants || [];
      console.log(currentParticipants)
      console.log(session.participants)
    } catch (e) {
      console.error("Error parsing participants:", e);
      currentParticipants = [];
    }

    // Cari participant berdasarkan ID, tambahin score
    const participantIndex = currentParticipants.findIndex((p: any) => p.id === participantId);
    if (participantIndex !== -1) {
      currentParticipants[participantIndex].score = myResponse.score; // Tambah score di sini
    } else {
      console.warn("Participant not found in participants array");
    }

    // Update supabase dengan responses DAN participants
    const { error: finalError } = await supabase
      .from("game_sessions")
      .update({
        responses: currentResponses,
        participants: currentParticipants // Pass array langsung
      })
      .eq("id", session.id);

    if (finalError) {
      console.error("Error updating final session:", finalError);
      return;
    }

    router.push(`/join/${roomCode}/result`)
  }, [gameStartTime, participantId, session?.id, correctAnswers, totalQuestions, roomCode, router])

  // Realtime timer based on wall time from DB start (updated: run even if partial, but safe)
  useEffect(() => {
    if (loading || questions.length === 0 || gameDuration === 0) {
      console.log("Timer skipped:", loading, questions.length, gameDuration);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    console.log('Starting timer with startTime:', gameStartTime);

    const updateRemaining = () => {
      if (!gameStartTime) {
        setTotalTimeRemaining(0);
        return;
      }
      const now = Date.now();
      const elapsed = Math.floor((now - gameStartTime) / 1000);
      const remaining = gameDuration - elapsed;
      setTotalTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        saveProgressAndRedirect();
      }
    };

    // Initial
    updateRemaining();

    // Clear old & set new
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStartTime, loading, questions.length, gameDuration, saveProgressAndRedirect]);


  // UPDATE: Subscribe to game_sessions status changes
  useEffect(() => {
    if (!roomCode || !participantId || hasBootstrapped.current) return; // FIX: Prevent multiple subs
    hasBootstrapped.current = true;

    const channelName = `game-player:${roomCode}:${participantId}` // Unique per player
    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions", // Ganti dari game_rooms
          filter: `game_pin=eq.${roomCode}`, // Ganti dari room_code
        },
        (payload) => {
          console.log('Game session update:', payload.new.status)
          if (payload.new.status === "finished") {
            saveProgressAndRedirect()
          }
        }
      )
      .subscribe()

    return () => {
      hasBootstrapped.current = false;
      supabase.removeChannel(subscription)
    }
  }, [roomCode, participantId, fetchGameData, gameStartTime, saveProgressAndRedirect]) // Tambah deps

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])


  // UPDATE: handleAnswerSelect - update responses JSON
  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setShowResult(true);

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0);
    setCorrectAnswers(newCorrectAnswers);

    const now = Date.now();
    const elapsedSeconds = gameStartTime ? Math.floor((now - gameStartTime) / 1000) : 0;
    const accuracy = totalQuestions > 0 ? ((newCorrectAnswers / totalQuestions) * 100).toFixed(2) : "0.00";

    const pointsPerQuestion = Math.floor(100 / totalQuestions);

    // Answer obj (mirip contoh DB)
    const answerObj = {
      id: generateXID(),
      answer_id: answerIndex.toString(),
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      points_earned: isCorrect ? pointsPerQuestion : 0,
      created_at: new Date().toISOString()
    };

    // Parse responses
    let currentResponses = [];
    try {
      currentResponses = typeof session.responses === 'string' ? JSON.parse(session.responses) : session.responses || [];
    } catch (e) {
      console.error("Error parsing responses:", e);
    }

    // Cari atau buat myResponse
    let myResponse = currentResponses.find((r: any) => r.participant === participantId);
    if (!myResponse) {
      myResponse = {
        id: generateXID(),
        participant: participantId,
        score: 0,
        racing: false,
        correct: 0,
        accuracy: "0.00",
        duration: 0,
        total_question: totalQuestions,
        current_question: 0,
        answers: [],
        completion: false
      };
      currentResponses.push(myResponse);
    }

    myResponse.answers.push(answerObj);
    myResponse.correct = newCorrectAnswers;
    myResponse.score = newCorrectAnswers * pointsPerQuestion;
    myResponse.accuracy = accuracy;
    myResponse.duration = elapsedSeconds;
    myResponse.current_question = currentQuestionIndex + 1;

    // Update session dengan responses
    const { error: responseError } = await supabase
      .from("game_sessions")
      .update({ responses: currentResponses })
      .eq("id", session.id);

    if (responseError) console.error("Error updating response:", responseError);

    // Next logic (sama, dengan update racing di myResponse)
    const nextIndex = currentQuestionIndex + 1;

    setTimeout(async () => {
      if (nextIndex < totalQuestions) {
        if (nextIndex % 3 === 0) {
          myResponse.racing = true;

          await supabase
            .from("game_sessions")
            .update({ responses: currentResponses })
            .eq("id", session.id);

          localStorage.setItem("nextQuestionIndex", nextIndex.toString());
          router.push(`/join/${roomCode}/minigame`);
        } else {
          setCurrentQuestionIndex(nextIndex);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setShowResult(false);
        }
      } else {
        myResponse.racing = false;
        myResponse.duration = elapsedSeconds;
        myResponse.current_question = totalQuestions;
        myResponse.completion = true

        // TAMBAHAN: Update participants dengan score final
        let currentParticipants: any[] = [];
        try {
          currentParticipants = typeof session.participants === 'string'
            ? JSON.parse(session.participants)
            : session.participants || [];
          console.log(currentParticipants)
          console.log(session.participants)
        } catch (e) {
          console.error("Error parsing participants:", e);
          currentParticipants = [];
        }

        // Cari participant berdasarkan ID, tambahin score
        const participantIndex = currentParticipants.findIndex((p: any) => p.id === participantId);
        if (participantIndex !== -1) {
          currentParticipants[participantIndex].score = myResponse.score; // Tambah score di sini
        } else {
          console.warn("Participant not found in participants array");
        }

        // Update supabase dengan responses DAN participants
        const { error: finalError } = await supabase
          .from("game_sessions")
          .update({
            responses: currentResponses,
            participants: currentParticipants // Pass array langsung
          })
          .eq("id", session.id);

        if (finalError) {
          console.error("Error updating final session:", finalError);
          return;
        }

        router.push(`/join/${roomCode}/result`);
      }
    }, 500);
  }, [isAnswered, answers, currentQuestionIndex, currentQuestion?.correctAnswer, correctAnswers, totalQuestions, gameStartTime, participantId, session, roomCode, router])

  const getOptionStyle = (optionIndex: number) => {
    // mode normal (belum submit)
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-[#00ffff] bg-[#00ffff]/10 animate-neon-pulse"
        : "border-[#ff6bff]/70 hover:border-[#ff6bff] hover:bg-[#ff6bff]/10 hover:scale-[1.01] glow-pink-subtle"
    }

    // mode setelah submit
    if (optionIndex === selectedAnswer) {
      // yang dipilih user
      return optionIndex === currentQuestion.correctAnswer
        ? "border-[#00ff00] bg-[#00ff00]/10 text-[#00ff00] glow-green"   // benar
        : "border-red-500 bg-red-500/10 text-red-500"                  // salah
    }

    // yang tidak dipilih → tidak usah di-highlight sama sekali
    return "border-[#ff6bff]/50 bg-[#1a0a2a]/50 opacity-60"
  }

  const getTimeColor = () => {
    if (totalTimeRemaining <= 10) return "text-red-500"
    if (totalTimeRemaining <= 20) return "text-[#ff6bff] glow-pink-subtle"
    return "text-[#00ffff] glow-cyan"
  }

  // Enhanced loading check: Stay loading until all critical data is ready
  const isReady = !loading && !error && questions.length > 0 && gameStartTime && gameDuration > 0 && !!currentQuestion

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center relative overflow-hidden pixel-font">
        {/* Background cycling even in loading */}
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
        <LoadingRetro /> {/* Show loading until fully ready */}
        {error && (
          <div className="absolute top-4 left-4 bg-red-500/90 text-white p-2 rounded pixel-text">
            Error: {error} {/* Inline error message */}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">

      {/* Background */}
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

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto pt-8 px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#00ffff] pixel-text glow-cyan tracking-wider">
            CRAZY RACE
          </h1>
        </div>

        {/* Timer and Progress */}
        <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card my-8 px-4 py-2">
          <CardContent className="px-0">
            <div className="flex sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Clock
                  className={`h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 ${getTimeColor()}`}
                />
                <div>
                  <div
                    className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold ${getTimeColor()}`}
                  >
                    {formatTime(totalTimeRemaining)}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <Badge
                  className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] px-3 sm:px-4 sm:py-2 text-base sm:text-lg md:text-xl lg:text-2xl pixel-text glow-cyan"
                >
                  {currentQuestionIndex + 1}/{totalQuestions}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
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
        .pixel-font {
          font-family: 'Press Start 2P', cursive, monospace;
          image-rendering: pixelated;
        }
        .pixel-text {
          image-rendering: pixelated;
          text-shadow: 2px 2px 0px #000;
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
        .pixel-border-small {
          border: 2px solid #00ffff;
          background: #1a0a2a;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }
        .pixel-card {
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3);
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
        .glow-cyan {
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-pink-subtle {
          animation: neon-pulse-pink 1.5s ease-in-out infinite;
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
        @keyframes neon-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}