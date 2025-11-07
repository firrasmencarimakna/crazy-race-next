"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock, CheckCircle, XCircle, ArrowRight, Flag, Crown, Award, SkipForward, Menu, X, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { sortPlayersByProgress, formatTime, calculateRemainingTime, breakOnCaps } from "@/utils/game"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"
import { generateXID } from "@/lib/id-generator"

// Background statis (hapus cycling)
const backgroundImage = "/assets/background/host/9.webp"

// Mapping warna mobil ke file GIF mobil
const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

type PlayerResult = {
  score?: number;
  correct?: number;
  accuracy?: string;
  duration?: number;
  current_question?: number;
  total_question?: number;
  answers?: (number | null)[];
};

type Player = {
  id: string;
  result: PlayerResult[] | string | null;
  completion: boolean;
};

export default function HostMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const [players, setPlayers] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0);
  const [gameDuration, setGameDuration] = useState(300);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate remaining time
  const calculateRemainingTime = (startTimestamp: string, duration: number): number => {
    const start = new Date(startTimestamp).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 1000;
    return Math.max(0, Math.floor(duration - elapsed));
  };

  // Fetch initial
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, started_at, total_time_minutes, participants, responses, current_questions")
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData) {
        console.error("Error fetching session:", sessionError);
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // Parse questions untuk total
      let parsedQuestions = [];
      try {
        parsedQuestions = typeof sessionData.current_questions === 'string' ? JSON.parse(sessionData.current_questions) : sessionData.current_questions || [];
      } catch (e) {
        console.error("Error parsing questions:", e);
      }
      setTotalQuestions(parsedQuestions.length);

      // Duration
      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);

      // Start time
      if (sessionData.status === 'active' && sessionData.started_at) {
        setGameStartTime(new Date(sessionData.started_at).getTime());
        const remaining = calculateRemainingTime(sessionData.started_at, duration);
        setGameTimeRemaining(remaining);
      } else if (sessionData.status === 'finished') {
        setGameTimeRemaining(0);
        setGameStartTime(null);
      }

      // Parse players
      let parsedParticipants = [];
      let parsedResponses = [];
      try {
        parsedParticipants = typeof sessionData.participants === 'string' ? JSON.parse(sessionData.participants) : sessionData.participants || [];
        parsedResponses = typeof sessionData.responses === 'string' ? JSON.parse(sessionData.responses) : sessionData.responses || [];
      } catch (e) {
        console.error("Error parsing participants/responses:", e);
      }

      const parsedPlayers = parsedParticipants.map((p: any) => {
        const response = parsedResponses.find((r: any) => r.participant === p.id);
        return {
          id: p.id,
          nickname: p.nickname,
          car: p.car || 'blue',
          currentQuestion: response?.current_question || 0,
          totalQuestion: response?.total_question || parsedQuestions.length,
          score: response?.score || 0,
          racing: response?.racing || false,
          duration: response?.duration || 0,
          accuracy: response?.accuracy || '0.00',
          isComplete: (response?.current_question || 0) === (response?.total_question || parsedQuestions.length),
          joinedAt: p.created_at || new Date().toISOString(),
        };
      });

      setPlayers(parsedPlayers);
      setLoading(false);
    };

    if (roomCode) fetchInitial();
  }, [roomCode]);

  // Realtime sub
  useEffect(() => {
    if (!roomCode) return;

    const subscription = supabase
      .channel(`host-monitor-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `game_pin=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Realtime payload:', payload.new); // Log full
          const newSession = payload.new;
          setSession(newSession);

          // Re-parse
          let parsedParticipants = [];
          let parsedResponses = [];
          let parsedQuestions = [];
          try {
            parsedParticipants = typeof newSession.participants === 'string' ? JSON.parse(newSession.participants) : newSession.participants || [];
            parsedResponses = typeof newSession.responses === 'string' ? JSON.parse(newSession.responses) : newSession.responses || [];
            parsedQuestions = typeof newSession.current_questions === 'string' ? JSON.parse(newSession.current_questions) : newSession.current_questions || [];
            console.log('Realtime parsed: participants', parsedParticipants.length, 'responses', parsedResponses.length, 'questions', parsedQuestions.length); // Debug total
          } catch (e) {
            console.error("Realtime parse error:", e);
            return;
          }

          const parsedPlayers = parsedParticipants.map((p: any) => {
            const response = parsedResponses.find((r: any) => r.participant === p.id);
            const totalQ = parsedQuestions.length || response?.total_question || 0; // FIX: Prioritas parsedQuestions.length
            const isComplete = response ? (response.current_question || 0) === totalQ : false;
            console.log(`Player ${p.nickname} progress: ${response?.current_question || 0}/${totalQ}, racing: ${response?.racing || false}, complete: ${isComplete}`); // Log totalQ
            return {
              id: p.id,
              nickname: p.nickname,
              car: p.car || 'blue',
              currentQuestion: response?.current_question || 0,
              totalQuestion: totalQ, // Use totalQ
              score: response?.score || 0,
              racing: response?.racing || false,
              duration: response?.duration || 0,
              accuracy: response?.accuracy || '0.00',
              isComplete,
              joinedAt: p.created_at || new Date().toISOString(),
            };
          });

          setPlayers(parsedPlayers);

          // Update timer
          if (newSession.status === 'finished') {
            setGameTimeRemaining(0);
            setGameStartTime(null);
          } else if (newSession.status === 'active' && newSession.started_at) {
            setGameStartTime(new Date(newSession.started_at).getTime());
          }

          // Check all complete
          const allCompleted = parsedPlayers.every((p: any) => p.isComplete);
          if (allCompleted && newSession.status === 'active') {
            console.log('All players completed, ending game');
            endGame();
          }
        }
      )
      .subscribe((status) => {
        console.log('Sub status:', status);
      });

    return () => {
      supabase.removeChannel(subscription)
    };
  }, [roomCode]);

  // Timer effect
  useEffect(() => {
    if (!gameStartTime || session?.status !== 'active') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const updateGameTime = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - gameStartTime) / 1000);
      const remaining = Math.max(0, gameDuration - elapsed);
      setGameTimeRemaining(remaining);

      if (remaining <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        endGame();
      }
    };

    updateGameTime();
    timerIntervalRef.current = setInterval(updateGameTime, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameStartTime, gameDuration, session?.status]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const startAudio = async () => {
      if (!hasInteracted) {
        try {
          audio.muted = isMuted;
          await audio.play();
          setHasInteracted(true);
          console.log("🔊 Audio started via interaction!");
        } catch (err) {
          console.warn("⚠️ Audio play blocked, waiting for interaction...");
        } finally {
          // lepas listener apapun hasilnya
          document.removeEventListener("click", startAudio);
          document.removeEventListener("keydown", startAudio);
          document.removeEventListener("scroll", startAudio);
        }
      }
    };

    // 🧠 coba autoplay duluan
    const tryAutoplay = async () => {
      try {
        audio.muted = isMuted;
        await audio.play();
        console.log("✅ Autoplay berhasil tanpa interaksi!");
        setHasInteracted(true);
      } catch {
        console.log("❌ Autoplay gagal, tunggu interaksi user...");
        // kalau gagal, baru pasang listener
        document.addEventListener("click", startAudio);
        document.addEventListener("keydown", startAudio);
        document.addEventListener("scroll", startAudio);
      }
    };

    tryAutoplay();

    return () => {
      document.removeEventListener("click", startAudio);
      document.removeEventListener("keydown", startAudio);
      document.removeEventListener("scroll", startAudio);
    };
  }, [hasInteracted, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleMuteToggle = () => setIsMuted((prev) => !prev);

  // Sort players
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.isComplete !== b.isComplete) return b.isComplete - a.isComplete;
      if (a.racing !== b.racing) return b.racing - a.racing;
      if (a.currentQuestion !== b.currentQuestion) return b.currentQuestion - a.currentQuestion;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }, [players]);

  // End game (updated: handle AFK in responses)
  const endGame = async () => {
    const endTime = new Date().toISOString();

    const { error: sessionError } = await supabase
      .from("game_sessions")
      .update({ status: "finished", ended_at: endTime })
      .eq("game_pin", roomCode);

    setLoading(true);

    if (sessionError) {
      console.error("Error ending game:", sessionError);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Fetch latest
    const { data: latestSession } = await supabase
      .from("game_sessions")
      .select("responses, current_questions, participants")
      .eq("game_pin", roomCode)
      .single();

    if (!latestSession) return;

    let parsedResponses = [];
    let parsedQuestions = [];
    let parsedParticipants = [];
    try {
      parsedResponses = typeof latestSession.responses === 'string' ? JSON.parse(latestSession.responses) : latestSession.responses || [];
      parsedQuestions = typeof latestSession.current_questions === 'string' ? JSON.parse(latestSession.current_questions) : latestSession.current_questions || [];
      parsedParticipants = typeof latestSession.participants === 'string' ? JSON.parse(latestSession.participants) : latestSession.participants || [];
    } catch (e) {
      console.error("Error parsing for AFK:", e);
      return;
    }

    const totalQ = parsedQuestions.length;

    // Deteksi AFK: No response OR answers.length === 0 (murni AFK, skip incomplete with answers)
    const afkParticipants = parsedParticipants.filter((p: any) => {
      const response = parsedResponses.find((r: any) => r.participant === p.id);
      if (!response) {
        console.log(`AFK: ${p.nickname} (no response)`);
        return true;
      }
      if (response.answers && response.answers.length === 0) {
        console.log(`AFK: ${p.nickname} (empty answers)`);
        return true;
      }
      // Skip if answers.length > 0 (let player handle)
      console.log(`Skip: ${p.nickname} (has answers, length: ${response.answers?.length || 0})`);
      return false;
    });

    console.log(`AFK players: ${afkParticipants.length}`);

    if (afkParticipants.length > 0) {
      const defaultTemplate = {
        id: generateXID(),
        score: 0,
        racing: false,
        answers: [],
        correct: 0,
        accuracy: "0.00",
        duration: 0,
        total_question: 0,
        current_question: totalQ,
        completion: true,
      };

      afkParticipants.forEach((p: any) => {
        const afkResult = { ...defaultTemplate, participant: p.id };
        const afkIndex = parsedResponses.findIndex((r: any) => r.participant === p.id);
        if (afkIndex !== -1) {
          parsedResponses[afkIndex] = afkResult;
        } else {
          parsedResponses.push(afkResult);
        }
      });

      // Deep clone & update
      const deepResponses = JSON.parse(JSON.stringify(parsedResponses));
      const { error: afkError } = await supabase
        .from("game_sessions")
        .update({ responses: deepResponses })
        .eq("game_pin", roomCode);

      if (afkError) console.error("Error updating AFK:", afkError);
      else console.log(`✅ ${afkParticipants.length} AFK marked.`);
    }

    router.push(`/host/${roomCode}/leaderboard`);
  };

  if (loading) return <LoadingRetro />;
  if (session?.status === 'finished') {
    router.push(`/host/${roomCode}/leaderboard`);
    return null;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1: return <Award className="w-5 h-5 text-gray-300" />;
      case 2: return <Award className="w-5 h-5 text-orange-400" />;
      default: return <span className="text-sm font-bold">#{rank + 1}</span>;
    }
  };

  const getTimeColor = () => {
    if (gameTimeRemaining <= 30) return "text-red-500 animate-pulse";
    if (gameTimeRemaining <= 60) return "text-[#ff6bff] glow-pink-subtle";
    return "text-[#00ffff] glow-cyan";
  };

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      <audio
        ref={audioRef}
        src="/assets/music/racingprogress.mp3"
        loop
        preload="auto"
        className="hidden"
        autoPlay
      />

      {/* Background statis (hapus AnimatePresence & cycling) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleMuteToggle}
        className={`absolute top-4 right-4 z-40 p-3 border-2 pixel-button rounded-lg shadow-lg min-w-[48px] min-h-[48px] flex items-center justify-center transition-all cursor-pointer
    ${isMuted
            ? "bg-[#ff6bff]/30 border-[#ff6bff] glow-pink shadow-[#ff6bff]/30 hover:bg-[#ff8aff]/50"
            : "bg-[#00ffff]/30 border-[#00ffff] glow-cyan shadow-[#00ffff]/30 hover:bg-[#33ffff]/50"
          }`}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        <span className="filter drop-shadow-[2px_2px_2px_rgba(0,0,0,0.7)]">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </span>
      </motion.button>

      <h1 className="absolute top-5 right-20 hidden md:block">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={64}
        />
      </h1>

      <h1 className="absolute top-7 left-10 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-10">
        {/* Header dengan Timer dan Controls */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center pb-4 sm:pb-5"
          >
            <div className="inline-block p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">
                Race Progress
              </h1>
            </div>
          </motion.div>

          {/* Game Timer dan Controls */}
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card px-6 py-4 mb-4 w-full ">
            <div className="flex flex-col sm:flex-row items-center justify-between space-x-6">
              <div className="flex items-center space-x-4">
                <Clock className={`w-8 h-8 ${getTimeColor()}`} />
                <div>
                  <div className={`text-2xl font-bold ${getTimeColor()} pixel-text`}>
                    {formatTime(gameTimeRemaining)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={endGame}
                  className="bg-red-500 hover:bg-red-600 pixel-button glow-red flex items-center space-x-2"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>End Game</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Player Rankings dengan Animasi */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card p-4 md:p-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence>
                // Fix UI map JSX (pakai ParsedPlayer fields, gak player.result)
                {sortedPlayers.map((player, index) => {
                  const progress = player.currentQuestion;
                  const isCompleted = player.isComplete;
                  const currentlyAnswering = progress > 0 && !isCompleted && progress < totalQuestions;

                  return (
                    <motion.div
                      key={player.id}
                      layoutId={player.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.6 }}
                      whileHover={{ scale: 1.05 }}
                      className={`group ${currentlyAnswering ? "glow-cyan animate-neon-pulse" : player.racing ? "glow-blue animate-pulse" : "glow-pink-subtle"}`}
                    >
                      <Card className={`p-3 bg-[#1a0a2a]/50 border-2 border-double transition-all duration-300 h-full gap-4 ${currentlyAnswering ? "border-[#00ffff]/70 bg-[#00ffff]/10"
                        : player.racing ? "border-blue-500/70 bg-blue-500/10"
                          : isCompleted ? "border-[#00ff00]/70 bg-[#00ff00]/10"
                            : "border-[#ff6bff]/70"
                        }`}>
                        {/* Rank Badge */}
                        <div className="flex items-center">
                          <div className="flex items-center justify-end space-x-2 w-full">
                            <Badge>
                              {progress}/{totalQuestions}
                            </Badge>
                          </div>
                        </div>

                        <div className="relative mb-3">
                          <img
                            src={carGifMap[player.car] || '/assets/car/car5_v2.webp'}
                            alt={`${player.car} car`}
                            className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        </div>

                        {/* Player Info */}
                        <div className="text-center">
                          <h3 className="text-white pixel-text text-sm leading-tight mb-2 line-clamp-2 break-words">
                            {breakOnCaps(player.nickname)}
                          </h3>

                          {/* Progress Bar */}
                          <Progress
                            value={(progress / totalQuestions) * 100}
                            className={`h-2 bg-[#1a0a2a]/50 border border-[#00ffff]/30 mb-2 ${isCompleted ? "bg-green-500/20"
                              : player.racing ? "bg-blue-500/20"
                                : ""
                              }`}
                          />
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Empty State */}
            {sortedPlayers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No players in the game yet...</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Audio Element untuk Background Music */}

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
        .glow-pink {
          filter: drop-shadow(0 0 10px #ff6bff);
        }
        .glow-cyan {
          filter: drop-shadow(0 0 10px #00ffff);
        }
        .glow-cyan-intense {
          filter: drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 15px #00ffff) drop-shadow(0 0 20px #00ffff);
        }
        .glow-pink-subtle {
          filter: drop-shadow(0 0 5px rgba(255, 107, 255, 0.5));
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
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
        @keyframes neon-glow {
          0%, 100% { 
            filter: drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 15px #00ffff) drop-shadow(0 0 20px #00ffff);
            text-shadow: 2px 2px 0px #000, 0 0 10px #00ffff;
          }
          50% { 
            filter: drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 20px #00ffff) drop-shadow(0 0 30px #00ffff) drop-shadow(0 0 40px #00ffff);
            text-shadow: 2px 2px 0px #000, 0 0 20px #00ffff, 0 0 30px #00ffff;
          }
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        .glow-pink-subtle {
          animation: neon-pulse-pink 2s ease-in-out infinite;
        }
        .animate-neon-glow {
          animation: neon-glow 2s ease-in-out infinite;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}