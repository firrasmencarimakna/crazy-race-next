"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Car, Users, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const carColors = [
  { name: "Red Racer", color: "bg-red-500", value: "red", emoji: "🏎️" },
  { name: "Blue Bolt", color: "bg-blue-500", value: "blue", emoji: "🚗" },
  { name: "Green Machine", color: "bg-green-500", value: "green", emoji: "🚙" },
  { name: "Yellow Thunder", color: "bg-yellow-500", value: "yellow", emoji: "🚕" },
  { name: "Purple Power", color: "bg-purple-500", value: "purple", emoji: "🚐" },
  { name: "Orange Fury", color: "bg-orange-500", value: "orange", emoji: "🚛" },
]

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [selectedCar, setSelectedCar] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleJoinRoom = async () => {
    if (!roomCode || !nickname || !selectedCar) {
      setError("Please fill in all fields")
      return
    }

    if (roomCode.length !== 6) {
      setError("Room code must be 6 characters")
      return
    }

    if (nickname.length < 2) {
      setError("Nickname must be at least 2 characters")
      return
    }

    setIsJoining(true)
    setError("")

    try {
      // Simulate API call to join room
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real app, validate room exists and add player
      console.log("Joining room:", { roomCode, nickname, selectedCar })

      // Navigate to lobby
      router.push(`/join/lobby/${roomCode}`)
    } catch (err) {
      setError("Failed to join room. Please check the room code and try again.")
    } finally {
      setIsJoining(false)
    }
  }

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    setRoomCode(value)
    setError("")
  }

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "")
    setNickname(value)
    setError("")
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-secondary">Join Race</h1>
          <div></div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 text-balance">
            Join the <span className="text-secondary">Racing Action</span>
          </h2>
          <p className="text-xl text-muted-foreground text-balance">Enter room details and choose your racing car</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roomCode" className="text-lg font-semibold">
                Room Code
              </Label>
              <Input
                id="roomCode"
                placeholder="Enter 6-digit room code"
                value={roomCode}
                onChange={handleRoomCodeChange}
                className="text-lg p-4 text-center font-mono tracking-widest"
                maxLength={6}
                disabled={isJoining}
              />
              <p className="text-sm text-muted-foreground">Ask your host for the 6-character room code</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-lg font-semibold">
                Your Nickname
              </Label>
              <Input
                id="nickname"
                placeholder="Enter your racing name"
                value={nickname}
                onChange={handleNicknameChange}
                className="text-lg p-4"
                maxLength={20}
                disabled={isJoining}
              />
              <p className="text-sm text-muted-foreground">This will be displayed to other players</p>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Choose Your Car</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {carColors.map((car) => (
                  <button
                    key={car.value}
                    onClick={() => {
                      setSelectedCar(car.value)
                      setError("")
                    }}
                    disabled={isJoining}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 disabled:opacity-50 ${
                      selectedCar === car.value
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-card/50"
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-2xl">{car.emoji}</div>
                      <div className={`w-8 h-6 ${car.color} rounded-sm flex items-center justify-center`}>
                        <Car className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{car.name}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Choose your favorite car color for the race</p>
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={!roomCode || !nickname || !selectedCar || isJoining}
              className="w-full text-lg py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Joining Race...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-5 w-5" />
                  Join Racing Room
                </>
              )}
            </Button>
          </div>
        </Card>

        <div className="mt-8 text-center space-y-4">
          <p className="text-muted-foreground">Need a room code? Ask your host to share it with you!</p>

          <Card className="p-4 bg-accent/10 border-accent/20">
            <h3 className="font-semibold text-accent mb-2">How to Join:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 text-left">
              <li>1. Get the 6-digit room code from your host</li>
              <li>2. Enter your racing nickname</li>
              <li>3. Pick your favorite car color</li>
              <li>4. Join the lobby and wait for the race to start!</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
