"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Zap, Flag } from "lucide-react"

interface RacingPlayer {
  id: string
  nickname: string
  car: string
  position: number
  speed: number
  lapProgress: number
  score: number
}

interface RacingGameProps {
  players: RacingPlayer[]
  currentPlayer: RacingPlayer
  onRaceComplete: (finalPositions: RacingPlayer[]) => void
  duration?: number // Race duration in seconds
}

export function RacingGame({ players, currentPlayer, onRaceComplete, duration = 30 }: RacingGameProps) {
  const [raceStarted, setRaceStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [raceProgress, setRaceProgress] = useState<RacingPlayer[]>(players)
  const [raceFinished, setRaceFinished] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

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

  const getCarEmoji = (car: string) => {
    const emojis = {
      red: "🏎️",
      blue: "🚗",
      green: "🚙",
      yellow: "🚕",
      purple: "🚐",
      orange: "🚛",
    }
    return emojis[car as keyof typeof emojis] || "🚗"
  }

  // Start countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (!raceStarted) {
      setRaceStarted(true)
    }
  }, [countdown, raceStarted])

  // Race simulation
  useEffect(() => {
    if (raceStarted && !raceFinished) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setRaceFinished(true)
            return 0
          }
          return prev - 1
        })

        setRaceProgress((prevPlayers) => {
          const updatedPlayers = prevPlayers.map((player) => {
            // Simulate racing progress based on quiz performance
            const baseSpeed = 1 + (player.score / 1000) * 2 // Higher score = faster speed
            const randomFactor = 0.5 + Math.random() * 1 // Add some randomness
            const speedMultiplier = player.id === currentPlayer.id ? 1.2 : 1 // Slight boost for current player

            const newProgress = Math.min(100, player.lapProgress + baseSpeed * randomFactor * speedMultiplier)

            return {
              ...player,
              lapProgress: newProgress,
              speed: baseSpeed * randomFactor * speedMultiplier,
            }
          })

          // Sort by lap progress (descending) and update positions
          const sortedPlayers = updatedPlayers
            .sort((a, b) => b.lapProgress - a.lapProgress)
            .map((player, index) => ({
              ...player,
              position: index + 1,
            }))

          return sortedPlayers
        })
      }, 100) // Update every 100ms for smooth animation

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [raceStarted, raceFinished, currentPlayer.id])

  // Handle race completion
  useEffect(() => {
    if (raceFinished) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      setTimeout(() => {
        onRaceComplete(raceProgress)
      }, 3000) // Show results for 3 seconds before transitioning
    }
  }, [raceFinished, raceProgress, onRaceComplete])

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-bold text-primary mb-4 race-pulse">{countdown}</div>
          <h2 className="text-3xl font-bold mb-2">Get Ready to Race!</h2>
          <p className="text-xl text-muted-foreground">Engines starting...</p>

          <div className="mt-8 flex justify-center space-x-4">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <div className={`w-12 h-8 ${getCarColor(player.car)} rounded-lg mb-2 mx-auto animate-bounce`}></div>
                <div className="text-sm font-medium">{player.nickname}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Race Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary flex items-center">
              <Flag className="mr-3 h-8 w-8" />
              Racing Time!
            </h1>
            <p className="text-muted-foreground">Based on your quiz performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Zap className="mr-1 h-4 w-4" />
              {timeRemaining}s
            </Badge>
            {raceFinished && (
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-500">
                Race Complete!
              </Badge>
            )}
          </div>
        </div>

        {/* Race Track */}
        <Card className="p-8 mb-8">
          <div className="space-y-6">
            {raceProgress.map((player, index) => (
              <div key={player.id} className="relative">
                {/* Track */}
                <div className="h-16 bg-muted rounded-lg border-2 border-border relative overflow-hidden">
                  {/* Track lines */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-1 border-t-2 border-dashed border-muted-foreground/30"></div>
                  </div>

                  {/* Finish line */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-white via-black to-white"></div>

                  {/* Car */}
                  <div
                    className={`absolute top-2 bottom-2 w-12 ${getCarColor(player.car)} rounded-lg flex items-center justify-center transition-all duration-100 ease-linear ${
                      player.id === currentPlayer.id ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                    style={{
                      left: `${Math.min(player.lapProgress, 95)}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="text-white text-xl">{getCarEmoji(player.car)}</div>
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={player.position <= 3 ? "default" : "outline"}
                      className="w-8 h-8 rounded-full p-0 flex items-center justify-center"
                    >
                      {player.position}
                    </Badge>
                    <div>
                      <div className="font-bold flex items-center space-x-2">
                        <span>{player.nickname}</span>
                        {player.id === currentPlayer.id && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Speed: {player.speed.toFixed(1)}x</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{player.lapProgress.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Progress</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Current Player Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">#{currentPlayer.position}</div>
            <div className="text-sm text-muted-foreground">Your Position</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary">{currentPlayer.lapProgress.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{currentPlayer.speed.toFixed(1)}x</div>
            <div className="text-sm text-muted-foreground">Speed</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{currentPlayer.score}</div>
            <div className="text-sm text-muted-foreground">Quiz Score</div>
          </Card>
        </div>

        {/* Race Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Race Progress</h3>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">
                Leader: {raceProgress[0]?.nickname} ({raceProgress[0]?.lapProgress.toFixed(1)}%)
              </span>
            </div>
          </div>
          <Progress value={Math.max(...raceProgress.map((p) => p.lapProgress))} className="h-4" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Start</span>
            <span>{Math.round(((duration - timeRemaining) / duration) * 100)}% Complete</span>
            <span>Finish</span>
          </div>
        </Card>

        {raceFinished && (
          <Card className="p-6 mt-8 text-center bg-primary/10 border-primary/20">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Race Complete!</h2>
            <p className="text-muted-foreground mb-4">Final results coming up...</p>
            <div className="flex justify-center space-x-6">
              {raceProgress.slice(0, 3).map((player, index) => (
                <div key={player.id} className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-600"
                    }`}
                  >
                    #{player.position}
                  </div>
                  <div className="font-medium">{player.nickname}</div>
                  <div className="text-sm text-muted-foreground">{player.lapProgress.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
