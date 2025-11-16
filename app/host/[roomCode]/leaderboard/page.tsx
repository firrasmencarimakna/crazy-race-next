"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { breakOnCaps } from "@/utils/game"
import Image from "next/image"
import { HomeIcon, RotateCwIcon } from "lucide-react"
import { generateGamePin } from "../../page"
import { shuffleArray } from "../settings/page"
import { useAuth } from "@/contexts/authContext"
import { t } from "i18next"

const APP_NAME = "crazyrace"; // Safety check for multi-tenant DB

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: number
  totalTime: string
  rank: number
  duration: number
}

// Background GIFs (reuse from player results)
const backgroundGifs = [
  "/assets/background/host/10.webp",
]

const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

export default function HostLeaderboardPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  const computePlayerStats = (response: any, totalQuestions: number): Omit<PlayerStats, 'nickname' | 'car' | 'rank'> => {
    const stats = response || {};
    const correctAnswers = stats.correct || 0;
    const accuracy = parseFloat(stats.accuracy) || (totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0);
    const totalSeconds = stats.duration || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const totalTime = `${mins}:${secs.toString().padStart(2, '0')}`;
    const finalScore = stats.score || (correctAnswers * 10);

    return { finalScore, correctAnswers, totalQuestions, accuracy, totalTime, duration: totalSeconds };
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('participants, responses')
        .eq('game_pin', roomCode)
        .eq('application', APP_NAME) // Added application filter
        .single();

      if (sessionError || !sessionData) {
        console.error('Error fetching session:', sessionError);
        setError('Failed to load session data');
        return;
      }

      // Parse participants & responses
      let parsedParticipants = [];
      let parsedResponses = [];
      try {
        parsedParticipants = typeof sessionData.participants === 'string' ? JSON.parse(sessionData.participants) : sessionData.participants || [];
        parsedResponses = typeof sessionData.responses === 'string' ? JSON.parse(sessionData.responses) : sessionData.responses || [];
      } catch (e) {
        console.error('Parse error:', e);
        setError('Failed to parse data');
        return;
      }

      if (parsedResponses.length === 0) {
        setError('No responses found');
        return;
      }

      // Filter hanya pemain yang sudah completion = true
      const completeResponses = parsedResponses.filter(
        (r: any) => r.completion === true
      );


      if (completeResponses.length === 0) {
        setError('No completed players');
        return;
      }

      // Compute stats
      const allStats = completeResponses
        .filter((r: any) => r.participant)
        .map((r: any) => {
          const participant = parsedParticipants.find((p: any) => p.id === r.participant);
          if (!participant) return null;
          return {
            ...computePlayerStats(r, r.total_question || 0),
            nickname: participant.nickname,
            car: participant.car || 'blue',
          };
        })
        .filter(Boolean); // Remove null

      if (allStats.length === 0) {
        setError('No valid results');
        return;
      }

      // Sort & rank
      const sortedStats = [...allStats].sort((a, b) =>
        b.finalScore - a.finalScore || a.duration - b.duration
      );
      const rankedStats = sortedStats.map((stats, index) => ({
        ...stats,
        rank: index + 1,
      }));

      setPlayerStats(rankedStats);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (roomCode) fetchData();
  }, [fetchData]);

  // Realtime sub
  useEffect(() => {
    if (!roomCode) return;

    const subscription = supabase
      .channel(`host-leaderboard-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `game_pin=eq.${roomCode}`,
        },
        () => fetchData() // Refetch on update
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };

  }, [roomCode, fetchData]);

  // Background
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length);
    }, 5000);
    return () => clearInterval(bgInterval);
  }, []);

  // Tambah function restartGame di atas return (dalam component, di leaderboard)
  const restartGame = async (e: React.MouseEvent) => {
    const icon = e.currentTarget.querySelector("svg");
    if (icon) icon.classList.add("animate-spin");

    try {
      // Step 1: Fetch current session untuk settings & quiz_id
      const { data: currentSession, error: fetchError } = await supabase
        .from("game_sessions")
        .select("quiz_id, host_id, total_time_minutes, question_limit, difficulty, game_end_mode, allow_join_after_start, application, difficulty")
        .eq("game_pin", roomCode)
        .eq("application", APP_NAME) // Added application filter
        .single();

      if (fetchError || !currentSession) throw fetchError || new Error('Current session not found');

      // Step 2: Fetch full quiz untuk questions
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("questions")
        .eq("id", currentSession.quiz_id)
        .single();

      if (quizError || !quizData) throw quizError || new Error('Quiz not found');

      // Step 3: Shuffle & slice questions (reuse question_limit)
      const shuffledQuestions = shuffleArray(quizData.questions);
      const slicedQuestions = shuffledQuestions.slice(0, parseInt(currentSession.question_limit || '10'));

      // Step 4: Generate new game_pin
      const newGamePin = generateGamePin(6);

      // Step 5: Insert new session (same settings, new pin, waiting, empty participants/responses, shuffled questions)
      const newSession = {
        quiz_id: currentSession.quiz_id,
        host_id: currentSession.host_id,
        game_pin: newGamePin,
        status: 'waiting',
        total_time_minutes: currentSession.total_time_minutes || 5,
        question_limit: currentSession.question_limit || '10',
        game_end_mode: currentSession.game_end_mode || 'manual',
        allow_join_after_start: currentSession.allow_join_after_start || false,
        participants: [], // Empty
        responses: [], // Empty
        current_questions: slicedQuestions, // Shuffled slice
        application: currentSession.application || APP_NAME, // Ensure application is set
        created_at: new Date().toISOString(),
        difficulty: currentSession.difficulty
      };

      const { data: newSessionData, error: insertError } = await supabase
        .from("game_sessions")
        .insert(newSession)
        .select("game_pin")
        .single();

      if (insertError || !newSessionData) throw insertError || new Error('Failed to create new session');

      console.log('New session created:', newGamePin);
      router.push(`/host/${newGamePin}`); // Direct to new host room
    } catch (err: any) {
      console.error('Restart error:', err);
    } finally {
      if (icon) icon.classList.remove("animate-spin");
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-400 glow-gold";
      case 2: return "text-gray-300 glow-silver";
      case 3: return "text-amber-600 glow-bronze";
      default: return "text-[#00ffff]";
    }
  };

  if (loading) {
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
      </div>
    );
  }

  if (error || playerStats.length === 0) {
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
        <div className="relative z-10 max-w-4xl mx-auto p-4 text-center flex items-center justify-center min-h-screen">
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-6">
            <h1 className="text-xl font-bold mb-2 text-[#00ffff] pixel-text glow-cyan">Leaderboard not available</h1>
            <p className="text-[#ff6bff] mb-4 pixel-text">{error || 'No data found'}</p>
            <Button
              className="bg-[#ff6bff] pixel-button glow-pink"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const topThree = playerStats.slice(0, 3);
  const others = playerStats.slice(3);

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

      <h1 className="absolute top-5 right-10 hidden md:block">
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

      <div className="relative z-10 max-w-5xl mx-auto p-4">
        <div className="text-center py-4 md:pt-14">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan tracking-wider animate-neon-glow"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">{t('resulthost.title')}</span>
          </motion.h1>
        </div>

        {/* Podium - Top 3: Staggered steps with fixed heights for visual podium */}
        <motion.div
          className="flex justify-center items-end gap-4 sm:gap-6 mb-8 sm:mb-12 h-[400px] md:h-[475px] relative" // 🔥 FIXED: Height di semua screen, gap responsive
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* 2nd Place - Left, medium height */}
          {topThree[1] && (
            <motion.div
              className="w-48 sm:w-64 order-1 flex flex-col justify-end h-[240px] md:h-[400px]" // 🔥 FIXED: Responsive height (mobile: 240px, sm+: 300px)
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="p-4 sm:p-5 text-center pixel-card border-gray-300/50 bg-[#1a0a2a]/70 animate-pulse-silver min-h-[160px] flex-1 flex flex-col justify-center"> {/* 🔥 NEW: min-h & flex biar fill height */}
                <div className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${getRankColor(2)} pixel-text`}>#2</div>
                <img
                  src={carGifMap[topThree[1].car] || '/assets/car/car5_v2.webp'}
                  alt={`${carGifMap[topThree[1].car]} car`}
                  className="h-12 sm:h-16 sm:sm:h-20 md:h-24 lg:h-28 w-16 sm:w-20 sm:sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150" // 🔥 FIXED: Responsive img sizes
                />
                <div className="text-xl sm:text-2xl font-bold text-[#00ffff] mb-1 sm:mb-2 pixel-text glow-cyan">{topThree[1].finalScore}</div>
                <h3 className="text-lg sm:text-xl font-bold text-white pixel-text glow-text mb-1 sm:mb-2 break-words line-clamp-2">{breakOnCaps(topThree[1].nickname)}</h3>
              </Card>
            </motion.div>
          )}

          {/* 1st Place - Center, tallest podium */}
          {topThree[0] && (
            <motion.div
              className="w-56 sm:w-80 order-2 flex flex-col justify-end h-[320px] md:h-[425px]" // 🔥 FIXED: Responsive height (mobile: 320px, sm+: 450px)
              initial={{ scale: 0.9, y: 80 }}
              animate={{ scale: 1.1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <Card className="p-5 sm:p-6 text-center pixel-card border-yellow-400/70 bg-[#1a0a2a]/80 animate-pulse-gold min-h-[200px] flex-1 flex flex-col justify-center"> {/* 🔥 NEW: min-h & flex */}
                <div className={`text-4xl sm:text-5xl font-bold mb-2 sm:mb-3 ${getRankColor(1)} pixel-text`}>#1</div>
                <img
                  src={carGifMap[topThree[0].car] || '/assets/car/car5_v2.webp'}
                  alt={`${topThree[0].car} car`}
                  className="h-12 sm:h-16 sm:sm:h-20 md:h-24 lg:h-28 w-16 sm:w-20 sm:sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                />
                <div className="text-3xl sm:text-4xl font-bold text-[#00ffff] mb-2 pixel-text glow-cyan">{topThree[0].finalScore}</div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white pixel-text glow-text mb-2 sm:mb-3 break-words line-clamp-2">{breakOnCaps(topThree[0].nickname)}</h3>
              </Card>
            </motion.div>
          )}

          {/* 3rd Place - Right, shortest height */}
          {topThree[2] && (
            <motion.div
              className="w-48 sm:w-64 order-3 flex flex-col justify-end h-[200px] md:h-[375px]" // 🔥 FIXED: Responsive height (mobile: 200px, sm+: 250px)
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Card className="p-4 sm:p-5 text-center pixel-card border-amber-600/50 bg-[#1a0a2a]/70 animate-pulse-bronze min-h-[140px] flex-1 flex flex-col justify-center"> {/* 🔥 NEW: min-h & flex */}
                <div className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${getRankColor(3)} pixel-text`}>#3</div>
                <img
                  src={carGifMap[topThree[2].car] || '/assets/car/car5_v2.webp'}
                  alt={`${carGifMap[topThree[2].car]} car`}
                  className="h-12 sm:h-16 sm:sm:h-20 md:h-24 lg:h-28 w-16 sm:w-20 sm:sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
                />
                <div className="text-xl sm:text-2xl font-bold text-[#00ffff] mb-1 sm:mb-2 pixel-text glow-cyan">{topThree[2].finalScore}</div>
                <h3 className="text-lg sm:text-xl font-bold text-white pixel-text glow-text mb-1 sm:mb-2 break-words line-clamp-2">{breakOnCaps(topThree[2].nickname)}</h3>
              </Card>
            </motion.div>
          )}

        </motion.div>

        {/* Other Players */}
        {others.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card p-4 mb-4">
              {/* <h3 className="text-lg font-bold mb-2 text-center text-[#00ffff] pixel-text glow-cyan">Other Racers</h3> */}
              <div className="space-y-2">
                {others.map((player) => (
                  <div key={player.nickname} className="flex items-center justify-between px-4 py-3 bg-[#1a0a2a]/50 rounded-xl pixel-card">
                    <div className="flex items-center space-x-4">
                      <div className={`text-xl font-bold ${getRankColor(player.rank)} pixel-text`}>
                        #{player.rank}
                      </div>
                      <h4 className="text-lg font-bold text-white pixel-text glow-text break-words line-clamp-2">{breakOnCaps(player.nickname)}</h4>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg text-[#00ffff] glow-cyan">{player.finalScore}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="fixed mx-7 inset-y-0 left-0 right-0 flex justify-between items-center pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {/* Tombol Home (kiri tengah) */}
          <button
            onClick={() => router.push('/')}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full bg-[#1a0a2a]/70 border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/20 transition-all duration-300 shadow-lg"
          >
            <HomeIcon className="w-6 h-6" />
          </button>

          {/* Tombol New Race (kanan tengah) */}
          <button
            onClick={restartGame}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full bg-[#ff6bff]/70 border border-white text-white hover:bg-[#ff8aff]/80 transition-all duration-300 shadow-lg"
          >
            <RotateCwIcon className="w-6 h-6" />
          </button>
        </motion.div>
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
        .pixel-card {
          box-shadow: 0 0 20px rgba(255, 107, 255, 0.3);
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
        .glow-pink {
          filter: drop-shadow(0 0 10px #ff6bff);
        }
        .glow-gold {
          filter: drop-shadow(0 0 15px #ffd700);
        }
        .glow-silver {
          filter: drop-shadow(0 0 12px #d1d5db);
        }
        .glow-bronze {
          filter: drop-shadow(0 0 12px #b45309);
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        @keyframes neon-pulse-gold {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 25px rgba(255, 215, 0, 1), 0 0 50px rgba(255, 215, 0, 0.8); }
        }
        @keyframes neon-pulse-silver {
          0%, 100% { box-shadow: 0 0 12px rgba(209, 213, 219, 0.7), 0 0 24px rgba(209, 213, 219, 0.5); }
          50% { box-shadow: 0 0 20px rgba(209, 213, 219, 1), 0 0 40px rgba(209, 213, 219, 0.8); }
        }
        @keyframes neon-pulse-bronze {
          0%, 100% { box-shadow: 0 0 12px rgba(180, 83, 9, 0.7), 0 0 24px rgba(180, 83, 9, 0.5); }
          50% { box-shadow: 0 0 20px rgba(180, 83, 9, 1), 0 0 40px rgba(180, 83, 9, 0.8); }
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
        .animate-pulse-gold {
          animation: neon-pulse-gold 2s ease-in-out infinite;
        }
        .animate-pulse-silver {
          animation: neon-pulse-silver 2s ease-in-out infinite;
        }
        .animate-pulse-bronze {
          animation: neon-pulse-bronze 2s ease-in-out infinite;
        }
        .animate-neon-glow {
          animation: neon-glow 2s ease-in-out infinite;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}