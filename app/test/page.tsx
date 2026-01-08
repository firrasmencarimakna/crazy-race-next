"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAdminGuard } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { mysupa } from "@/lib/supabase";
import { generateXID } from "@/lib/id-generator";
import { Play, Trash2, StopCircle, Zap } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog";

const CAR_OPTIONS = ["purple", "white", "black", "aqua", "blue"];

// Combined name list (Indonesian + Foreign, all mixed)
const NAMES = [
    // Indonesian
    "Andi", "Budi", "Cahya", "Dewi", "Eka", "Fajar", "Gita", "Hendra", "Indra", "Joko",
    "Kartika", "Lina", "Maya", "Nia", "Putra", "Rahmat", "Sari", "Tono", "Wati", "Yudi",
    "Zahra", "Agus", "Bayu", "Dian", "Firman", "Galih", "Hesti", "Iwan", "Kevin", "Luna",
    "Mega", "Nova", "Okta", "Prima", "Rio", "Tiara", "Vino", "Wulan", "Yoga", "Zara",
    "Ahmad", "Bambang", "Cinta", "Deni", "Elsa", "Fandi", "Gilang", "Hana", "Irfan", "Jihan",
    "Nur", "Dwi", "Tri", "Sri", "Adi", "Bima", "Candra", "Dewa", "Rama", "Perdana",
    "Pratama", "Wijaya", "Saputra", "Kusuma", "Hidayat", "Santoso", "Nugraha", "Permana",
    "Setiawan", "Wibowo", "Anggraini", "Lestari", "Putri", "Rahayu", "Utami", "Purnama",
    // Foreign
    "John", "James", "Michael", "David", "Chris", "Alex", "Ryan", "Daniel", "Matthew", "Andrew",
    "Emma", "Olivia", "Sophia", "Mia", "Isabella", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail",
    "Tom", "Jack", "Harry", "Oliver", "George", "Noah", "Liam", "Ethan", "Mason", "Lucas",
    "William", "Benjamin", "Henry", "Sebastian", "Alexander", "Emily", "Ava", "Grace", "Chloe", "Lily",
    "Robert", "Joseph", "Thomas", "Charles", "Edward", "Victoria", "Elizabeth", "Margaret", "Catherine", "Alice",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Moore",
    "Taylor", "Anderson", "Jackson", "White", "Harris", "Martin", "Thompson", "Lee", "Walker", "King"
];

// Helper to pick random from array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate random nickname with 1-4 words (pure random, with spaces)
const generateRandomNickname = (): string => {
    const wordCount = Math.floor(Math.random() * 4) + 1; // 1 to 4 words
    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
        words.push(pickRandom(NAMES));
    }
    return words.join(" "); // "John Smith Lee Davis"
};

// Background GIFs like host pages
const backgroundGifs = [
    "/assets/background/host/1.webp",
    "/assets/background/host/3.webp",
    "/assets/background/host/7.webp",
];

interface TestUser {
    id: string;
    nickname: string;
    currentQuestion: number;
    completed: boolean;
}

interface SessionData {
    id: string;
    status: string;
    total_time_minutes: number;
    current_questions: any[];
}

