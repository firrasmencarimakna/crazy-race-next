"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  roomCode?: string
  playerCount?: number
}

export function ConnectionStatus({ isConnected, roomCode, playerCount }: ConnectionStatusProps) {
  const [showStatus, setShowStatus] = useState(true)

  useEffect(() => {
    // Auto-hide status after 5 seconds if connected
    if (isConnected) {
      const timer = setTimeout(() => {
        setShowStatus(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowStatus(true)
    }
  }, [isConnected])

  if (!showStatus && isConnected) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center space-x-2 px-3 py-2 text-sm"
      >
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
            {roomCode && <span>• {roomCode}</span>}
            {playerCount !== undefined && <span>• {playerCount} players</span>}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Connecting...</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </>
        )}
      </Badge>
    </div>
  )
}
