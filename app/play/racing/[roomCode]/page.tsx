"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { RacingGame } from "@/components/racing-game"
import { GameStateManager } from "@/lib/game-state"

// Mock racing data - in real app this would come from real-time database
const mockRacingPlayers = [
  { id: "player-1", nickname: "SpeedRacer", car: "red", position: 1, speed: 2.5, lapProgress: 0, score: 850 },
  { id: "player-2", nickname: "QuizMaster", car: "blue", position: 2, speed: 2.8, lapProgress: 0, score: 950 },
  { id: "player-3", nickname: "FastLane", car: "green", position: 3, speed: 2.2, lapProgress: 0, score: 750 },
  { id: "player-4", nickname: "RoadRunner", car: "yellow", position: 4, speed: 2.0, lapProgress: 0, score: 680 },
]

export default function RacingGamePage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // Mock current player - in real app this would come from session/auth
  const currentPlayerId = "player-1"
  const currentPlayer = mockRacingPlayers.find((p) => p.id === currentPlayerId) || mockRacingPlayers[0]

  const [players] = useState(mockRacingPlayers)
  const gameManager = GameStateManager.getInstance()

  const handleRaceComplete = (finalPositions: any[]) => {
    console.log("Race completed with positions:", finalPositions)

    // Update game state
    const room = gameManager.getRoom(roomCode)
    if (room) {
      // Check if there are more questions to answer
      if (room.questionCount > 10) {
        // Continue with more quiz questions
        router.push(`/play/quiz/${roomCode}`)
      } else {
        // Go to final results
        router.push(`/play/results/${roomCode}`)
      }
    } else {
      // Fallback to results
      router.push(`/play/results/${roomCode}`)
    }
  }

  return (
    <RacingGame players={players} currentPlayer={currentPlayer} onRaceComplete={handleRaceComplete} duration={30} />
  )
}
