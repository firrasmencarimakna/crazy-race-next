"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Target, Clock, Star, Home, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type PlayerStats = {
  nickname: string
  car: string
  finalScore: number
  correctAnswers: number
  totalQuestions: number
  accuracy: number
  totalTime: string 
  rank: number
  totalPlayers: number
  playerId: string
}

export default function PlayerResultsPage() {
  const params = useParams()
  const roomCode = params.roomCode as string
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [currentPlayerStats, setCurrentPlayerStats] = useState<PlayerStats | null>(null)

  const computePlayerStats = (result: any[], questions: any[]): Omit<PlayerStats, 'nickname' | 'car' | 'rank' | 'totalPlayers' | 'playerId'> => {
    const totalQuestions = questions.length
    let correct = 0
    let totalSeconds = 0

    result.forEach((ans: any) => {
      const question = questions.find((q: any) => q.id === ans.question_id)
      if (question && ans.selected_answer === question.correct_answer) {
        correct++
      }
      totalSeconds += ans.time_taken || 0
    })

    const correctAnswers = correct
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    const totalTime = `${mins}:${secs.toString().padStart(2, '0')}`
    const finalScore = correct * 100 + 50 // Base score + fixed completion bonus

    return { finalScore, correctAnswers, totalQuestions, accuracy, totalTime }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single()

        if (roomError || !roomData) {
          console.error('Error fetching room:', roomError)
          return
        }

        const questions = roomData.questions || [] // Assume array of {id, correct_answer, ...}

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id)
          .eq('completion', true)

        if (playersError || !playersData || playersData.length === 0) {
          console.error('Error fetching players:', playersError)
          return
        }

        const currentPlayerId = localStorage.getItem('currentPlayerId') // Assume set during join
        if (!currentPlayerId) {
          console.error('No current player ID found')
          return
        }

        const currentPlayer = playersData.find((p: any) => p.id === currentPlayerId)
        if (!currentPlayer) {
          console.error('Current player not found')
          return
        }

        // Compute stats for all players
        const allStats = playersData.map((p: any) => ({
          ...computePlayerStats(p.result || [], questions),
          nickname: p.nickname,
          car: p.car,
          playerId: p.id
        }))

        // Sort by finalScore descending for ranking
        const sortedStats = [...allStats].sort((a, b) => b.finalScore - a.finalScore)
        const rank = sortedStats.findIndex((s) => s.playerId === currentPlayerId) + 1

        // Set current player stats
        const stats = computePlayerStats(currentPlayer.result || [], questions)
        setCurrentPlayerStats({
          ...stats,
          nickname: currentPlayer.nickname,
          car: currentPlayer.car,
          rank,
          totalPlayers: playersData.length,
          playerId: currentPlayerId
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (roomCode) {
      fetchData()
    }
  }, [roomCode, supabase])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <Skeleton className="h-96 p-8 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 p-6" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!currentPlayerStats) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Results not available</h1>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { finalScore, correctAnswers, totalQuestions, accuracy, totalTime, rank, totalPlayers, nickname, car } = currentPlayerStats
  const baseScore = correctAnswers * 100
  const timeBonus = finalScore - baseScore

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
          <div className="mb-6">{getRankIcon(rank)}</div>

          <div className="mb-6">
            <div className={`text-6xl font-bold mb-2 ${getRankColor(rank)}`}>
              #{rank}
            </div>
            <div className="text-xl text-muted-foreground">out of {totalPlayers} racers</div>
          </div>

          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`w-12 h-8 ${getCarColor(car)} rounded-lg`}></div>
            <h2 className="text-3xl font-bold">{nickname}</h2>
          </div>

          <div className="text-4xl font-bold text-primary mb-2">{finalScore}</div>
          <div className="text-lg text-muted-foreground">Final Score</div>
        </Card>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-4 text-secondary" />
            <div className="text-3xl font-bold text-secondary mb-2">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-sm text-muted-foreground">Questions Correct</div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">{accuracy}%</div>
            <div className="text-sm text-muted-foreground">Accuracy Rate</div>
          </Card>

          <Card className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
            <div className="text-3xl font-bold text-primary mb-2">{totalTime}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </Card>

          <Card className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-4 text-accent" />
            <div className="text-3xl font-bold text-accent mb-2">
              {rank === 1 ? "Winner!" : rank <= 3 ? "Podium!" : "Good Job!"}
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
              <span className="font-bold">{baseScore} pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Time Bonus</span>
              <span className="font-bold">{timeBonus} pts</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center text-lg font-bold">
              <span>Total Score</span>
              <span className="text-primary">{finalScore} pts</span>
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