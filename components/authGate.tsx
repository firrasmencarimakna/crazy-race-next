"use client"

import { useAuth } from "@/contexts/authContext"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import LoadingRetro from "./loadingRetro"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const publicRoutes = ["/login", "/register", "/about"]

  useEffect(() => {
    // Cek apakah URL punya "code" param (callback OAuth)
    const hasOAuthCode = searchParams.has("code")

    if (!loading) {
      const isPublic = publicRoutes.includes(pathname)

      // 🚀 Kalau belum login dan bukan public page, redirect ke /login
      // Tapi kalau ada `code`, biarkan Supabase handle dulu
      if (!isPublic && !user && !hasOAuthCode) {
        router.replace("/login")
      }
    }
  }, [loading, user, pathname, router, searchParams])

  if (loading) return <LoadingRetro />

  return <>{children}</>
}
