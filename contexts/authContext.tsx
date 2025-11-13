"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Profile {
  id: string
  username: string
  email: string
  fullname?: string
  avatar_url?: string
  auth_user_id: string
  // Tambah field lain kalau ada, e.g. role?: string
}

interface AuthContextType {
  user: any | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile dari Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Create or update profile
  const createOrUpdateProfile = async (user: any) => {
    try {
      const profileData = {
        auth_user_id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        email: user.email || '',
        fullname: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        // Tambah default lain kalau perlu, e.g. role: 'student'
        updated_at: new Date().toISOString()
      }

      // Cek existing profile
      const existingProfile = await fetchProfile(user.id)
      if (existingProfile) {
        // Update
        const { data, error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('auth_user_id', user.id)
          .select()
          .single()

        if (error) throw error
        setProfile(data)
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single()

        if (error) throw error
        setProfile(data)
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // Kalau ada user, fetch/create profile
      if (session?.user) {
        await createOrUpdateProfile(session.user)
      }
    }
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          await createOrUpdateProfile(session.user) // Auto create/update profile pas sign in
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}