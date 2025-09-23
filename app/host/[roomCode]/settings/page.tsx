"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clock, Hash, Play } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HostSettingsPage() {
  const [duration, setDuration] = useState("60")
  const [questionCount, setQuestionCount] = useState("10")
  const [selectedQuiz] = useState("General Knowledge") // This would come from previous page
  const router = useRouter()

  const handleCreateRoom = () => {
    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Store room settings (in real app, this would go to database)
    const roomSettings = {
      quiz: selectedQuiz,
      duration: Number.parseInt(duration),
      questionCount: Number.parseInt(questionCount),
      roomCode,
      createdAt: new Date().toISOString(),
    }

    console.log("Creating room with settings:", roomSettings)

    // Navigate to room page
    router.push(`/host/room/${roomCode}`)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/host">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quiz Selection
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Room Settings</h1>
          <div></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 text-balance">
            Configure Your <span className="text-primary">Racing Room</span>
          </h2>
          <p className="text-xl text-muted-foreground text-balance">Set up the perfect challenge for your racers</p>
        </div>

        <Card className="p-8">
          <div className="space-y-8">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h3 className="text-lg font-semibold text-primary mb-2">Selected Quiz</h3>
              <p className="text-foreground">{selectedQuiz}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-lg font-semibold flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  Duration per Question
                </Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="text-lg p-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="45">45 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                    <SelectItem value="90">90 seconds</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold flex items-center">
                  <Hash className="mr-2 h-5 w-5 text-secondary" />
                  Number of Questions
                </Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="text-lg p-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="25">25 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <h4 className="font-semibold text-accent mb-2">Game Flow Preview:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Players answer {questionCount} questions</li>
                <li>• Each question has {duration} seconds to answer</li>
                <li>• Racing mini-game after every 10 questions</li>
                <li>• Final leaderboard shows top performers</li>
              </ul>
            </div>

            <Button
              onClick={handleCreateRoom}
              className="w-full text-xl py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <Play className="mr-2 h-6 w-6" />
              Create Racing Room
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
