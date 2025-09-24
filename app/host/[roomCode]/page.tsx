"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrCode, Copy, Users, Play, Settings, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { ConnectionStatus } from "@/components/connection-status"

// Mock player data - in real app this would come from real-time database
const mockPlayers = [
  { id: 1, nickname: "SpeedRacer", car: "red", joinedAt: new Date() },
  { id: 2, nickname: "QuizMaster", car: "blue", joinedAt: new Date() },
  { id: 3, nickname: "FastLane", car: "green", joinedAt: new Date() },
]

export default function HostRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  const { isConnected, players, startGame: startMultiplayerGame } = useMultiplayer(roomCode, "host")

  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    // In real app, show toast notification
    console.log("Room code copied!")
  }

  const startGame = () => {
    if (players.length === 0) return

    setGameStarted(true)
    setCountdown(10)

    startMultiplayerGame()

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Navigate to monitor page
          router.push(`/host/monitor/${roomCode}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

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

  if (countdown > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-bold text-primary mb-4 race-pulse">{countdown}</div>
          <h2 className="text-3xl font-bold mb-2">Game Starting...</h2>
          <p className="text-xl text-muted-foreground">Get ready to race!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-primary">Racing Room</h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Room: {roomCode}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Room Info & QR Code */}
          <Card className="p-8">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold">Share Room Code</h2>

              <div className="relative p-6 bg-primary/10 rounded-lg border border-primary/20">
  <div className="text-4xl font-bold text-primary">{roomCode}</div>

  <Button
    onClick={copyRoomCode}
    variant="outline"
    className="absolute top-3 right-3 bg-transparent"
  >
    <Copy className="h-4 w-4" />
  </Button>
</div>


              <div className="p-6 bg-muted rounded-lg">
                <QrCode className="h-32 w-32 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Players can scan this QR code to join quickly</p>
              </div>

              <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Settings className="mr-1 h-4 w-4" />
                  General Knowledge
                </div>
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  10 Questions
                </div>
              </div>
            </div>
          </Card>

          {/* Players List */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Players in Room</h2>
              <Badge variant="outline" className="text-lg">
                {players.length} joined
              </Badge>
            </div>

            <div className="space-y-4 mb-8">
              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for players to join...</p>
                  <p className="text-sm">Share the room code above</p>
                </div>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="flex items-center space-x-4 p-4 bg-card/50 rounded-lg">
                    <div className={`w-8 h-6 ${getCarColor(player.car)} rounded-sm`}></div>
                    <div className="flex-1">
                      <div className="font-semibold">{player.nickname}</div>
                      <div className="text-sm text-muted-foreground">Joined {player.joinedAt.toLocaleTimeString()}</div>
                    </div>
                    <Badge variant="secondary">{player.car} car</Badge>
                  </div>
                ))
              )}
            </div>

            <Button
              onClick={startGame}
              disabled={players.length === 0 || gameStarted}
              className="w-full text-xl py-6 bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            >
              <Play className="mr-2 h-6 w-6" />
              {players.length === 0 ? "Waiting for Players" : "Start Race!"}
            </Button>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Players will automatically join when they enter the room code. Start the race when everyone is ready!
          </p>
        </div>
      </div>
    </div>
  )
}
