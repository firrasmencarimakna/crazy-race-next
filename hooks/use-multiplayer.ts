"use client"

import { useState, useEffect, useCallback } from "react"
import { getWebSocketClient, type GameEvent } from "@/lib/websocket-client"

export interface MultiplayerState {
  isConnected: boolean
  roomCode: string | null
  players: any[]
  gamePhase: "lobby" | "quiz" | "racing" | "finished"
  currentQuestion: number
  isHost: boolean
}

export function useMultiplayer(roomCode?: string, playerId?: string) {
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    roomCode: null,
    players: [],
    gamePhase: "lobby",
    currentQuestion: 0,
    isHost: false,
  })

  const wsClient = getWebSocketClient()

  const updateState = useCallback((updates: Partial<MultiplayerState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleGameEvent = useCallback(
    (event: GameEvent) => {
      console.log("[Multiplayer] Received event:", event)

      switch (event.type) {
        case "player_joined":
          updateState({
            players: [...state.players, event.data],
          })
          break

        case "player_left":
          updateState({
            players: state.players.filter((p) => p.id !== event.data.playerId),
          })
          break

        case "game_started":
          updateState({
            gamePhase: "quiz",
            currentQuestion: 1,
          })
          break

        case "question_answered":
          // Update player scores and progress
          updateState({
            players: state.players.map((p) =>
              p.id === event.data.playerId
                ? { ...p, score: event.data.score, questionsAnswered: p.questionsAnswered + 1 }
                : p,
            ),
          })
          break

        case "race_update":
          // Update racing positions
          updateState({
            players: state.players.map((p) =>
              p.id === event.data.playerId ? { ...p, position: event.data.position, progress: event.data.progress } : p,
            ),
          })
          break

        case "game_finished":
          updateState({
            gamePhase: "finished",
          })
          break

        case "room_updated":
          updateState({
            ...event.data,
          })
          break
      }
    },
    [state.players, updateState],
  )

  useEffect(() => {
    if (roomCode && playerId) {
      wsClient.connect(roomCode, playerId)
      updateState({ roomCode, isConnected: true })

      // Set up event listeners
      wsClient.on("player_joined", handleGameEvent)
      wsClient.on("player_left", handleGameEvent)
      wsClient.on("game_started", handleGameEvent)
      wsClient.on("question_answered", handleGameEvent)
      wsClient.on("race_update", handleGameEvent)
      wsClient.on("game_finished", handleGameEvent)
      wsClient.on("room_updated", handleGameEvent)

      return () => {
        // Clean up event listeners
        wsClient.off("player_joined", handleGameEvent)
        wsClient.off("player_left", handleGameEvent)
        wsClient.off("game_started", handleGameEvent)
        wsClient.off("question_answered", handleGameEvent)
        wsClient.off("race_update", handleGameEvent)
        wsClient.off("game_finished", handleGameEvent)
        wsClient.off("room_updated", handleGameEvent)

        wsClient.disconnect()
      }
    }
  }, [roomCode, playerId, handleGameEvent])

  const joinRoom = useCallback((nickname: string, car: string) => {
    wsClient.joinRoom(nickname, car)
  }, [])

  const startGame = useCallback(() => {
    wsClient.startGame()
  }, [])

  const answerQuestion = useCallback((questionId: number, answer: number, isCorrect: boolean, score: number) => {
    wsClient.answerQuestion(questionId, answer, isCorrect, score)
  }, [])

  const updateRaceProgress = useCallback((position: number, progress: number) => {
    wsClient.updateRaceProgress(position, progress)
  }, [])

  const finishGame = useCallback((finalScore: number, finalPosition: number) => {
    wsClient.finishGame(finalScore, finalPosition)
  }, [])

  return {
    ...state,
    joinRoom,
    startGame,
    answerQuestion,
    updateRaceProgress,
    finishGame,
  }
}
