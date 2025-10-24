"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Asumsi Next.js
import { supabase } from '@/lib/supabase'; // Sesuaikan path-mu
import LoadingRetro from '@/components/loadingRetro';
import { formatTime } from '@/utils/game';
import { generateXID } from '@/lib/id-generator';

export default function RacingGame() {
  const router = useRouter();
  const { roomCode } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [participantId, setParticipantId] = useState<string>("");
  const [gameSrc, setGameSrc] = useState('/racing-game/v4.final.html');

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
  const [session, setSession] = useState<any>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<any>(null)

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);


  useEffect(() => {
    const pid = localStorage.getItem("participantId") || ""; // Ganti dari playerId
    if (!pid) {
      router.replace(`/`);
      return;
    }
    setParticipantId(pid);
  }, [router]);

  // 🔥 NEW: Fetch data game & player (mirip fetchGameData di main, tapi simplified buat mini)
  // UPDATE: Fetch data game & player dari game_sessions
  const fetchMiniGameData = useCallback(async (retryCount = 0) => {
    if (!roomCode || !participantId) return;
    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching mini game data (attempt ${retryCount + 1})`);
      // Single fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("started_at, total_time_minutes, difficulty, responses")
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(`Session error: ${sessionError?.message || 'No data'}`);
      }

      setSession(sessionData);

      const startTime = sessionData.started_at ? new Date(sessionData.started_at).getTime() : null;
      if (!startTime) throw new Error('Game start time missing');

      setGameStartTime(startTime);
      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);

      // Set src berdasarkan difficulty
      if (sessionData.difficulty) {
        let src = '/racing-game/v4.final.html'; // Default
        switch (sessionData.difficulty) {
          case 'easy':
            src = '/racing-game/v1.straight.html';
            break;
          case 'normal':
            src = '/racing-game/v2.curves.html';
            break;
          case 'hard':
            src = '/racing-game/v4.final.html';
            break;
        }
        setGameSrc(src);
      }

      // Parse responses untuk progress
      const parsedResponses = sessionData.responses || [];
      let myResponse = parsedResponses.find((r: any) => r.participant === participantId);

      if (!myResponse) {
        console.log('No response found in mini, creating initial...');
        myResponse = {
          id: generateXID(),
          participant: participantId,
          score: 0,
          racing: false,
          answers: [],
          correct: 0,
          accuracy: "0.00",
          duration: 0,
          total_question: 0, // Akan di-set dari main
          current_question: 0,
        };
      }

      const savedAnswers = myResponse.answers.map((a: any) => parseInt(a.answer_id)) || [];
      const savedCorrect = myResponse.correct || 0;
      const savedTotal = myResponse.total_question || 0;
      const savedCurrent = myResponse.current_question || 0;

      setAnswers(savedAnswers);
      setCorrectAnswers(savedCorrect);
      setTotalQuestions(savedTotal);
      setCurrentQuestionIndex(savedCurrent - 1); // Adjust ke 0-based kalau perlu

      setLoading(false);
      console.log('Mini game data loaded');
    } catch (err: any) {
      console.error("Error fetching mini game data:", err);
      setError(err.message);
      if (retryCount < 3) {
        setTimeout(() => fetchMiniGameData(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        router.replace(`/join/${roomCode}/game`); // Back to game on fail
      }
      setLoading(false);
    }
  }, [roomCode, participantId, router]);

  useEffect(() => {
    if (roomCode && participantId) {
      fetchMiniGameData();
    }
  }, [roomCode, participantId, fetchMiniGameData]);

  // UPDATE: Save progress & redirect ke result (update responses)
  const saveAndRedirectToResult = useCallback(async () => {
    if (!gameStartTime || !participantId || !session) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000);
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00";

    // Parse responses
    let currentResponses = [];
    try {
      currentResponses = typeof session.responses === 'string' ? JSON.parse(session.responses) : session.responses || [];
    } catch (e) {
      console.error("Error parsing responses:", e);
      return;
    }

    // Update myResponse
    let myResponse = currentResponses.find((r: any) => r.participant === participantId);
    if (myResponse) {
      myResponse.score = correctAnswers * 10;
      myResponse.correct = correctAnswers;
      myResponse.accuracy = accuracy;
      myResponse.duration = elapsedSeconds;
      myResponse.current_question = totalQuestions;
      myResponse.total_question = totalQuestions;
      myResponse.racing = false;
    }

    const { error } = await supabase
      .from("game_sessions")
      .update({ responses: currentResponses })
      .eq("id", session.id);

    if (error) {
      console.error("Error saving progress in mini:", error);
    } else {
      console.log('✅ Progress saved with full duration:', elapsedSeconds);
    }

    router.replace(`/join/${roomCode}/result`);
  }, [gameStartTime, participantId, session, correctAnswers, totalQuestions, roomCode, router]);

  // UPDATE: Timer logic (stabilkan dengan ref)
  useEffect(() => {
    if (loading || gameDuration === 0 || !gameStartTime) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

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
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStartTime, loading, gameDuration, saveAndRedirectToResult]);

  // UPDATE: Subscription untuk session status
  useEffect(() => {
    if (!roomCode || !participantId) return;

    const channel = supabase
      .channel(`session-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `game_pin=eq.${roomCode}`,
        },
        async (payload) => {
          const newStatus = payload.new?.status;
          console.log('Session status update:', newStatus);

          if (newStatus === 'finished') {
            await saveAndRedirectToResult();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, participantId, saveAndRedirectToResult]);

  iframeRef.current?.contentWindow?.focus();

  // Existing + UPDATED: Handle message dari iframe
  useEffect(() => {
    async function handleMessage(event: any) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'racing_finished') return;

      const currentSession = sessionRef.current;
      if (!participantId || !currentSession) {
        console.warn("⏸️ Skip: belum siap, coba lagi sebentar...");
        setTimeout(() => handleMessage(event), 300);
        return;
      }

      let currentResponses = [];
      try {
        currentResponses =
          typeof currentSession.responses === "string"
            ? JSON.parse(currentSession.responses)
            : currentSession.responses || [];
      } catch (e) {
        console.error("Error parsing responses:", e);
        return;
      }

      const updatedResponses = currentResponses.map((r: any) =>
        r.participant === participantId ? { ...r, racing: false } : r
      );

      console.log("🔄 Updating racing=false for participant:", participantId);
      console.log("🧩 Responses preview:", updatedResponses);

      const { data, error, status } = await supabase
        .from("game_sessions")
        .update({ responses: updatedResponses })
        .eq("game_pin", roomCode)
        .select();

      if (error) console.error("❌ Supabase update error:", error);
      else {
        console.log("✅ Racing updated successfully:", data, "status:", status);
        setSession((prev: any) => ({ ...prev, responses: updatedResponses }));
        router.replace(`/join/${roomCode}/game`);
      }

      // Update session state juga

    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [participantId]);




  // Existing: Iframe load log
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      console.log('Game loaded');
    }
  }, []);

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
        src={gameSrc}
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