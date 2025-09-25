"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Target, Clock, Star, Home, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

// Mock player results
const mockPlayerResult = {
  nickname: "SpeedRacer",
  car: "red",
  finalScore: 850,
  correctAnswers: 8,
  totalQuestions: 10,
  accuracy: 80,
  totalTime: "3:45",
  rank: 2,
  totalPlayers: 4,
}

export default function PlayerResultsPage() {
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

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500"
      case 2:
        return "text-gray-400"
      case 3:
        return "text-amber-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-12 w-12 text-yellow-500" />
      case 2:
        return <Trophy className="h-12 w-12 text-gray-400" />
      case 3:
        return <Trophy className="h-12 w-12 text-amber-600" />
      default:
        return <Star className="h-12 w-12 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-balance">
            Race <span className="text-primary">Complete!</span>
          </h1>
          <p className="text-xl text-muted-foreground">Your final results for room {roomCode}</p>
        </div>

        {/* Main Result Card */}
        <Card className="p-8 mb-8 text-center">
          <div className="mb-6">{getRankIcon(mockPlayerResult.rank)}</div>

          <div className="mb-6">
            <div className={`text-6xl font-bold mb-2 ${getRankColor(mockPlayerResult.rank)}`}>
              #{mockPlayerResult.rank}
            </div>
            <div className="text-xl text-muted-foreground">out of {mockPlayerResult.totalPlayers} racers</div>
          </div>

          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`w-12 h-8 ${getCarColor(mockPlayerResult.car)} rounded-lg`}></div>
            <h2 className="text-3xl font-bold">{mockPlayerResult.nickname}</h2>
          </div>

          <div className="text-4xl font-bold text-primary mb-2">{mockPlayerResult.finalScore}</div>
          <div className="text-lg text-muted-foreground">Final Score</div>
        </Card>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-4 text-secondary" />
            <div className="text-3xl font-bold text-secondary mb-2">
              {mockPlayerResult.correctAnswers}/{mockPlayerResult.totalQuestions}
            </div>
            <div className="text-sm text-muted-foreground">Questions Correct</div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">{mockPlayerResult.accuracy}%</div>
            <div className="text-sm text-muted-foreground">Accuracy Rate</div>
          </Card>

          <Card className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
            <div className="text-3xl font-bold text-primary mb-2">{mockPlayerResult.totalTime}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </Card>

          <Card className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-4 text-accent" />
            <div className="text-3xl font-bold text-accent mb-2">
              {mockPlayerResult.rank === 1 ? "Winner!" : mockPlayerResult.rank <= 3 ? "Podium!" : "Good Job!"}
            </div>
            <div className="text-sm text-muted-foreground">Achievement</div>
          </Card>
        </div>

        {/* Performance Breakdown */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 text-center">Performance Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Base Score (Correct Answers)</span>
              <span className="font-bold">{mockPlayerResult.correctAnswers * 100} pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Time Bonus</span>
              <span className="font-bold">
                {mockPlayerResult.finalScore - mockPlayerResult.correctAnswers * 100} pts
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center text-lg font-bold">
              <span>Total Score</span>
              <span className="text-primary">{mockPlayerResult.finalScore} pts</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Button>
          </Link>
          <Link href="/join">
            <Button size="lg" className="w-full sm:w-auto bg-secondary hover:bg-secondary/90">
              <RotateCcw className="mr-2 h-5 w-5" />
              Join Another Race
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">Great racing! Challenge your friends to beat your score.</p>
        </div>
      </div>
    </div>
  )
}
