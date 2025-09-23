"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Medal, Award, Home, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

// Mock final results
const mockResults = [
  {
    id: 2,
    nickname: "QuizMaster",
    car: "blue",
    score: 950,
    correctAnswers: 9,
    totalQuestions: 10,
    accuracy: 90,
    raceTime: "2:34",
  },
  {
    id: 1,
    nickname: "SpeedRacer",
    car: "red",
    score: 820,
    correctAnswers: 8,
    totalQuestions: 10,
    accuracy: 80,
    raceTime: "2:45",
  },
  {
    id: 3,
    nickname: "FastLane",
    car: "green",
    score: 750,
    correctAnswers: 7,
    totalQuestions: 10,
    accuracy: 70,
    raceTime: "3:12",
  },
  {
    id: 4,
    nickname: "RoadRunner",
    car: "yellow",
    score: 680,
    correctAnswers: 6,
    totalQuestions: 10,
    accuracy: 60,
    raceTime: "3:28",
  },
  {
    id: 5,
    nickname: "Turbo",
    car: "purple",
    score: 620,
    correctAnswers: 6,
    totalQuestions: 10,
    accuracy: 60,
    raceTime: "3:45",
  },
]

export default function HostLeaderboardPage() {
  const params = useParams()
  const roomCode = params.roomCode as string

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

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-8 w-8 text-yellow-500" />
      case 2:
        return <Medal className="h-8 w-8 text-gray-400" />
      case 3:
        return <Award className="h-8 w-8 text-amber-600" />
      default:
        return null
    }
  }

  const topThree = mockResults.slice(0, 3)
  const others = mockResults.slice(3)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-balance">
            <span className="text-primary">Race</span> Complete!
          </h1>
          <p className="text-xl text-muted-foreground">Final results for room {roomCode}</p>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {topThree.map((player, index) => (
            <Card
              key={player.id}
              className={`p-6 text-center ${
                index === 0
                  ? "md:order-2 bg-primary/10 border-primary/30 scale-105"
                  : index === 1
                    ? "md:order-1 bg-secondary/10 border-secondary/30"
                    : "md:order-3 bg-accent/10 border-accent/30"
              }`}
            >
              <div className="mb-4">{getPodiumIcon(index + 1)}</div>
              <div className="text-3xl font-bold mb-2">#{index + 1}</div>
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className={`w-6 h-4 ${getCarColor(player.car)} rounded-sm`}></div>
                <h3 className="text-xl font-bold">{player.nickname}</h3>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">{player.score}</div>
                <div className="text-sm text-muted-foreground">points</div>
                <div className="flex justify-between text-sm">
                  <span>Accuracy:</span>
                  <span className="font-semibold">{player.accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Time:</span>
                  <span className="font-semibold">{player.raceTime}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Other Players */}
        {others.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Other Racers</h2>
            <div className="space-y-4">
              {others.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-muted-foreground">#{index + 4}</div>
                    <div className={`w-6 h-4 ${getCarColor(player.car)} rounded-sm`}></div>
                    <div>
                      <h4 className="font-bold">{player.nickname}</h4>
                      <p className="text-sm text-muted-foreground">{player.car} racer</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg">{player.score}</div>
                      <div className="text-muted-foreground">points</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{player.accuracy}%</div>
                      <div className="text-muted-foreground">accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{player.raceTime}</div>
                      <div className="text-muted-foreground">time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </Link>
          <Link href="/host">
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              <RotateCcw className="mr-2 h-5 w-5" />
              Host New Race
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">Thanks for hosting! Share your room code with friends to race again.</p>
        </div>
      </div>
    </div>
  )
}