export default function TestPage() {
    const { isAdmin, loading } = useAdminGuard();
    const [roomCode, setRoomCode] = useState("");
    const [userCount, setUserCount] = useState(100);
    const [isRunning, setIsRunning] = useState(false);
    const [session, setSession] = useState<SessionData | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentBgIndex, setCurrentBgIndex] = useState(0);

    const [joinedCount, setJoinedCount] = useState(0);
    const [answeringCount, setAnsweringCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);
    const [showCleanupDialog, setShowCleanupDialog] = useState(false);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    // Answer interval settings (in seconds)
    const [answerIntervalMin, setAnswerIntervalMin] = useState(3);
    const [answerIntervalMax, setAnswerIntervalMax] = useState(10);

    const stopRef = useRef(false);
    const usersRef = useRef<TestUser[]>([]);
    const sessionChannelRef = useRef<any>(null);

    // Background cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBgIndex(prev => (prev + 1) % backgroundGifs.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 199)]);
    }, []);

    // Random delay between min and max milliseconds
    const randomDelayRange = (minMs: number, maxMs: number) =>
        new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

    // Fetch session
    const fetchSession = async (code: string): Promise<SessionData | null> => {
        const { data, error } = await mysupa
            .from("sessions")
            .select("id, status, total_time_minutes, current_questions")
            .eq("game_pin", code)
            .single();

        if (error || !data) {
            addLog(`❌ Session not found: ${code}`);
            return null;
        }
        return data;
    };

    // Subscribe to session changes (detect game end)
    const subscribeToSession = (sessionId: string) => {
        sessionChannelRef.current = mysupa
            .channel(`test-session-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                (payload) => {
                    const newStatus = payload.new?.status;
                    if (newStatus === "finished") {
                        addLog("🛑 Host ended the game!");
                        setGameEnded(true);
                        stopRef.current = true;
                    } else if (newStatus === "active") {
                        addLog("🎮 Game started by host!");
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                () => {
                    addLog("🗑️ Session deleted by host!");
                    setGameEnded(true);
                    stopRef.current = true;
                }
            )
            .subscribe();
    };

    // Phase 1: Join all users CONCURRENTLY with random delays (1-10s each)
    const joinUsersConcurrently = async (sessionId: string) => {
        addLog(`🚀 Joining ${userCount} users concurrently (1-10s delays)...`);

        const joinPromises = Array.from({ length: userCount }, async (_, i) => {
            // Each bot has random delay 1-10 seconds
            await randomDelayRange(1000, 10000);

            if (stopRef.current) return null;

            const userId = generateXID();
            const nickname = generateRandomNickname();

            const { error } = await mysupa
                .from("participants")
                .insert({
                    id: userId,
                    session_id: sessionId,
                    nickname,
                    car: CAR_OPTIONS[Math.floor(Math.random() * CAR_OPTIONS.length)],
                    score: 0,
                    answers: [],
                    current_question: 0,
                    completion: false,
                    racing: false,
                });

            if (error) {
                setErrorCount(prev => prev + 1);
                addLog(`❌ ${nickname} failed: ${error.message || error.code || 'Unknown error'}`);
                return null;
            }

            setJoinedCount(prev => prev + 1);
            addLog(`✅ ${nickname} joined`);
            return { id: userId, nickname, currentQuestion: 0, completed: false } as TestUser;
        });

        const results = await Promise.all(joinPromises);
        const users = results.filter(Boolean) as TestUser[];
        usersRef.current = users;
        addLog(`📊 Total joined: ${users.length} users`);
    };

    // Phase 2: Lobby - CONCURRENT car changes with random delays (1-10s each)
    const lobbyPhaseConcurrent = async () => {
        addLog("🚗 Car selection phase...");

        while (!stopRef.current) {
            const sess = await fetchSession(roomCode);
            // Stop if game active OR countdown started
            if (sess?.status === "active" || sess?.status === "countdown") {
                addLog("⏱️ Game starting! Stopping car changes...");
                break;
            }

            // All users change car CONCURRENTLY with random delays 1-10s
            await Promise.all(
                usersRef.current.map(async (user) => {
                    await randomDelayRange(1000, 10000);
                    if (stopRef.current) return;

                    const newCar = CAR_OPTIONS[Math.floor(Math.random() * CAR_OPTIONS.length)];
                    await mysupa.from("participants").update({ car: newCar }).eq("id", user.id);
                })
            );
        }
    };

    // Phase 3: Each bot answers independently with 3-10 second intervals
    const answerQuestionsIndependently = async (questions: any[]) => {
        const totalQuestions = questions.length;
        const scorePerQuestion = Math.max(1, Math.floor(100 / totalQuestions));

        addLog(`📝 Starting game with ${totalQuestions} questions...`);
        addLog(`🤖 Each bot thinks independently (${answerIntervalMin}-${answerIntervalMax}s per answer)...`);

        // Each bot runs independently
        const botPromises = usersRef.current.map(async (user, botIndex) => {
            for (let qIndex = 0; qIndex < totalQuestions; qIndex++) {
                if (stopRef.current || user.completed) break;

                // Random thinking time based on user settings
                await randomDelayRange(answerIntervalMin * 1000, answerIntervalMax * 1000);
                if (stopRef.current) break;

                const question = questions[qIndex];
                const randomAnswer = Math.floor(Math.random() * 4);
                const isCorrect = Math.random() > 0.5;
                const score = isCorrect ? scorePerQuestion : 0;

                const newAnswer = {
                    id: generateXID(),
                    correct: isCorrect,
                    answer_id: randomAnswer.toString(),
                    question_id: question.id,
                };

                const isLastQuestion = qIndex === totalQuestions - 1;
                const shouldRace = (qIndex + 1) % 3 === 0 && !isLastQuestion;

                try {
                    await mysupa.rpc("submit_quiz_answer_batch", {
                        p_participant_id: user.id,
                        p_new_answers: [newAnswer],
                        p_total_score_add: score,
                        p_total_correct_add: isCorrect ? 1 : 0,
                        p_next_index: qIndex + 1,
                        p_is_finished: isLastQuestion,
                        p_is_racing: shouldRace,
                    });

                    user.currentQuestion = qIndex + 1;
                    addLog(`${user.nickname} → Q${qIndex + 1}`);
                    setAnsweringCount(prev => Math.max(prev, qIndex + 1));

                    // Handle minigame after every 3 questions
                    if (shouldRace) {
                        await randomDelayRange(1000, 3000);
                        await mysupa.from("participants").update({ racing: false }).eq("id", user.id);
                    }

                    if (isLastQuestion) {
                        user.completed = true;
                        setCompletedCount(prev => prev + 1);
                        addLog(`🏁 ${user.nickname} finished!`);
                    }
                } catch (err) {
                    setErrorCount(prev => prev + 1);
                }
            }
        });

        await Promise.all(botPromises);
        addLog(`🎉 All bots completed!`);
    };

    // Main test runner
    const startTest = async () => {
        if (!roomCode.trim()) {
            addLog("❌ Enter room code");
            return;
        }

        setIsRunning(true);
        setGameEnded(false);
        stopRef.current = false;
        setLogs([]);
        setJoinedCount(0);
        setAnsweringCount(0);
        setCompletedCount(0);
        setErrorCount(0);
        usersRef.current = [];

        addLog(`🧪 Starting test: ${roomCode}`);

        const sess = await fetchSession(roomCode);
        if (!sess) {
            setIsRunning(false);
            return;
        }
        setSession(sess);
        subscribeToSession(sess.id);
        addLog(`✅ Session found: ${sess.status}`);

        await joinUsersConcurrently(sess.id);
        if (stopRef.current) { setIsRunning(false); return; }

        if (sess.status === "waiting") {
            await lobbyPhaseConcurrent();
        }
        if (stopRef.current) { setIsRunning(false); return; }

        const updatedSess = await fetchSession(roomCode);
        if (!updatedSess?.current_questions?.length) {
            addLog("❌ No questions found");
            setIsRunning(false);
            return;
        }

        await answerQuestionsIndependently(updatedSess.current_questions);

        setIsRunning(false);
        if (!stopRef.current) addLog("🎉 Test completed successfully!");
    };

    const stopTest = () => {
        stopRef.current = true;
        if (sessionChannelRef.current) {
            mysupa.removeChannel(sessionChannelRef.current);
        }
        addLog("⛔ Test stopped");
    };

    const cleanupUsers = async () => {
        if (!session?.id) return;
        setIsCleaningUp(true);
        addLog("🧹 Cleaning up bots...");

        // Delete all participants created by this test (using stored IDs)
        const userIds = usersRef.current.map(u => u.id);
        if (userIds.length > 0) {
            await mysupa
                .from("participants")
                .delete()
                .in("id", userIds);
        }

        addLog("✅ Cleanup complete");
        usersRef.current = [];
        setJoinedCount(0);
        setCompletedCount(0);
        setIsCleaningUp(false);
        setShowCleanupDialog(false);
    };

    // Block rendering until admin check completes
    if (loading || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#1a0a2a] relative overflow-hidden">
            {/* Background Animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBgIndex}
                    className="absolute inset-0 w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${backgroundGifs[currentBgIndex]})` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />
            </AnimatePresence>

            {/* Scrollable Content Wrapper (Header + Content scroll together) */}
            <div className="absolute inset-0 overflow-y-auto z-10">
                {/* Header */}
                <div className="w-full px-4 py-4 flex items-center justify-between">
                    {/* Left side: Back button + Crazy Race logo */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block">
                            <Image src="/crazyrace-logo.png" alt="Crazy Race" width={270} height={50} style={{ imageRendering: 'auto' }} className="h-auto drop-shadow-xl" />
                        </div>
                    </div>

                    {/* Right side: Gameforsmart logo */}
                    <div className="hidden md:block">
                        <Image
                            src="/gameforsmart-logo.png"
                            alt="Gameforsmart Logo"
                            width={300}
                            height={100}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto p-4 pt-0 space-y-4">
                    {/* Title */}
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="pixel-border-large inline-block pb-2"
                        >
                            <h1 className="text-4xl font-bold text-[#ffefff] pixel-text glow-pink">
                                TEST
                            </h1>
                        </motion.div>
                    </div>

                    {/* Control Panel */}
                    <Card className="bg-[#1a0a2a]/80 border-[#ff6bff]/50 pixel-card backdrop-blur-sm">
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-[#00ffff] pixel-text">Room Code</label>
                                    <Input
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        placeholder="XXXXXX"
                                        className="bg-[#0a0a1a] border-[#ff6bff]/50 text-white pixel-text mt-1"
                                        disabled={isRunning}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[#00ffff] pixel-text">
                                        Bots: <span className="text-[#ff6bff]">{userCount}</span>
                                    </label>
                                    <Slider
                                        value={[userCount]}
                                        onValueChange={([v]) => setUserCount(v)}
                                        min={100}
                                        max={1000}
                                        step={100}
                                        disabled={isRunning}
                                        className="mt-3"
                                    />
                                </div>
                            </div>

                            {/* Answer Interval Settings */}
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="text-sm text-[#00ffff] pixel-text">
                                        Min Interval: <span className="text-[#ff6bff]">{answerIntervalMin}s</span>
                                    </label>
                                    <Slider
                                        value={[answerIntervalMin]}
                                        onValueChange={([v]) => {
                                            setAnswerIntervalMin(v);
                                            if (v > answerIntervalMax) setAnswerIntervalMax(v);
                                        }}
                                        min={1}
                                        max={30}
                                        step={1}
                                        disabled={isRunning}
                                        className="mt-3"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[#00ffff] pixel-text">
                                        Max Interval: <span className="text-[#ff6bff]">{answerIntervalMax}s</span>
                                    </label>
                                    <Slider
                                        value={[answerIntervalMax]}
                                        onValueChange={([v]) => {
                                            setAnswerIntervalMax(v);
                                            if (v < answerIntervalMin) setAnswerIntervalMin(v);
                                        }}
                                        min={1}
                                        max={60}
                                        step={1}
                                        disabled={isRunning}
                                        className="mt-3"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {!isRunning ? (
                                    <Button
                                        onClick={startTest}
                                        className="flex-1 bg-[#00ffff]/20 border-2 border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/40 pixel-button glow-cyan"
                                    >
                                        <Play className="w-4 h-4 mr-2" /> Start
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={stopTest}
                                        className="flex-1 bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/40 pixel-button"
                                    >
                                        <StopCircle className="w-4 h-4 mr-2" /> Stop
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setShowCleanupDialog(true)}
                                    className="bg-[#ff6bff]/20 border-2 border-[#ff6bff] text-[#ff6bff] hover:bg-[#ff6bff]/40 pixel-button glow-pink"
                                    disabled={isRunning || !session}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Cleanup
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-[#1a0a2a]/80 border-[#00ffff]/50 pixel-card">
                            <CardContent className="p-2 text-center">
                                <div className="text-3xl font-bold text-[#00ffff] pixel-text glow-cyan">{joinedCount}</div>
                                <div className="text-xs text-[#00ffff]/70 pixel-text">Joined</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1a0a2a]/80 border-[#ff6bff]/50 pixel-card">
                            <CardContent className="p-2 text-center">
                                <div className="text-3xl font-bold text-[#ff6bff] pixel-text glow-pink">{answeringCount}</div>
                                <div className="text-xs text-[#ff6bff]/70 pixel-text">Question</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1a0a2a]/80 border-green-500/50 pixel-card">
                            <CardContent className="p-2 text-center">
                                <div className="text-3xl font-bold text-green-400 pixel-text">{completedCount}</div>
                                <div className="text-xs text-green-400/70 pixel-text">Completed</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1a0a2a]/80 border-red-500/50 pixel-card">
                            <CardContent className="p-2 text-center">
                                <div className="text-3xl font-bold text-red-400 pixel-text">{errorCount}</div>
                                <div className="text-xs text-red-400/70 pixel-text">Errors</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Logs */}
                    <Card className="bg-[#1a0a2a]/80 border-[#ff6bff]/30 pixel-card gap-3">
                        <CardHeader>
                            <CardTitle className="text-sm text-[#ff6bff] pixel-text">📜 Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 overflow-y-auto bg-black/60 rounded-lg p-3 font-mono text-xs space-y-0.5 border border-[#ff6bff]/20">
                                {logs.length === 0 ? (
                                    <div className="text-gray-500">Waiting for test to start...</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div
                                            key={i}
                                            className={`${log.includes("✓") ? "text-green-400" :
                                                log.includes("✗") ? "text-red-400" :
                                                    log.includes("❌") ? "text-red-400" :
                                                        log.includes("🏁") ? "text-yellow-400" :
                                                            log.includes("🎮") ? "text-purple-400" :
                                                                "text-gray-300"
                                                }`}
                                        >
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Cleanup Confirmation Dialog */}
            <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                <DialogOverlay className="bg-black/70 backdrop-blur-sm fixed inset-0 z-50" />
                <DialogContent className="bg-[#1a0a2a]/95 border-4 border-[#ff6bff] pixel-card max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-[#ff6bff] pixel-text glow-pink text-center">
                            🗑️ Cleanup Bots
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-300 pixel-text text-sm mt-4">
                            Are you sure you want to delete bots from this session?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowCleanupDialog(false)}
                            disabled={isCleaningUp}
                            className="flex-1 pixel-button bg-[#0a0a0f] border-2 border-[#00ffff]/50 text-[#00ffff] hover:bg-[#00ffff]/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={cleanupUsers}
                            disabled={isCleaningUp}
                            className="flex-1 pixel-button bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/40"
                        >
                            {isCleaningUp ? "Cleaning..." : "Delete All"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx>{`
                .pixel-text {
                    image-rendering: pixelated;
                    text-shadow: 2px 2px 0px #000;
                }
                .pixel-card {
                    box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 107, 255, 0.2);
                }
                .pixel-button {
                    image-rendering: pixelated;
                    box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.8);
                    transition: all 0.1s ease;
                }
                .pixel-button:hover:not(:disabled) {
                    transform: translate(2px, 2px);
                    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
                }
                .glow-cyan {
                    filter: drop-shadow(0 0 8px #00ffff);
                }
                .glow-pink {
                    filter: drop-shadow(0 0 8px #ff6bff);
                }
            `}</style>
        </div>
    );
}
