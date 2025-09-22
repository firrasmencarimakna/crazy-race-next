"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Users, Zap, Flag } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-1 bg-accent rotate-12 speed-lines"></div>
        <div className="absolute top-40 right-20 w-24 h-1 bg-primary rotate-45 speed-lines"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-1 bg-secondary -rotate-12 speed-lines"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-1 bg-accent rotate-45 speed-lines"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-balance mb-4 race-pulse">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              CRAZY
            </span>
          </h1>
          <h2 className="text-4xl md:text-6xl font-bold text-balance mb-6">
            <span className="text-foreground">RACE</span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
            The ultimate multiplayer quiz racing experience. Answer questions, race cars, and dominate the leaderboard!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-16">
          <Link href="/host">
            <Button
              size="lg"
              className="text-xl px-12 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Flag className="mr-3 h-6 w-6" />
              HOST GAME
            </Button>
          </Link>

          <Link href="/join">
            <Button
              size="lg"
              variant="secondary"
              className="text-xl px-12 py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Users className="mr-3 h-6 w-6" />
              JOIN RACE
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 transform hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-primary/20 rounded-full mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-card-foreground">Lightning Fast</h3>
              <p className="text-muted-foreground">Quick-fire questions with real-time racing action</p>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 transform hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-secondary/20 rounded-full mb-4">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-card-foreground">Multiplayer</h3>
              <p className="text-muted-foreground">Compete with friends and players worldwide</p>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 transform hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-accent/20 rounded-full mb-4">
                <Trophy className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-card-foreground">Leaderboards</h3>
              <p className="text-muted-foreground">Climb the ranks and become the ultimate racer</p>
            </div>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Ready to start your engines? Choose your path above!</p>
        </div>
      </div>
    </div>
  )
}
