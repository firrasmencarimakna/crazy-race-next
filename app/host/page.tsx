"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, BookOpen, Settings, Users, Gamepad2, Brain, Globe } from "lucide-react"
import Link from "next/link"

const quizCategories = [
  {
    id: "general",
    name: "General Knowledge",
    description: "Mixed topics for everyone",
    icon: Globe,
    color: "primary",
    questions: 50,
  },
  {
    id: "science",
    name: "Science & Tech",
    description: "For the tech-savvy racers",
    icon: Settings,
    color: "secondary",
    questions: 45,
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletic knowledge challenge",
    icon: Users,
    color: "accent",
    questions: 40,
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "Video game trivia",
    icon: Gamepad2,
    color: "primary",
    questions: 35,
  },
  {
    id: "history",
    name: "History",
    description: "Past events and figures",
    icon: BookOpen,
    color: "secondary",
    questions: 55,
  },
  {
    id: "brain",
    name: "Brain Teasers",
    description: "Logic and puzzles",
    icon: Brain,
    color: "accent",
    questions: 30,
  },
]

export default function HostPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Host Dashboard</h1>
          <div></div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-balance">
            Create Your <span className="text-primary">Racing Quiz</span>
          </h2>
          <p className="text-xl text-muted-foreground text-balance">
            Choose a quiz category to get started with your multiplayer race
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizCategories.map((quiz) => {
            const IconComponent = quiz.icon
            return (
              <Link key={quiz.id} href="/host/settings">
                <Card className="p-6 hover:bg-card/70 transition-all duration-300 transform hover:scale-105 cursor-pointer h-full">
                  <div className="flex flex-col items-center text-center h-full">
                    <div className={`p-4 bg-${quiz.color}/20 rounded-full mb-4`}>
                      <IconComponent className={`h-8 w-8 text-${quiz.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{quiz.name}</h3>
                    <p className="text-muted-foreground mb-4 flex-1">{quiz.description}</p>
                    <div className="text-sm text-muted-foreground mb-4">{quiz.questions} questions available</div>
                    <Button className="w-full">Select Quiz</Button>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            More quiz categories coming soon! Select a quiz above to configure your racing room.
          </p>
        </div>
      </div>
    </div>
  )
}
