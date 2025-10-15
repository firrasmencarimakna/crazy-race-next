"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Asumsi Next.js
import { supabase } from '@/lib/supabase'; // Sesuaikan path-mu
import LoadingRetro from '@/components/loadingRetro';
import { formatTime } from '@/utils/game';

/**
 * Renders the mini racing game view for a joinable room, managing player state, game timer, and navigation to results.
 *
 * Handles loading player and room data, synchronizing progress with Supabase, listening for iframe messages and room status updates, and redirecting when the race or time finishes.
 *
 * @returns The RacingGame React element that displays the iframe-based racing game and its timer/error states.
 */
export default function RacingGame() {
    const router = useRouter();
    const { roomCode } = useParams();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [playerId, setPlayerId] = useState<string>("");

    // 🔥 NEW: State untuk timer & data game (mirip main)
    const [gameStartTime, setGameStartTime] = useState<number | null>(null);
    const [gameDuration, setGameDuration] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [totalTimeRemaining, setTotalTimeRemaining] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const pid = localStorage.getItem("playerId") || "";
        if (!pid) router.replace(`/`);
        else setPlayerId(pid);
    }, [router]);

    // 🔥 NEW: Fetch data game & player (mirip fetchGameData di main, tapi simplified buat mini)
    const fetchMiniGameData = useCallback(async () => {
        if (!roomCode || !playerId) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch room
            const { data: roomData, error: roomError } = await supabase
                .from("game_rooms")
                .select("start, settings")
                .eq("room_code", roomCode)
                .single();

            if (roomError || !roomData) throw new Error(`Room error: ${roomError?.message || 'No data'}`);

            const settings = typeof roomData.settings === "string" ? JSON.parse(roomData.settings) : roomData.settings;
            const startTime = roomData.start ? new Date(roomData.start).getTime() : null;
            if (!startTime) throw new Error('Game start time missing');

            setGameStartTime(startTime);
            setGameDuration(settings.duration);

            // Fetch player result
            const { data: playerData, error: playerError } = await supabase
                .from("players")
                .select("result")
                .eq("id", playerId)
                .single();

            if (playerError || !playerData) throw new Error(`Player error: ${playerError?.message || 'No data'}`);

            const result = playerData.result && playerData.result[0] ? playerData.result[0] : {};
            const savedAnswers = result.answers || [];
            const savedCorrect = result.correct || 0;
            const savedTotal = result.total_question || 0;
            const savedCurrent = result.current_question || 0;

            setAnswers(savedAnswers);
            setCorrectAnswers(savedCorrect);
            setTotalQuestions(savedTotal);
            setCurrentQuestionIndex(savedCurrent - 1); // Adjust ke 0-based kalau perlu

            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching mini game data:", err);
            setError(err.message);
            setLoading(false);
        }
    }, [roomCode, playerId]);

    useEffect(() => {
        if (roomCode && playerId) {
            fetchMiniGameData();
        }
    }, [roomCode, playerId, fetchMiniGameData]);

    // 🔥 NEW: Fungsi save progress & redirect ke result (mirip saveProgressAndRedirect di main)
    const saveAndRedirectToResult = useCallback(async () => {
        if (!gameStartTime || !playerId) return;

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - gameStartTime) / 1000);
        const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00";

        // Update result dengan durasi terkini (keep yang lain)
        const existingResult = answers.length > 0 ? { answers } : {}; // Fallback
        const updatedResult = {
            ...existingResult,
            score: correctAnswers * 10,
            correct: correctAnswers,
            accuracy,
            duration: elapsedSeconds,
            current_question: totalQuestions, // Sudah selesai semua
            total_question: totalQuestions,
        };

        const { error } = await supabase
            .from("players")
            .update({
                result: [updatedResult],
                completion: true,
                racing: false, // Pastiin false
            })
            .eq("id", playerId);

        if (error) {
            console.error("Error saving progress in mini:", error);
        } else {
            console.log('✅ Progress saved with full duration:', elapsedSeconds);
        }

        router.replace(`/join/${roomCode}/result`);
    }, [gameStartTime, playerId, correctAnswers, totalQuestions, answers, roomCode, router]);

    // 🔥 NEW: Timer logic di mini (sama kayak di main)
    useEffect(() => {
        if (loading || gameDuration === 0 || !gameStartTime) return;

        const updateRemaining = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - gameStartTime) / 1000);
            const remaining = gameDuration - elapsed;
            setTotalTimeRemaining(Math.max(0, remaining));

            if (remaining <= 0) {
                saveAndRedirectToResult();
            }
        };

        updateRemaining();
        const interval = setInterval(updateRemaining, 1000);
        return () => clearInterval(interval);
    }, [gameStartTime, loading, gameDuration, saveAndRedirectToResult]);

    // Existing: Subscription untuk room status
    useEffect(() => {
        if (!roomCode || !playerId) return;

        const channel = supabase
            .channel(`room-${roomCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `room_code=eq.${roomCode}`,
                },
                async (payload) => {
                    const newStatus = payload.new?.status;
                    console.log('Room status update:', newStatus);

                    if (newStatus === 'finished') {
                        // 🔥 UPDATED: Save progress dulu, baru redirect
                        await saveAndRedirectToResult();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomCode, playerId, saveAndRedirectToResult]); // Tambah dep

    iframeRef.current?.contentWindow?.focus();

    // Existing + UPDATED: Handle message dari iframe
    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (!event.data || typeof event.data !== 'object') return;

            if (event.data.type === 'racing_finished') {
                console.log('Racing finished detected from iframe');

                // 🔥 UPDATED: Set racing false dulu
                if (playerId) {
                    supabase
                        .from('players')
                        .update({ racing: false })
                        .eq('id', playerId)
                        .then(async ({ error }) => {
                            if (error) {
                                console.error('Error updating racing:', error);
                            } else {
                                console.log('Racing set to false');

                                // 🔥 NEW: Cek remaining time
                                if (gameStartTime) {
                                    const now = Date.now();
                                    const elapsed = Math.floor((now - gameStartTime) / 1000);
                                    const remaining = gameDuration - elapsed;

                                    if (remaining <= 0) {
                                        // Waktu habis selama racing, save & ke result
                                        await saveAndRedirectToResult();
                                    } else {
                                        // Masih ada waktu, balik ke game
                                        router.replace(`/join/${roomCode}/game`);
                                    }
                                } else {
                                    // Fallback, balik ke game
                                    router.replace(`/join/${roomCode}/game`);
                                }
                            }
                        });
                }
            }
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [playerId, roomCode, router, gameStartTime, gameDuration, saveAndRedirectToResult]);

    // Existing: Iframe load log
    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            console.log('Game loaded');
        }
    }, []);

    // 🔥 NEW: Show loading/error kalau perlu (opsional, biar UX bagus)
    if (loading) return <LoadingRetro />;
    if (error) return <div className="w-full h-screen flex justify-center items-center text-red-500">Error: {error}</div>;

    const getTimeColor = () => {
        if (totalTimeRemaining <= 30) return "text-red-500 animate-pulse";
        if (totalTimeRemaining <= 60) return "text-[#ff6bff] glow-pink-subtle";
        return "text-[#00ffff] glow-cyan";
    };

    // Existing: Iframe
    return (
        <div className="w-full h-screen relative flex justify-center items-center overflow-hidden">
            {totalTimeRemaining > 0 && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-9999 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-lg ${getTimeColor()}`}>
                    {formatTime(totalTimeRemaining)}
                </div>
            )}

            <iframe
                ref={iframeRef}
                src="/racing-game/v4.final.html"
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups"
                title="Racing Game"
                className="z-0"
            />
        </div>
    );

}