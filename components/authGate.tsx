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
  const isPublic = publicRoutes.includes(pathname)
  const isOAuthCallback =
    typeof window !== "undefined" && window.location.hash.includes("access_token")

  useEffect(() => {
    if (loading) return

    if (!isPublic && !user && !isOAuthCallback) {
      router.replace("/login")
    }
  }, [loading, user, pathname, router, isPublic, isOAuthCallback])

  if (loading) {
    return <LoadingRetro />
  }

  // While the redirect is in progress for an unauthenticated user on a private route,
  // keep showing the loading screen to prevent rendering the protected content.
  if (!isPublic && !user && !isOAuthCallback) {
    return <LoadingRetro />
  }

  return <>{children}</>
}
