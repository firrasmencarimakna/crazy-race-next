"use client"

import { useAuth } from "@/contexts/authContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import LoadingRetro from "./loadingRetro"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const publicRoutes = ["/login"]

  useEffect(() => {
    if (loading) return

    const isPublic = publicRoutes.includes(pathname)

    // deteksi apakah sedang callback Supabase
    const isOAuthCallback =
      typeof window !== "undefined" && window.location.hash.includes("access_token")

    // kalau belum login, langsung arahkan ke login
    if (!isPublic && !user && !isOAuthCallback) {
      router.replace("/login")
    }
  }, [loading, user, pathname, router])

  if (loading) return <LoadingRetro />

  return <>{children}</>
}
