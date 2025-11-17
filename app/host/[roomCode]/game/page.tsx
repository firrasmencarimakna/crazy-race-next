"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Clock, Crown, Award, SkipForward, Volume2, VolumeX, Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { formatTime, breakOnCaps } from "@/utils/game"
import LoadingRetro from "@/components/loadingRetro"
import Image from "next/image"
import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

const APP_NAME = "crazyrace";

const backgroundImage = "/assets/background/host/9.webp"

const carGifMap: Record<string, string> = {
  purple: "/assets/car/car1_v2.webp",
  white: "/assets/car/car2_v2.webp",
  black: "/assets/car/car3_v2.webp",
  aqua: "/assets/car/car4_v2.webp",
  blue: "/assets/car/car5_v2.webp",
}

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
  const [isEndGameConfirmOpen, setEndGameConfirmOpen] = useState(false);

  const calculateRemainingTime = (startTimestamp: string, duration: number): number => {
    const start = new Date(startTimestamp).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 1000;
    return Math.max(0, Math.floor(duration - elapsed));
  };

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, started_at, total_time_minutes, participants, responses, current_questions")
        .eq("game_pin", roomCode)
        .eq("application", APP_NAME)
        .single();

      if (sessionError || !sessionData) {
        console.error("Error fetching session:", sessionError);
        setLoading(false);
        router.push('/host');
        return;
      }

      setSession(sessionData);
      const parsedQuestions = sessionData.current_questions || [];
      setTotalQuestions(parsedQuestions.length);
      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);

      if (sessionData.status === 'active' && sessionData.started_at) {
        setGameStartTime(new Date(sessionData.started_at).getTime());
        setGameTimeRemaining(calculateRemainingTime(sessionData.started_at, duration));
      } else if (sessionData.status === 'finished') {
        setGameTimeRemaining(0);
        setGameStartTime(null);
        router.push(`/host/${roomCode}/leaderboard`);
        return;
      }

      const parsedParticipants = sessionData.participants || [];
      const parsedResponses = sessionData.responses || [];
      const parsedPlayers = parsedParticipants.map((p: any) => {
        const response = parsedResponses.find((r: any) => r.participant === p.id);
        return {
          id: p.id,
          nickname: p.nickname,
          car: p.car || 'blue',
          currentQuestion: response?.current_question || 0,
          totalQuestion: parsedQuestions.length,
          score: response?.score || 0,
          racing: response?.racing || false,
          isComplete: response?.completion === true,
          joinedAt: p.created_at || new Date().toISOString(),
        };
      });

      setPlayers(parsedPlayers);
      setLoading(false);
    };
    if (roomCode) fetchInitial();
  }, [roomCode, router]);

  const handleConfirmEndGame = async () => {
    setEndGameConfirmOpen(false);
    if (session?.status === 'finished') return;

    const { error } = await supabase.rpc('end_game_session', {
      p_session_id: session.id,
      p_app_name: APP_NAME
    });

    if (error) {
      console.error("Error ending game via RPC:", error);
      return; 
    }

    setTimeout(() => {
        router.push(`/host/${roomCode}/leaderboard`);
    }, 1500);
  };

  useEffect(() => {
    if (!roomCode) return;
    const subscription = supabase
      .channel(`host-monitor-${roomCode}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `game_pin=eq.${roomCode}` },
        (payload) => {
          const newSession = payload.new as any;
          setSession(newSession);
          const parsedParticipants = newSession.participants || [];
          const parsedResponses = newSession.responses || [];
          const parsedQuestions = newSession.current_questions || [];
          const totalQ = parsedQuestions.length;

          const parsedPlayers = parsedParticipants.map((p: any) => {
            const response = parsedResponses.find((r: any) => r.participant === p.id);
            const isComplete = response?.completion === true;
            return {
              id: p.id,
              nickname: p.nickname,
              car: p.car || 'blue',
              currentQuestion: response?.current_question || 0,
              totalQuestion: totalQ,
              score: response?.score || 0,
              racing: response?.racing || false,
              isComplete,
              joinedAt: p.created_at || new Date().toISOString(),
            };
          });
          setPlayers(parsedPlayers);

          if (newSession.status === 'finished') {
            setGameTimeRemaining(0);
            setGameStartTime(null);
            router.push(`/host/${roomCode}/leaderboard`);
          } else if (newSession.status === 'active' && newSession.started_at) {
            setGameStartTime(new Date(newSession.started_at).getTime());
          }

          const allCompleted = parsedPlayers.length > 0 && parsedPlayers.every((p: any) => p.isComplete);
          if (allCompleted && newSession.status === 'active') {
            handleConfirmEndGame();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(subscription) };
  }, [roomCode, router, session]);

  useEffect(() => {
    if (!gameStartTime || session?.status !== 'active') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    const updateGameTime = () => {
      const remaining = calculateRemainingTime(session.started_at, gameDuration);
      setGameTimeRemaining(remaining);
      if (remaining <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        handleConfirmEndGame();
      }
    };
    updateGameTime();
    timerIntervalRef.current = setInterval(updateGameTime, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) };
  }, [gameStartTime, gameDuration, session]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tryAutoplay = async () => {
      try {
        audio.muted = isMuted;
        await audio.play();
        setHasInteracted(true);
      } catch {
        const startAudio = async () => {
          if (hasInteracted) return;
          try {
            audio.muted = isMuted;
            await audio.play();
            setHasInteracted(true);
          } catch (err) { console.warn("Audio play blocked"); }
          document.removeEventListener("click", startAudio);
        };
        document.addEventListener("click", startAudio);
      }
    };
    tryAutoplay();
  }, [hasInteracted, isMuted]);

  useEffect(() => { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.isComplete !== b.isComplete) return b.isComplete - a.isComplete;
      if (a.racing !== b.racing) return b.racing - a.racing;
      if (a.currentQuestion !== b.currentQuestion) return b.currentQuestion - a.currentQuestion;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }, [players]);

  if (loading) return <LoadingRetro />;

  const getTimeColor = () => {
    if (gameTimeRemaining <= 30) return "text-red-500 animate-pulse";
    if (gameTimeRemaining <= 60) return "text-[#ff6bff] glow-pink-subtle";
    return "text-[#00ffff] glow-cyan";
  };

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font">
      <audio ref={audioRef} src="/assets/music/racingprogress-1.mp3" loop preload="auto" className="hidden" autoPlay />
      <div className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
      <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.05 }} onClick={() => setIsMuted(p => !p)} className={`absolute top-4 right-4 z-40 p-3 border-2 pixel-button rounded-lg shadow-lg min-w-[48px] min-h-[48px] flex items-center justify-center transition-all cursor-pointer ${isMuted ? "bg-[#ff6bff]/30 border-[#ff6bff] glow-pink" : "bg-[#00ffff]/30 border-[#00ffff] glow-cyan"}`} aria-label={isMuted ? "Unmute" : "Mute"}><span className="filter drop-shadow-[2px_2px_2px_rgba(0,0,0,0.7)]">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</span></motion.button>
      <h1 className="absolute top-5 right-20 hidden md:block"><Image src="/gameforsmartlogo.webp" alt="Gameforsmart Logo" width={256} height={64} /></h1>
      <h1 className="absolute top-7 left-10 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">Crazy Race</h1>
      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-10">
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center pb-4 sm:pb-5">
            <div className="inline-block p-4 sm:p-6"><h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">Race Progress</h1></div>
          </motion.div>
          <Card className="bg-[#1a0a2a]/60 border-[#ff6bff]/50 pixel-card px-6 py-4 mb-4 w-full ">
            <div className="flex flex-col sm:flex-row items-center justify-between space-x-6">
              <div className="flex items-center space-x-4">
                <Clock className={`w-8 h-8 ${getTimeColor()}`} />
                <div><div className={`text-2xl font-bold ${getTimeColor()} pixel-text`}>{formatTime(gameTimeRemaining)}</div></div>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={() => setEndGameConfirmOpen(true)} className="bg-red-500 hover:bg-red-600 pixel-button glow-red flex items-center space-x-2"><SkipForward className="w-4 h-4" /><span>End Game</span></Button>
              </div>
            </div>
          </Card>
        </div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
          <Card className="bg-[#1a0a2a]/40 border-[#ff6bff]/50 pixel-card p-4 md:p-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence>
                {sortedPlayers.map((player) => {
                  const progress = player.currentQuestion;
                  const isCompleted = player.isComplete;
                  const currentlyAnswering = progress > 0 && !isCompleted && progress < totalQuestions;
                  return (
                    <motion.div key={player.id} layoutId={player.id} initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -20 }} transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.6 }} whileHover={{ scale: 1.05 }} className={`group ${currentlyAnswering ? "glow-cyan animate-neon-pulse" : player.racing ? "glow-blue animate-pulse" : "glow-pink-subtle"}`}>
                      <Card className={`p-3 bg-[#1a0a2a]/50 border-2 border-double transition-all duration-300 h-full gap-4 ${currentlyAnswering ? "border-[#00ffff]/70 bg-[#00ffff]/10" : player.racing ? "border-blue-500/70 bg-blue-500/10" : isCompleted ? "border-[#00ff00]/70 bg-[#00ff00]/10" : "border-[#ff6bff]/70"}`}>
                        <div className="flex items-center">
                          <div className="flex items-center justify-end space-x-2 w-full">
                            {isCompleted ? (
                                <Badge className="bg-green-500/20 border border-green-500/50 text-green-400">
                                    <Check className="w-4 h-4" />
                                </Badge>
                            ) : (
                                <Badge>
                                    {progress}/{totalQuestions}
                                </Badge>
                            )}
                          </div>
                        </div>
                        <div className="relative mb-3"><img src={carGifMap[player.car] || '/assets/car/car5_v2.webp'} alt={`${player.car} car`} className="h-28 w-40 mx-auto object-contain animate-neon-bounce filter brightness-125 contrast-150" style={{ transform: 'scaleX(-1)' }} /></div>
                        <div className="text-center">
                          <h3 className="text-white pixel-text text-sm leading-tight mb-2 line-clamp-2 break-words">{breakOnCaps(player.nickname)}</h3>
                          <Progress value={(progress / totalQuestions) * 100} className={`h-2 bg-[#1a0a2a]/50 border border-[#00ffff]/30 mb-2 ${isCompleted ? "bg-green-500/20" : player.racing ? "bg-blue-500/20" : ""}`} />
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {sortedPlayers.length === 0 && (<div className="text-center py-8 text-gray-400"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No players in the game yet...</p></div>)}
          </Card>
        </motion.div>
      </div>
      
      <Dialog open={isEndGameConfirmOpen} onOpenChange={setEndGameConfirmOpen}>
        <DialogOverlay className="bg-[#1a0a2a]/60 backdrop-blur-md fixed inset-0 z-50" />
        <DialogContent className="bg-[#1a0a2a]/80 border-2 border-[#ff6bff] pixel-card">
          <DialogTitle className="text-xl text-[#ffefff] pixel-text glow-pink text-center">End Game</DialogTitle>
          <DialogDescription className="text-center text-gray-300 pixel-text my-4">Are you sure want to end the game?</DialogDescription>
          <DialogFooter className="flex justify-center gap-4">
            <Button variant="outline"
            onClick={() => setEndGameConfirmOpen(false)}
            className="pixel-button bg-gray-700 hover:bg-gray-600">Cancel</Button>
            <Button onClick={handleConfirmEndGame} className="pixel-button bg-red-600 hover:bg-red-500 glow-red">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .pixel-font { font-family: 'Press Start 2P', cursive, monospace; image-rendering: pixelated; }
        .pixel-text { image-rendering: pixelated; text-shadow: 2px 2px 0px #000; }
        .pixel-button { image-rendering: pixelated; box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8); transition: all 0.1s ease; }
        .pixel-button:hover:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8); }
        .pixel-card { box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 107, 255, 0.3); }
        .glow-pink { filter: drop-shadow(0 0 10px #ff6bff); }
        .glow-cyan { filter: drop-shadow(0 0 10px #00ffff); }
        .glow-red { filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.7)); }
        .glow-pink-subtle { filter: drop-shadow(0 0 5px rgba(255, 107, 255, 0.5)); }
        @keyframes neon-pulse { 50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); } }
        .animate-neon-pulse { animation: neon-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}