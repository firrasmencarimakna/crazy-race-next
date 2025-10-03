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
import { sortPlayersByProgress, formatTime, calculateRemainingTime } from "@/utils/game"

// Background GIFs
const backgroundGifs = [
  "/assets/gif/host/4.webp",
]

// Mapping warna mobil ke file GIF mobil
const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.webp",
  blue: "/assets/car/car2.webp",
  green: "/assets/car/car3.webp",
  yellow: "/assets/car/car4.webp",
  purple: "/assets/car/car5.webp",
  orange: "/assets/car/car5.webp",
}

export default function HostMonitorPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [gameTimeRemaining, setGameTimeRemaining] = useState(0)
  const [gameDuration, setGameDuration] = useState(300)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50) // 0-100, default 50%
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const audioRef = useRef<HTMLAudioElement>(null)

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

  // Fetch initial game data
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);

      // Ambil data room lengkap
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, settings, questions, start, status, end")
        .eq("room_code", roomCode)
        .single();

      if (roomError || !room) {
        console.error("Error fetching room:", roomError);
        setLoading(false);
        return;
      }

      setRoom(room);
      setRoomId(room.id);

      // Hitung total questions dan duration
      const questions = room.questions || [];
      setTotalQuestions(questions.length);
      
      const settings = typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings;
      const duration = settings?.duration || 300;
      setGameDuration(duration);

      // Hitung sisa waktu jika game sedang berjalan
      if (room.status === 'playing' && room.start) {
        const remaining = calculateRemainingTime(room.start, duration);
        setGameTimeRemaining(remaining);
      } else if (room.status === 'finished') {
        setGameTimeRemaining(0);
      }

      // Ambil players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, nickname, result, completion, car, joined_at")
        .eq("room_id", room.id);

      if (!playersError && playersData) {
        setPlayers(playersData);
      }

      setLoading(false);
    };

    fetchInitial();
  }, [roomCode]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!roomId) return;

    const subscription = supabase
      .channel(`host-monitor-${roomId}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "players", 
          filter: `room_id=eq.${roomId}` 
        },
        (payload) => {
          setPlayers((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new;
          setRoom(newRoom);
          
          // Update timer jika status berubah
          if (newRoom.status === 'finished') {
            setGameTimeRemaining(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  // Timer effect untuk game time
  useEffect(() => {
    if (gameTimeRemaining <= 0 || room?.status === 'finished') return;

    const timer = setInterval(() => {
      setGameTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto end game ketika waktu habis
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameTimeRemaining, room?.status]);

  // Sort players by progress dengan animasi
  const sortedPlayers = useMemo(() => {
    return sortPlayersByProgress(players);
  }, [players]);

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  const endGame = async () => {
    const endTime = new Date().toISOString();
    
    const { error } = await supabase
      .from("game_rooms")
      .update({ 
        status: "finished", 
        end: endTime 
      })
      .eq("id", roomId);

    if (error) {
      console.error("Error ending game:", error);
      return;
    }

    console.log("Game ended successfully");
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a0a2a] flex items-center justify-center">
        <div className="text-[#00ffff] pixel-text">Loading game monitor...</div>
      </div>
    );
  }

  if (room?.status === 'finished') {
    router.push(`/host/${roomCode}/leaderboard`)
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

      {/* Overlay Effects */}
      <div className="crt-effect"></div>
      <div className="noise-effect"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-purple-900/20 pointer-events-none"></div>

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
          </div>
        </motion.div>
      )}

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
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#00ffff] pixel-text glow-cyan">
              Crazy Race
            </h1>
          </div>
        </motion.div>
          
          {/* Game Timer dan Controls */}
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card px-6 py-4 mb-4 w-full ">
            <div className="flex items-center justify-between space-x-6">
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
                {sortedPlayers.map((player, index) => {
                  const result = player.result?.[0] || {};
                  const progress = result.current_question || 0;
                  const correctAnswers = result.correct || 0;
                  const isCompleted = player.completion;
                  const currentlyAnswering = progress > 0 && !isCompleted && progress < totalQuestions;

                  return (
                    <motion.div
                      key={player.id}
                      layoutId={player.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 30,
                        duration: 0.6 
                      }}
                      whileHover={{ scale: 1.05 }}
                      className={`group ${currentlyAnswering ? "glow-cyan animate-neon-pulse" : "glow-pink-subtle"}`}
                    >
                      <Card
                        className={`p-3 bg-[#1a0a2a]/50 border-2 border-double transition-all duration-300 h-full gap-2 ${
                          currentlyAnswering 
                            ? "border-[#00ffff]/70 bg-[#00ffff]/10" 
                            : isCompleted
                            ? "border-[#00ff00]/70 bg-[#00ff00]/10"
                            : "border-[#ff6bff]/70"
                        }`}
                      >
                        {/* Rank Badge */}
                        <div className="flex items-center">
                          <div className="flex items-center justify-between space-x-2 w-full">
                            {getRankIcon(index)}
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="text-center">
                          <h3 className="font-bold text-white pixel-text text-sm leading-tight glow-text mb-2">
                            {player.nickname}
                          </h3>
                          
                          {/* Progress Bar */}
                          <Progress
                            value={(progress / totalQuestions) * 100}
                            className={`h-2 bg-[#1a0a2a]/50 border border-[#00ffff]/30 mb-2 ${
                              isCompleted ? "bg-green-500/20" : ""
                            }`}
                          />
                          
                          {/* Status */}
                          <div className="text-xs text-[#00ffff] pixel-text">
                            {progress}/{totalQuestions}
                          </div>
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
      <audio
        ref={audioRef}
        src="/assets/music/robbers.mp3"
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