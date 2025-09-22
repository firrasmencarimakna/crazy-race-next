"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock, CheckCircle, XCircle, ArrowRight, Flag } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { MiniRacingPreview } from "@/components/mini-racing-preview"

// Mock player progress data
const mockPlayerProgress = [
  {
    id: 1,
    nickname: "SpeedRacer",
    car: "red",
    questionsAnswered: 7,
    correctAnswers: 6,
    currentlyAnswering: true,
    timeRemaining: 45,
    score: 850,
    racingProgress: 75,
  },
  {
    id: 2,
    nickname: "QuizMaster",
    car: "blue",
    questionsAnswered: 8,
    correctAnswers: 8,
    currentlyAnswering: false,
    timeRemaining: 0,
    score: 950,
    racingProgress: 85,
  },
  {
    id: 3,
    nickname: "FastLane",
    car: "green",
    questionsAnswered: 6,
    correctAnswers: 4,
    currentlyAnswering: true,
    timeRemaining: 23,
    score: 650,
    racingProgress: 60,
  },
]

// Mock racing standings
const mockRacingStandings = [
  { id: "2", nickname: "QuizMaster", car: "blue", position: 1, progress: 85 },
  { id: "1", nickname: "SpeedRacer", car: "red", position: 2, progress: 75 },
  { id: "3", nickname: "FastLane", car: "green", position: 3, progress: 60 },
]

export default function HostMonitorPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string
  const [players, setPlayers] = useState(mockPlayerProgress)
  const [currentQuestion, setCurrentQuestion] = useState(8)
  const [totalQuestions] = useState(10)
  const [gamePhase, setGamePhase] = useState<"quiz" | "racing" | "finished">("quiz")
  const [racingStandings] = useState(mockRacingStandings)

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setPlayers((prev) =>
        prev.map((player) => ({
          ...player,
          timeRemaining: player.currentlyAnswering ? Math.max(0, player.timeRemaining - 1) : 0,
        })),
      )

      // Simulate phase changes
      if (currentQuestion >= 10 && gamePhase === "quiz") {
        setGamePhase("racing")
        setTimeout(() => setGamePhase("finished"), 30000) // Racing lasts 30 seconds
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentQuestion, gamePhase])

  const getCarColor = (car: string) => {
    const colors = {
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    }
    return colors[car as keyof typeof colors] || "bg-gray-500"
  }

  const getAccuracy = (correct: number, total: number) => {
    return total > 0 ? Math.round((correct / total) * 100) : 0
  }

  const handleEndGame = () => {
    router.push(`/host/leaderboard/${roomCode}`)
  }

  const getPhaseIcon = () => {
    switch (gamePhase) {
      case "quiz":
        return <CheckCircle className="h-5 w-5" />
      case "racing":
        return <Flag className="h-5 w-5" />
      case "finished":
        return <Trophy className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getPhaseColor = () => {
    switch (gamePhase) {
      case "quiz":
        return "default"
      case "racing":
        return "secondary"
      case "finished":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getPhaseText = () => {
    switch (gamePhase) {
      case "quiz":
        return "Quiz Phase"
      case "racing":
        return "Racing Phase"
      case "finished":
        return "Finished"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Race Monitor</h1>
            <p className="text-muted-foreground">Room: {roomCode}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Question {currentQuestion}/{totalQuestions}
            </Badge>
            <Badge variant={getPhaseColor() as any} className="text-lg px-4 py-2 flex items-center">
              {getPhaseIcon()}
              <span className="ml-2">{getPhaseText()}</span>
            </Badge>
            <Button onClick={handleEndGame} variant="outline">
              <Trophy className="mr-2 h-4 w-4" />
              View Leaderboard
            </Button>
          </div>
        </div>

        {/* Game Progress */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Game Progress</h2>
            <div className="flex items-center space-x-4">
              <Badge variant={getPhaseColor() as any} className="flex items-center">
                {getPhaseIcon()}
                <span className="ml-2">{getPhaseText()}</span>
              </Badge>
            </div>
          </div>
          <Progress value={(currentQuestion / totalQuestions) * 100} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Started</span>
            <span>{Math.round((currentQuestion / totalQuestions) * 100)}% Complete</span>
            <span>Finish Line</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Progress */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6">Player Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players.map((player) => (
                <Card key={player.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-6 ${getCarColor(player.car)} rounded-sm`}></div>
                      <div>
                        <h3 className="font-bold">{player.nickname}</h3>
                        <p className="text-sm text-muted-foreground">{player.car} racer</p>
                      </div>
                    </div>
                    {player.currentlyAnswering ? (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        {player.timeRemaining}s
                      </Badge>
                    ) : (
                      <Badge variant="outline">Waiting</Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Quiz Progress</span>
                        <span>
                          {player.questionsAnswered}/{totalQuestions}
                        </span>
                      </div>
                      <Progress value={(player.questionsAnswered / totalQuestions) * 100} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Correct: {player.correctAnswers}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Wrong: {player.questionsAnswered - player.correctAnswers}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-primary">{player.score}</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-secondary">
                          {getAccuracy(player.correctAnswers, player.questionsAnswered)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Racing Standings */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-6">Live Race Standings</h2>
            <MiniRacingPreview
              players={racingStandings}
              currentPlayer={racingStandings[0]} // Host doesn't have a player
              title="Current Positions"
            />

            {/* Game Controls */}
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-bold mb-4">Host Controls</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Players</span>
                  <Badge variant="outline">
                    <Users className="mr-1 h-3 w-3" />
                    {players.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Game Phase</span>
                  <Badge variant={getPhaseColor() as any} className="flex items-center">
                    {getPhaseIcon()}
                    <span className="ml-1">{getPhaseText()}</span>
                  </Badge>
                </div>
                <Button onClick={handleEndGame} className="w-full">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  End Game
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
