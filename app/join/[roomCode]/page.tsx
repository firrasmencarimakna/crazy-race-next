"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Trophy, Car, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { ConnectionStatus } from "@/components/connection-status"

// Mock lobby data - in real app this would come from real-time database
const mockLobbyData = {
  roomCode: "ABC123",
  quiz: "General Knowledge",
  questionCount: 10,
  duration: 60,
  host: "GameMaster",
  players: [
    { id: "player-1", nickname: "SpeedRacer", car: "red", isReady: true },
    { id: "player-2", nickname: "QuizMaster", car: "blue", isReady: true },
    { id: "player-3", nickname: "FastLane", car: "green", isReady: false },
    { id: "player-4", nickname: "RoadRunner", car: "yellow", isReady: true },
  ],
}

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // Mock current player data - would come from session/auth
  const currentPlayer = { id: "player-1", nickname: "SpeedRacer", car: "red" }

  const { isConnected, players, gamePhase, joinRoom, startGame } = useMultiplayer(roomCode, currentPlayer.id)

  const [countdown, setCountdown] = useState(0)
  const [gameStarting, setGameStarting] = useState(false)

  useEffect(() => {
    if (roomCode && currentPlayer.id) {
      joinRoom(currentPlayer.nickname, currentPlayer.car)
    }
  }, [roomCode, currentPlayer.id, currentPlayer.nickname, currentPlayer.car, joinRoom])

  useEffect(() => {
    if (gamePhase === "quiz" && !gameStarting) {
      setGameStarting(true)
      setCountdown(10)
    }
  }, [gamePhase, gameStarting])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            // Navigate to quiz game
            router.push(`/play/quiz/${roomCode}`)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [countdown, router, roomCode])

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

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} />
        <div className="text-center">
          <div className="text-8xl font-bold text-primary mb-4 race-pulse">{countdown}</div>
          <h2 className="text-3xl font-bold mb-2">Race Starting!</h2>
          <p className="text-xl text-muted-foreground">Get ready to answer questions...</p>
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
      <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/join">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-secondary">Racing Lobby</h1>
            <p className="text-muted-foreground">Room: {roomCode}</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {players.length} Players
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Info */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-primary" />
              Race Details
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-primary mb-1">Quiz Category</h3>
                <p className="text-foreground">{mockLobbyData.quiz}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-card/50 rounded-lg">
                  <div className="text-2xl font-bold text-secondary">{mockLobbyData.questionCount}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="text-center p-3 bg-card/50 rounded-lg">
                  <div className="text-2xl font-bold text-accent">{mockLobbyData.duration}s</div>
                  <div className="text-sm text-muted-foreground">Per Question</div>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Hosted by</div>
                <div className="font-semibold">{mockLobbyData.host}</div>
              </div>
            </div>
          </Card>

          {/* Players List */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Users className="mr-2 h-5 w-5 text-secondary" />
                Racers in Lobby
              </h2>
              <Badge variant="outline">
                {players.filter((p) => p.isReady).length}/{players.length} Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    player.id === currentPlayer.id ? "border-primary bg-primary/10" : "border-border bg-card/50"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div
                        className={`w-12 h-8 ${getCarColor(player.car)} rounded-lg flex items-center justify-center`}
                      >
                        <Car className="h-6 w-6 text-white" />
                      </div>
                      {player.isReady && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold">{player.nickname}</h3>
                        {player.id === currentPlayer.id && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">{player.car} racer</div>
                    </div>

                    <div className="text-right">
                      {player.isReady ? (
                        <Badge variant="default" className="bg-green-500">
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline">Waiting</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {gameStarting ? (
              <div className="mt-8 text-center">
                <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
                  <h3 className="text-xl font-bold text-primary mb-2">Game Starting Soon!</h3>
                  <p className="text-muted-foreground">The host has started the race. Get ready!</p>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center">
                <div className="p-6 bg-muted/50 rounded-lg">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-bold mb-2">Waiting for Host</h3>
                  <p className="text-muted-foreground">The race will begin when the host starts the game</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Your Car Preview */}
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-bold mb-4 text-center">Your Racing Car</h2>
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center">
              <div
                className={`w-20 h-12 ${getCarColor(currentPlayer.car)} rounded-lg flex items-center justify-center mb-2 mx-auto`}
              >
                <Car className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl mb-2">{getCarEmoji(currentPlayer.car)}</div>
              <h3 className="font-bold text-lg">{currentPlayer.nickname}</h3>
              <p className="text-muted-foreground capitalize">{currentPlayer.car} Racer</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function getCarColor(car: string) {
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

function getCarEmoji(car: string) {
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
