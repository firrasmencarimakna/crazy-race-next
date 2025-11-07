// Updated results page: join/[roomCode]/results/page.tsx
// Key changes for compactness:
// - Reduced font sizes, paddings, and margins throughout to fit within viewport
// - Main card: Smaller icons, tighter spacing
// - Stats grid: Smaller cards with compact content
// - Breakdown: Inline layout for scores
// - Actions: Horizontal on all sizes, smaller buttons
// - Overall: Removed excessive mb-8, used mb-4; max-w-4xl retained but content squeezed
// - Retained theme, animations, and functionality

"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Target, Clock, Star, Home, RotateCcw, Crown, Award } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import LoadingRetro from "@/components/loadingRetro"
import { breakOnCaps } from "@/utils/game"
import Image from "next/image"

// Background GIFs
const backgroundGifs = [
  "/assets/background/host/10.webp",
]

// Car GIF mappings
const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: string
  totalTime: string
  rank: number
  totalPlayers: number
  participantId: string
}

export default function PlayerResultsPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [participantId, setParticipantId] = useState<string>(""); // Ganti dari playerId

  const [loading, setLoading] = useState(true)
  const [currentPlayerStats, setCurrentPlayerStats] = useState<PlayerStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    const pid = localStorage.getItem("participantId") || ""; // Ganti dari playerId
    if (!pid) {
      router.replace(`/`);
      return;
    }
    setParticipantId(pid);
  }, [router]);

  useEffect(() => {
    if (!roomCode || !participantId || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    let channel: any = null;
    let responsesCache: Record<string, { score: number; duration: number }> = {}; // Cache from responses

    const setupInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch game_sessions
        const { data: sessionData, error: sessionError } = await supabase
          .from("game_sessions")
          .select("id, total_time_minutes, participants, responses")
          .eq("game_pin", roomCode)
          .single();

        if (sessionError || !sessionData) {
          throw new Error(`Session not found: ${sessionError?.message || 'No data'}`);
        }

        const gameDuration = sessionData.total_time_minutes * 60; // Convert to seconds

        // Parse participants & responses
        let parsedParticipants = [];
        let parsedResponses = [];
        try {
          parsedParticipants = typeof sessionData.participants === 'string' ? JSON.parse(sessionData.participants) : sessionData.participants || [];
          parsedResponses = typeof sessionData.responses === 'string' ? JSON.parse(sessionData.responses) : sessionData.responses || [];
        } catch (e: any) {
          throw new Error(`Parse error: ${e.message}`);
        }

        if (parsedResponses.length === 0) {
          throw new Error("No responses found");
        }

        // Ambil current player response
        const myResponse = parsedResponses.find((r: any) => r.participant === participantId);
        if (!myResponse) {
          throw new Error("Player response not found");
        }

        const result = myResponse; // Direct dari response
        const totalSeconds = Math.min(result.duration || 0, gameDuration);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const totalTime = `${mins}:${secs.toString().padStart(2, "0")}`;

        // Cari nickname & car dari participants
        const currentParticipant = parsedParticipants.find((p: any) => p.id === participantId);
        if (!currentParticipant) {
          throw new Error("Player participant not found");
        }

        // Hitung rank awal
        const sorted = Object.entries(responsesCache)
          .sort(([, a], [, b]) => b.score - a.score || a.duration - b.duration)
          .map(([pid]) => pid);
        const rank = sorted.findIndex((pid) => pid === participantId) + 1;

        setCurrentPlayerStats({
          nickname: currentParticipant.nickname,
          car: currentParticipant.car || "blue",
          finalScore: result.score || 0,
          correctAnswers: result.correct || 0,
          totalQuestions: result.total_question || 0,
          accuracy: result.accuracy || "0.00",
          totalTime,
          rank,
          totalPlayers: sorted.length,
          participantId,
        });

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    setupInitialData();

    return () => {
      hasBootstrapped.current = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomCode, participantId]);


  // Background cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  if (loading || error || !currentPlayerStats) {
    return (
      <LoadingRetro />
    )
  }

  const formatAccuracy = (value: string | number) =>
    parseFloat(Number(value).toFixed(2)).toString();


  const { finalScore, correctAnswers, totalQuestions, accuracy, totalTime, rank, nickname, car } = currentPlayerStats

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

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-4 sm:pb-5"
        >
          <div className="inline-block p-4 md:pt-14">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">
              Result
            </h1>
          </div>
        </motion.div>

        {/* Main Result Card */}
        <motion.div
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/40 backdrop-blur-xs pixel-card p-7 md:p-10 mb-4 text-center animate-neon-pulse-pink">
            <div className="flex flex-col items-center justify-center space-x-2">
              <img
                src={carGifMap[car] || '/assets/car/car5_v2.webp'}
                alt={`${car} car`}
                className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150"
              />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white pixel-text glow-text ">{breakOnCaps(nickname)}</h2>
          </Card>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4"
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="p-5 text-center bg-[#1a0a2a]/10 border-[#00ffff]/70 backdrop-blur-xs pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-xs text-[#ff6bff] pixel-text">Correct</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/10 border-[#00ffff]/70 backdrop-blur-xs pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">
              {finalScore}
            </div>
            <div className="text-xs text-[#ff6bff] pixel-text">Score</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/10 border-[#00ffff]/70 backdrop-blur-xs pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">{totalTime}</div>
            <div className="text-xs text-[#ff6bff] pixel-text">Time</div>
          </Card>
          <Card className="p-5 text-center bg-[#1a0a2a]/10 border-[#00ffff]/70 backdrop-blur-xs pixel-card">
            <div className="text-xl font-bold text-[#00ffff] mb-1 pixel-text glow-cyan">{formatAccuracy(accuracy)}%</div>
            <div className="text-xs text-[#ff6bff] pixel-text">Accuracy</div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-row gap-2 justify-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button
            size="sm"
            variant="outline"
            className="bg-[#1a0a2a]/50 border-[#00ffff] text-[#00ffff] pixel-button glow-cyan hover:bg-[#00ffff]/70"
            onClick={() => router.push('/')}
          >
            <Home className="mr-1 h-4 w-4" />
            Home
          </Button>
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
          box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3);
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
        .glow-yellow {
          filter: drop-shadow(0 0 10px #ffd700);
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
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
        .animate-neon-pulse-pink {
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