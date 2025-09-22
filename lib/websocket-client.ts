"use client"

export interface WebSocketMessage {
  type: string
  payload: any
  roomCode?: string
  playerId?: string
  timestamp: number
}

export interface GameEvent {
  type:
    | "player_joined"
    | "player_left"
    | "game_started"
    | "question_answered"
    | "race_update"
    | "game_finished"
    | "room_updated"
  data: any
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, ((event: GameEvent) => void)[]> = new Map()
  private roomCode: string | null = null
  private playerId: string | null = null

  constructor() {
    // In a real app, this would connect to your WebSocket server
    // For now, we'll simulate WebSocket behavior
    this.simulateWebSocket()
  }

  private simulateWebSocket() {
    // Simulate WebSocket connection for demo purposes
    console.log("[WebSocket] Simulating WebSocket connection...")

    // Simulate connection events
    setTimeout(() => {
      this.emit("connection", { connected: true })
    }, 1000)
  }

  connect(roomCode: string, playerId: string) {
    this.roomCode = roomCode
    this.playerId = playerId

    // In a real app, this would establish WebSocket connection
    // const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/room/${roomCode}?playerId=${playerId}`
    // this.ws = new WebSocket(wsUrl)

    console.log(`[WebSocket] Connecting to room ${roomCode} as player ${playerId}`)

    // Simulate successful connection
    setTimeout(() => {
      this.emit("connected", { roomCode, playerId })
    }, 500)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.roomCode = null
    this.playerId = null
    console.log("[WebSocket] Disconnected")
  }

  send(message: WebSocketMessage) {
    const messageWithMeta = {
      ...message,
      roomCode: this.roomCode,
      playerId: this.playerId,
      timestamp: Date.now(),
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(messageWithMeta))
    } else {
      // Simulate message sending for demo
      console.log("[WebSocket] Sending message:", messageWithMeta)

      // Simulate responses for different message types
      this.simulateResponse(messageWithMeta)
    }
  }

  private simulateResponse(message: WebSocketMessage) {
    // Simulate server responses for demo purposes
    setTimeout(
      () => {
        switch (message.type) {
          case "join_room":
            this.emit("player_joined", {
              playerId: message.playerId,
              nickname: message.payload.nickname,
              car: message.payload.car,
            })
            break

          case "start_game":
            this.emit("game_started", {
              countdown: 10,
            })
            break

          case "answer_question":
            this.emit("question_answered", {
              playerId: message.playerId,
              questionId: message.payload.questionId,
              answer: message.payload.answer,
              isCorrect: message.payload.isCorrect,
              score: message.payload.score,
            })
            break

          case "race_progress":
            this.emit("race_update", {
              playerId: message.playerId,
              position: message.payload.position,
              progress: message.payload.progress,
            })
            break
        }
      },
      100 + Math.random() * 200,
    ) // Simulate network delay
  }

  on(eventType: string, callback: (event: GameEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(callback)
  }

  off(eventType: string, callback: (event: GameEvent) => void) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const event: GameEvent = { type: eventType as any, data }
      callbacks.forEach((callback) => callback(event))
    }
  }

  // Convenience methods for common game actions
  joinRoom(nickname: string, car: string) {
    this.send({
      type: "join_room",
      payload: { nickname, car },
      timestamp: Date.now(),
    })
  }

  startGame() {
    this.send({
      type: "start_game",
      payload: {},
      timestamp: Date.now(),
    })
  }

  answerQuestion(questionId: number, answer: number, isCorrect: boolean, score: number) {
    this.send({
      type: "answer_question",
      payload: { questionId, answer, isCorrect, score },
      timestamp: Date.now(),
    })
  }

  updateRaceProgress(position: number, progress: number) {
    this.send({
      type: "race_progress",
      payload: { position, progress },
      timestamp: Date.now(),
    })
  }

  finishGame(finalScore: number, finalPosition: number) {
    this.send({
      type: "finish_game",
      payload: { finalScore, finalPosition },
      timestamp: Date.now(),
    })
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}
