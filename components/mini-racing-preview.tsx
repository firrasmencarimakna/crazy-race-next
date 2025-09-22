"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Zap } from "lucide-react"

interface MiniRacingPlayer {
  id: string
  nickname: string
  car: string
  position: number
  progress: number
}

interface MiniRacingPreviewProps {
  players: MiniRacingPlayer[]
  currentPlayer: MiniRacingPlayer
  title?: string
}

export function MiniRacingPreview({
  players,
  currentPlayer,
  title = "Current Race Standings",
}: MiniRacingPreviewProps) {
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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-primary" />
          {title}
        </h3>
        <Badge variant="outline" className="flex items-center">
          <Zap className="mr-1 h-3 w-3" />
          Live
        </Badge>
      </div>

      <div className="space-y-3">
        {players.slice(0, 5).map((player) => (
          <div key={player.id} className="flex items-center space-x-3">
            <Badge
              variant={player.position <= 3 ? "default" : "outline"}
              className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {player.position}
            </Badge>

            <div className={`w-6 h-4 ${getCarColor(player.car)} rounded-sm flex items-center justify-center`}>
              <span className="text-xs">{getCarEmoji(player.car)}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium truncate">{player.nickname}</span>
                {player.id === currentPlayer.id && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full ${getCarColor(player.car)}`}
                  style={{ width: `${Math.min(player.progress, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="text-right text-sm">
              <div className="font-medium">{player.progress.toFixed(0)}%</div>
            </div>
          </div>
        ))}

        {players.length > 5 && (
          <div className="text-center text-sm text-muted-foreground pt-2 border-t">
            +{players.length - 5} more racers
          </div>
        )}
      </div>
    </Card>
  )
}
