"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, CheckCircle, XCircle, Zap } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getRandomQuestions, calculateScore, type QuizQuestion } from "@/lib/quiz-data"
import { GameStateManager } from "@/lib/game-state"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { ConnectionStatus } from "@/components/connection-status"

export default function QuizGamePage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.roomCode as string

  // Mock player data - in real app this would come from session/auth
  const playerId = "player-1"

  const { isConnected, players, answerQuestion: sendAnswer } = useMultiplayer(roomCode, playerId)

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [score, setScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [gameStartTime] = useState(new Date())
  const gameManager = GameStateManager.getInstance()

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    // Initialize quiz session
    const room = gameManager.getRoom(roomCode)
    if (room) {
      const quizQuestions = getRandomQuestions("general", room.questionCount)
      setQuestions(quizQuestions)
      setAnswers(new Array(quizQuestions.length).fill(null))

      // Create quiz session
      gameManager.createQuizSession(roomCode, playerId, quizQuestions)
    }
  }, [roomCode, playerId])

  useEffect(() => {
    if (currentQuestion) {
      setTimeRemaining(currentQuestion.timeLimit)
    }
  }, [currentQuestion])

  useEffect(() => {
    if (timeRemaining > 0 && !isAnswered && currentQuestion) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1
          // Update session
          gameManager.updateQuizSession(roomCode, playerId, { timeRemaining: newTime })
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeRemaining === 0 && !isAnswered) {
      // Time's up, auto-submit
      handleAnswerSubmit()
    }
  }, [timeRemaining, isAnswered, currentQuestion, roomCode, playerId])

  const handleAnswerSelect = (answerIndex: number) => {
    if (!isAnswered) {
      setSelectedAnswer(answerIndex)
    }
  }

  const handleAnswerSubmit = () => {
    if (isAnswered || !currentQuestion) return

    setIsAnswered(true)
    setShowResult(true)

    // Update answers array
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = selectedAnswer
    setAnswers(newAnswers)

    // Check if answer is correct
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    let newScore = score
    let newCorrectAnswers = correctAnswers

    if (isCorrect) {
      newCorrectAnswers += 1
      setCorrectAnswers(newCorrectAnswers)

      // Calculate score with time bonus
      const questionScore = calculateScore(timeRemaining, currentQuestion.difficulty)
      newScore += questionScore
      setScore(newScore)
    }

    sendAnswer(currentQuestion.id, selectedAnswer || -1, isCorrect, newScore)

    // Update session
    gameManager.updateQuizSession(roomCode, playerId, {
      answers: newAnswers,
      score: newScore,
      correctAnswers: newCorrectAnswers,
      currentQuestionIndex: currentQuestionIndex + 1,
    })

    // Show result for 2 seconds, then move to next question
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        setCurrentQuestionIndex((prev) => prev + 1)
        setSelectedAnswer(null)
        setIsAnswered(false)
        setShowResult(false)
      } else {
        // Quiz completed
        gameManager.finishQuiz(roomCode, playerId)

        // Check if we need racing game (every 10 questions)
        if (questions.length >= 10 && (currentQuestionIndex + 1) % 10 === 0) {
          router.push(`/play/racing/${roomCode}`)
        } else {
          router.push(`/play/results/${roomCode}`)
        }
      }
    }, 2500)
  }

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult) {
      return selectedAnswer === optionIndex
        ? "border-primary bg-primary/10 scale-[1.02]"
        : "border-border hover:border-primary/50 hover:bg-card/50 hover:scale-[1.01]"
    }

    // Show results
    if (optionIndex === currentQuestion.correctAnswer) {
      return "border-green-500 bg-green-500/10 text-green-700 scale-[1.02]"
    } else if (optionIndex === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
      return "border-red-500 bg-red-500/10 text-red-700"
    }
    return "border-border bg-muted/50 opacity-60"
  }

  const getOptionIcon = (optionIndex: number) => {
    if (!showResult) return null

    if (optionIndex === currentQuestion.correctAnswer) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (optionIndex === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    return null
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-500"
      case "medium":
        return "text-yellow-500"
      case "hard":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getTimeColor = () => {
    if (timeRemaining <= 10) return "text-red-500"
    if (timeRemaining <= 20) return "text-yellow-500"
    return "text-primary"
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <ConnectionStatus isConnected={isConnected} roomCode={roomCode} playerCount={players.length} />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Quiz Race</h1>
            <p className="text-muted-foreground">Room: {roomCode}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {currentQuestionIndex + 1}/{totalQuestions}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Trophy className="mr-1 h-4 w-4" />
              {score}
            </Badge>
            <Badge variant="outline" className={`text-lg px-4 py-2 ${getDifficultyColor(currentQuestion.difficulty)}`}>
              {currentQuestion.difficulty.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {correctAnswers}/{currentQuestionIndex + (isAnswered ? 1 : 0)} correct
            </span>
          </div>
          <Progress value={((currentQuestionIndex + (isAnswered ? 1 : 0)) / totalQuestions) * 100} className="h-3" />
        </Card>

        {/* Timer */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-center space-x-4">
            <Clock className={`h-8 w-8 ${getTimeColor()}`} />
            <div className="text-center">
              <div className={`text-4xl font-bold ${getTimeColor()}`}>{timeRemaining}</div>
              <div className="text-sm text-muted-foreground">seconds remaining</div>
            </div>
            {timeRemaining <= 10 && <Zap className="h-6 w-6 text-red-500 animate-pulse" />}
          </div>
          <Progress
            value={(timeRemaining / currentQuestion.timeLimit) * 100}
            className={`h-2 mt-4 ${timeRemaining <= 10 ? "[&>div]:bg-red-500" : ""}`}
          />
        </Card>

        {/* Question */}
        <Card className="p-8 mb-8">
          <div className="text-center mb-6">
            <Badge variant="outline" className="mb-4">
              {currentQuestion.category}
            </Badge>
            <h2 className="text-2xl font-bold text-balance">{currentQuestion.question}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered}
                className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${getOptionStyle(index)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-lg font-medium">{option}</span>
                  </div>
                  {getOptionIcon(index)}
                </div>
              </button>
            ))}
          </div>

          {selectedAnswer !== null && !isAnswered && (
            <div className="mt-8 text-center">
              <Button
                onClick={handleAnswerSubmit}
                size="lg"
                className="text-xl px-12 py-6 bg-primary hover:bg-primary/90"
              >
                Submit Answer
              </Button>
            </div>
          )}

          {showResult && (
            <div className="mt-8 text-center">
              <div
                className={`text-2xl font-bold mb-2 ${
                  selectedAnswer === currentQuestion.correctAnswer ? "text-green-500" : "text-red-500"
                }`}
              >
                {selectedAnswer === currentQuestion.correctAnswer ? "Correct!" : "Wrong!"}
              </div>
              {selectedAnswer === currentQuestion.correctAnswer && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    +{calculateScore(timeRemaining, currentQuestion.difficulty)} points
                  </p>
                  <p className="text-sm text-muted-foreground">
                    (Base: {currentQuestion.points} + Time bonus: {Math.max(0, Math.floor(timeRemaining * 2))})
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{score}</div>
            <div className="text-sm text-muted-foreground">Total Score</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary">{correctAnswers}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {correctAnswers > 0
                ? Math.round((correctAnswers / (currentQuestionIndex + (isAnswered ? 1 : 0))) * 100)
                : 0}
              %
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </Card>
        </div>
      </div>
    </div>
  )
}
