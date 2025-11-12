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
  const sessionRef = useRef<any>(null);
  const isSavingRef = useRef(false); // Flag to prevent double save

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const pid = localStorage.getItem("participantId") || "";
    if (!pid) {
      router.replace(`/`);
      return;
    }
    setParticipantId(pid);
  }, []);

  // Fetch data
  const fetchMiniGameData = useCallback(async (retryCount = 0) => {
    if (!roomCode || !participantId) return;
    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching mini game data (attempt ${retryCount + 1})`);
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, started_at, total_time_minutes, difficulty, responses, current_questions, participants")
        .eq("game_pin", roomCode)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(`Session error: ${sessionError?.message || 'No data'}`);
      }

      setSession(sessionData);
      console.log('Session in mini:', sessionData); // Log full

      const startTime = sessionData.started_at ? new Date(sessionData.started_at).getTime() : null;
      if (!startTime) throw new Error('Game start time missing');

      setGameStartTime(startTime);
      const duration = sessionData.total_time_minutes * 60;
      setGameDuration(duration);

      // Set src
      if (sessionData.difficulty) {
        let src = '/racing-game/v4.final.html';
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

      // Parse questions for totalQ
      let parsedQuestions = [];
      try {
        parsedQuestions = typeof sessionData.current_questions === 'string' ? JSON.parse(sessionData.current_questions) : sessionData.current_questions || [];
        console.log('Parsed questions in mini:', parsedQuestions.length);
      } catch (e) {
        console.error('Parse questions error in mini:', e);
      }
      const totalQ = parsedQuestions.length || 10;
      console.log('TotalQ in mini:', totalQ);

      // Parse responses
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
          total_question: totalQ,
          current_question: 0,
        };
      } else {
        // Ensure total_question set
        if (myResponse.total_question === undefined || myResponse.total_question === 0) myResponse.total_question = totalQ;
      }

      const savedAnswers = myResponse.answers.map((a: any) => parseInt(a.answer_id)) || [];
      const savedCorrect = myResponse.correct || 0;
      const savedCurrent = myResponse.current_question || 0;

      setAnswers(savedAnswers);
      setCorrectAnswers(savedCorrect);
      setTotalQuestions(myResponse.total_question || totalQ);
      setCurrentQuestionIndex(savedCurrent - 1);

      setLoading(false);
      console.log('Mini game data loaded, totalQ:', myResponse.total_question);
    } catch (err: any) {
      console.error("Error fetching mini game data:", err);
      setError(err.message);
      if (retryCount < 3) setTimeout(() => fetchMiniGameData(retryCount + 1), 1000 * (retryCount + 1));
      else router.replace(`/join/${roomCode}/game`);
      setLoading(false);
    }
  }, [roomCode, participantId, router]);

  useEffect(() => {
    if (roomCode && participantId) fetchMiniGameData();
  }, [roomCode, participantId, fetchMiniGameData]);

  // Save progress
  const saveAndRedirectToResult = useCallback(async () => {
    if (isSavingRef.current) return; // Prevent double
    isSavingRef.current = true;

    if (!gameStartTime || !participantId || !session || !session.id) {
      console.error('Missing session.id for save');
      isSavingRef.current = false;
      return;
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - gameStartTime) / 1000);
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0.00";

    // Parse responses
    let currentResponses = [];
    try {
      currentResponses = typeof session.responses === 'string' ? JSON.parse(session.responses) : session.responses || [];
    } catch (e) {
      console.error("Error parsing responses:", e);
      isSavingRef.current = false;
      return;
    }

    // Parse questions for totalQ
    let parsedQuestions = [];
    try {
      parsedQuestions = typeof session.current_questions === 'string' ? JSON.parse(session.current_questions) : session.current_questions || [];
    } catch (e) {
      console.error('Parse questions error in save:', e);
    }
    const totalQ = parsedQuestions.length || totalQuestions || 10;
    console.log('Save totalQ:', totalQ);

    // Update myResponse
    let myResponse = currentResponses.find((r: any) => r.participant === participantId);
    if (myResponse) {
      myResponse.score = correctAnswers * 10;
      myResponse.correct = correctAnswers;
      myResponse.accuracy = accuracy;
      myResponse.duration = elapsedSeconds;
      myResponse.current_question = currentQuestionIndex;
      myResponse.total_question = totalQ;
      myResponse.racing = false;
      myResponse.completion = true;
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

    isSavingRef.current = false;
    router.push(`/join/${roomCode}/result`);
  }, [gameStartTime, participantId, session, correctAnswers, totalQuestions, roomCode, router]);

  // Timer
  useEffect(() => {
    if (loading || gameDuration === 0 || !gameStartTime) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - gameStartTime) / 1000);
      const remaining = gameDuration - elapsed;
      setTotalTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0 && !isSavingRef.current) {
        saveAndRedirectToResult();
      }
    };

    updateRemaining();
    timerIntervalRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameStartTime, loading, gameDuration, saveAndRedirectToResult]);

  // Sub
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

          if (newStatus === 'finished' && !isSavingRef.current) {
            await saveAndRedirectToResult();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel)
    };
  }, [roomCode, participantId, saveAndRedirectToResult]);

  iframeRef.current?.contentWindow?.focus();

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

    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [participantId]);

  // Iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) console.log('Game loaded');
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = "/racing-game/images/sprites.png";
  }, []);

  if (loading) return <LoadingRetro />;
  if (error) return <div className="w-full h-screen flex justify-center items-center text-red-500">Error: {error}</div>;

  const getTimeColor = () => {
    if (totalTimeRemaining <= 30) return "text-red-500 animate-pulse";
    if (totalTimeRemaining <= 60) return "text-[#ff6bff] glow-pink-subtle";
    return "text-[#00ffff] glow-cyan";
  };

  return (
    <div className="w-full h-screen relative flex justify-center items-center overflow-hidden">
      {totalTimeRemaining > 0 && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-lg ${getTimeColor()}`}>
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