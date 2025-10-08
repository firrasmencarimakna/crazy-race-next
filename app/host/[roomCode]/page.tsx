"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Users, Play, ArrowLeft, VolumeX, Volume2, Maximize2, Check, Menu, X } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { calculateCountdown } from "@/utils/countdown"
import LoadingRetro from "@/components/loadingRetro"
import { Slider } from "@/components/ui/slider"
import { breakOnCaps, formatUrlBreakable } from "@/utils/game"
import Image from "next/image"

// List of background GIFs (same as previous pages for consistency)
const backgroundGifs = [
  "/assets/background/4.webp",
]

const carGifMap: Record<string, string> = {
  red: "/assets/car/car1.webp",
  blue: "/assets/car/car2.webp",
  green: "/assets/car/car3.webp",
  yellow: "/assets/car/car4.webp",
  purple: "/assets/car/car5.webp",
  orange: "/assets/car/car5.webp",
}

export default function HostRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [players, setPlayers] = useState<any[]>([])
  const [room, setRoom] = useState<any>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(50) // 0-100, default 50%
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [open, setOpen] = useState(false);
  const [joinLink, setJoinLink] = useState('')
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // State untuk toggle menu burger
  const audioRef = useRef<HTMLAudioElement>(null)

  const channel = supabase.channel('game_room');

  channel.on('presence', { event: 'sync' }, () => {
    console.log('Presence synced');
  });

  channel.subscribe((status) => {
    console.log('Realtime status:', status);
  });


  // Fetch room details and set up real-time subscriptions
  useEffect(() => {
    const fetchRoomAndPlayers = async () => {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("id, settings, questions, status, countdown_start, start")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError)
        setLoading(false)
        return
      }

      setRoom(roomData)
      setLoading(false)

      // Fetch initial players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, nickname, car, joined_at")
        .eq("room_id", roomData.id)

      if (playersError) {
        console.error("Error fetching players:", playersError)
      } else {
        setPlayers(playersData || [])
      }

      // Set up real-time subscription for players
      // Di dalam fetchRoomAndPlayers, ganti subscription players:
      const playersSubscription = supabase
        .channel(`host-players-${roomCode}`)
        .on(
          'postgres_changes',
          {
            event: '*', // '*' cover INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${roomData.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setPlayers((prev) => {
                const exists = prev.some((p) => p.id === payload.new.id);
                if (exists) return prev;
                return [...prev, payload.new];
              });
            } else if (payload.eventType === 'UPDATE') {
              // Tambah ini: Update existing player (e.g., car/nickname change)
              setPlayers((prev) =>
                prev.map((p) => p.id === payload.new.id ? { ...p, ...payload.new } : p)
              );
            } else if (payload.eventType === 'DELETE') {
              setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => { // Tambah callback status
          console.log('Players sub status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Players subscription active');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Players sub dropped, retrying in 3s...');
            // Auto-retry: Re-subscribe setelah delay
            setTimeout(() => {
              // Re-init subscription (call fetchRoomAndPlayers ulang atau recreate channel)
              fetchRoomAndPlayers(); // Atau logic recreate spesifik
            }, 3000);
          }
        });

      // Di useEffect fetchRoomAndPlayers, perbaiki room subscription:
      const roomSubscription = supabase
        .channel(`host-room-${roomCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_rooms',
            filter: `room_code=eq.${roomCode}`,
          },
          (payload) => {
            const newRoomData = payload.new;
            console.log('Host received room update:', newRoomData);

            setRoom(newRoomData);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(playersSubscription)
        supabase.removeChannel(roomSubscription)
      }
    }

    if (roomCode) {
      fetchRoomAndPlayers()
    }
  }, [roomCode])

  // Effect untuk sinkronisasi countdown
  useEffect(() => {
    if (!room?.countdown_start || room.status !== 'countdown') {
      console.log('No countdown needed:', {
        hasCountdownStart: !!room?.countdown_start,
        status: room?.status
      });
      setCountdown(0);
      return;
    }

    console.log('Starting wall-time countdown sync for host:', room.countdown_start);

    const countdownStartTime = new Date(room.countdown_start).getTime();
    const totalCountdown = 10;

    const updateCountdown = async () => {
      const now = Date.now();
      const elapsed = Math.floor((now - countdownStartTime) / 1000);
      const remaining = Math.max(0, totalCountdown - elapsed);

      console.log('Wall-time remaining:', remaining);
      setCountdown(remaining);

      if (remaining <= 0) {
        console.log('Countdown finished via wall-time, moving to game');
        clearInterval(countdownInterval);
        // Delay 500ms biar player sync
        setTimeout(async () => {
          try {
            const { error } = await supabase
              .from("game_rooms")
              .update({
                status: "playing",
                start: new Date().toISOString(),
                countdown_start: null
              })
              .eq("room_code", roomCode);

            if (error) {
              console.error('End countdown error:', error);
            } else {
              console.log('Host updated to playing status');
              setLoading(true);
              router.push(`/host/${roomCode}/game`);
            }
          } catch (err: unknown) {
            console.error('End countdown error:', err);
          }
        }, 500); // Delay buat player catch up
      }
    };

    // Initial update
    updateCountdown();

    // Interval setiap detik
    const countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Cleanup
    return () => {
      console.log('Cleaning up countdown interval');
      clearInterval(countdownInterval);
    };
  }, [room?.countdown_start, room?.status, roomCode, router]);

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

  // Base URL for the join link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinLink(`${window.location.origin}/?code=${roomCode}`)
    }
  }, [roomCode])

  // Effect untuk sinkronisasi countdown (updated)
  // Effect untuk sinkronisasi countdown (updated)
  useEffect(() => {
    if (!room?.countdown_start || room.status !== 'countdown') {
      console.log('No countdown needed:', {
        hasCountdownStart: !!room?.countdown_start,
        status: room?.status
      });
      setCountdown(0); // Reset kalau gak countdown
      return;
    }

    console.log('Starting wall-time countdown sync for host:', room.countdown_start);

    // Parse countdown_start ke timestamp (asumsi ISO string)
    const countdownStartTime = new Date(room.countdown_start).getTime();
    const totalCountdown = 10; // Detik total

    const updateCountdown = async () => {
      const now = Date.now();
      const elapsed = Math.floor((now - countdownStartTime) / 1000);
      const remaining = Math.max(0, totalCountdown - elapsed);

      console.log('Wall-time remaining:', remaining);
      setCountdown(remaining);

      if (remaining <= 0) {
        console.log('Countdown finished via wall-time, moving to game');
        clearInterval(countdownInterval);
        // Update DB dan redirect (hanya sekali)
        try {
          const { error } = await supabase
            .from("game_rooms")
            .update({
              status: "playing",
              start: new Date().toISOString(),
              countdown_start: null
            })
            .eq("room_code", roomCode);

          if (error) {
            console.error('End countdown error:', error);
          } else {
            console.log('Host updated to playing status');
            setLoading(true);
            router.push(`/host/${roomCode}/game`);
          }
        } catch (err: unknown) {
          console.error('End countdown error:', err);
        }
      }
    };

    // Initial update
    updateCountdown();

    // Interval setiap detik
    const countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Cleanup
    return () => {
      console.log('Cleaning up countdown interval');
      clearInterval(countdownInterval);
    };
  }, [room?.countdown_start, room?.status, roomCode, router]); // Depend sama, tapi logic gak re-start interval

  // Background image cycling
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundGifs.length)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 500)
      }, 500)
    }, 5000)
    return () => clearInterval(bgInterval)
  }, [])

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch (err) {
      console.error("Room copy failed:", err);
    }
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
    } catch (err) {
      console.error("Join copy failed:", err);
    }
  };

  const startGame = async () => {
    console.log('Host starting game...');

    // Untuk timestamp with time zone, gunakan ISO string langsung
    const countdownStart = new Date().toISOString();
    console.log('Setting countdown_start to (ISO):', countdownStart);

    const { error } = await supabase
      .from("game_rooms")
      .update({
        status: "countdown",
        countdown_start: countdownStart
      })
      .eq("room_code", roomCode);

    if (error) {
      console.error("startGame error:", error);
      return;
    }

    console.log('Game countdown started successfully');
    setGameStarted(true);
  };

  // Countdown display component
  if (countdown > 0) {
    return (
      <div className="min-h-screen z-50 bg-[#1a0a2a] flex items-center justify-center pixel-font"> {/* pt-20 untuk ruang burger */}
        <div className="text-center">
          <motion.div
            className="text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] leading-none font-bold text-[#00ffff] pixel-text glow-cyan race-pulse"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {countdown}
          </motion.div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <LoadingRetro />
  }

  return (
    <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden pixel-font"> {/* pt-20 untuk ruang burger */}
      {/* Audio Element untuk Background Music */}
      <audio
        ref={audioRef}
        src="/assets/music/robbers.mp3"
        loop
        preload="auto"
        className="hidden"
      />

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
        className="fixed top-4 left-4 z-40 p-3 bg-[#00ffff]/20 border-2 border-[#00ffff] pixel-button hover:bg-[#33ffff]/20 glow-cyan rounded-lg shadow-lg shadow-[#00ffff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Back to Host"
        onClick={() => router.push(`/host/${roomCode}/settings`)}
      >
        <ArrowLeft size={20} className="text-white" />
      </motion.button>

      <h1 className="absolute top-5 right-20 hidden md:block">
        <Image
          src="/gameforsmartlogo.webp"
          alt="Gameforsmart Logo"
          width={256}
          height={0}
        />
      </h1>

      <h1 className="absolute top-6 left-20 text-2xl font-bold text-[#00ffff] pixel-text glow-cyan hidden md:block">
        Crazy Race
      </h1>

      {/* Burger Menu Button - Fixed Top Right */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 right-4 z-40 p-3 bg-[#ff6bff]/20 border-2 border-[#ff6bff]/50 pixel-button hover:bg-[#ff8aff]/40 glow-pink rounded-lg shadow-lg shadow-[#ff6bff]/30 min-w-[48px] min-h-[48px] flex items-center justify-center"
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

      <div className="relative z-10 max-w-8xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-4"
        >
          <div className="inline-block py-4 md:pt-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#ffefff] pixel-text glow-pink">
              Host Room
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* Room Info & QR Code */}
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-4 sm:p-6 md:p-8 lg:col-span-2 order-1 lg:order-1">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f] rounded-lg">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00ffff] pixel-text glow-cyan">{roomCode}</div>
                <Button
                  onClick={copyRoomCode}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  {copiedRoom ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                </Button>
              </div>

              <div className="relative p-3 sm:p-4 md:p-5 bg-[#0a0a0f]  rounded-lg">
                {/* QR normal */}
                <QRCode
                  value={joinLink}
                  size={300}
                  className="mx-auto w-fit rounded p-2 bg-white"
                />

                {/* Tombol maximize */}
                <Button
                  onClick={() => setOpen(true)}
                  className="absolute top-1 right-1 bg-transparent hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </Button>

                {/* Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogOverlay className="bg-[#1a0a2a]/80 backdrop-blur-sm fixed inset-0 z-50" />
                  <DialogContent className=" backdrop-blur-sm border-none rounded-lg max-w-[100vw] sm:max-w-3xl p-4 sm:p-6">
                    <div className="flex justify-center">
                      <QRCode
                        value={joinLink}
                        size={Math.min(625, window.innerWidth * 0.8)}
                        className=" rounded w-fit bg-white p-2"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative py-4 px-7 bg-[#0a0a0f] rounded-lg">
                <div className="text-xs sm:text-sm text-[#00ffff] pixel-text glow-cyan break-words">
  {formatUrlBreakable(joinLink)}
</div>

                <Button
                  onClick={copyJoinLink}
                  className="absolute top-1 right-1 bg-transparent pixel-button hover:bg-gray-500/20 transition-colors p-1 sm:p-2"
                  size="sm"
                >
                  {copiedJoin ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                </Button>
              </div>
              <Button
                onClick={startGame}
                disabled={players.length === 0 || gameStarted}
                className="text-base sm:text-lg py-3 sm:py-4 bg-[#00ffff] border-2 sm:border-3 border-white pixel-button hover:bg-[#33ffff] glow-cyan text-black font-bold disabled:bg-[#6a4c93] disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Start
              </Button>
            </div>
          </Card>

          {/* Players List */}
          <Card className="bg-[#1a0a2a]/60 border-2 sm:border-3 border-[#ff6bff]/50 pixel-card glow-pink-subtle p-4 sm:p-6 md:p-8 lg:col-span-3 order-1 lg:order-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#00ffff] pixel-text glow-cyan text-center sm:text-left">
                {players.length} Player{players.length <= 1 ? "" : "s"}
              </h2>
            </div>

            <div className="space-y-4 mb-6 sm:mb-8">
              {players.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400 pixel-text">
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {players.map((player) => (
                    <motion.div
                      key={player.id}
                      className="relative group glow-pink-subtle"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 sm:border-3 border-double transition-all duration-300 
                   bg-transparent backdrop-blur-sm 
                   border-[#ff6bff]/70 hover:border-[#ff6bff]"
                      >
                        {/* Car GIF */}
                        <div className="relative mb-2 sm:mb-3">
                          <img
                            src={carGifMap[player.car] || '/assets/car/car5.webp'}
                            alt={`${player.car} car`}
                            className="h-16 sm:h-20 md:h-24 lg:h-28 w-20 sm:w-28 md:w-32 lg:w-40 mx-auto object-contain animate-neon-bounce
                       filter brightness-125 contrast-150"
                          />
                        </div>

                        {/* Player Nickname */}
                        <div className="text-center">
                          <p className="text-white text-xs leading-tight glow-text line-clamp-2 break-words">
                            {breakOnCaps(player.nickname)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
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
        .pixel-button {
          image-rendering: pixelated;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
          transition: all 0.1s ease;
        }
        .pixel-button:hover:not(:disabled) {
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
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
          transition: all 0.2s ease;
        }
        .pixel-card:hover {
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 107, 255, 0.4);
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
        .race-pulse {
          animation: race-pulse 0.5s ease-in-out infinite;
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
        @keyframes race-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes neon-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        /* Neon pulse animation for borders */
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.7), 0 0 20px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8); }
        }
        @keyframes neon-pulse-pink {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 255, 0.7), 0 0 20px rgba(255, 107, 255, 0.5); }
          50% { box-shadow: 0 0 15px rgba(255, 107, 255, 1), 0 0 30px rgba(255, 107, 255, 0.8); }
        }
        .glow-text {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .glow-green {
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        }
        .animate-neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        .glow-pink-subtle {
          animation: neon-pulse-pink 1.5s ease-in-out infinite;
        }
        
        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Responsive improvements */
        @media (max-width: 640px) {
          .pixel-button {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
          .pixel-card {
            margin-bottom: 1rem;
          }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
    </div>
  )
}