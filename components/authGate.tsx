"use client"

import { useAuth } from "@/contexts/authContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import LoadingRetro from "./loadingRetro"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const publicRoutes = ["/login", "/register", "/about"]

  useEffect(() => {
    if (loading) return

    const isPublic = publicRoutes.includes(pathname)

    // pakai native API untuk cek kode OAuth
    const url = typeof window !== "undefined" ? new URL(window.location.href) : null
    const hasOAuthCode = url?.searchParams.has("code")

    if (!isPublic && !user && !hasOAuthCode) {
      router.replace("/login")
    }
  }, [loading, user, pathname, router])

  if (loading) return <LoadingRetro />

  return <>{children}</>
}
