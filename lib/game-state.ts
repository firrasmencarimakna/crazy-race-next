export interface PlayerState {
  id: string
  nickname: string
  car: string
  score: number
  correctAnswers: number
  currentQuestionIndex: number
  isReady: boolean
  hasFinished: boolean
  joinedAt: Date
}

export interface GameRoom {
  roomCode: string
  hostId: string
  quiz: string
  questionCount: number
  duration: number
  players: PlayerState[]
  currentPhase: "lobby" | "quiz" | "racing" | "finished"
  startedAt?: Date
  finishedAt?: Date
}

export interface QuizSession {
  roomCode: string
  playerId: string
  questions: any[]
  currentQuestionIndex: number
  answers: (number | null)[]
  score: number
  correctAnswers: number
  startTime: Date
  timeRemaining: number
}

// Mock game state management - in real app this would use Supabase real-time
export class GameStateManager {
  private static instance: GameStateManager
  private rooms: Map<string, GameRoom> = new Map()
  private sessions: Map<string, QuizSession> = new Map()

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager()
    }
    return GameStateManager.instance
  }

  createRoom(roomCode: string, hostId: string, quiz: string, questionCount: number, duration: number): GameRoom {
    const room: GameRoom = {
      roomCode,
      hostId,
      quiz,
      questionCount,
      duration,
      players: [],
      currentPhase: "lobby",
    }

    this.rooms.set(roomCode, room)
    return room
  }

  joinRoom(
    roomCode: string,
    player: Omit<PlayerState, "score" | "correctAnswers" | "currentQuestionIndex" | "hasFinished" | "joinedAt">,
  ): boolean {
    const room = this.rooms.get(roomCode)
    if (!room || room.currentPhase !== "lobby") {
      return false
    }

    const newPlayer: PlayerState = {
      ...player,
      score: 0,
      correctAnswers: 0,
      currentQuestionIndex: 0,
      hasFinished: false,
      joinedAt: new Date(),
    }

    room.players.push(newPlayer)
    this.rooms.set(roomCode, room)
    return true
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode)
  }

  startGame(roomCode: string): boolean {
    const room = this.rooms.get(roomCode)
    if (!room || room.currentPhase !== "lobby") {
      return false
    }

    room.currentPhase = "quiz"
    room.startedAt = new Date()
    this.rooms.set(roomCode, room)
    return true
  }

  createQuizSession(roomCode: string, playerId: string, questions: any[]): QuizSession {
    const sessionKey = `${roomCode}-${playerId}`
    const session: QuizSession = {
      roomCode,
      playerId,
      questions,
      currentQuestionIndex: 0,
      answers: new Array(questions.length).fill(null),
      score: 0,
      correctAnswers: 0,
      startTime: new Date(),
      timeRemaining: questions[0]?.timeLimit || 60,
    }

    this.sessions.set(sessionKey, session)
    return session
  }

  getQuizSession(roomCode: string, playerId: string): QuizSession | undefined {
    const sessionKey = `${roomCode}-${playerId}`
    return this.sessions.get(sessionKey)
  }

  updateQuizSession(roomCode: string, playerId: string, updates: Partial<QuizSession>): void {
    const sessionKey = `${roomCode}-${playerId}`
    const session = this.sessions.get(sessionKey)
    if (session) {
      Object.assign(session, updates)
      this.sessions.set(sessionKey, session)
    }
  }

  finishQuiz(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode)
    if (room) {
      const player = room.players.find((p) => p.id === playerId)
      if (player) {
        player.hasFinished = true
        this.rooms.set(roomCode, room)
      }
    }
  }
}
