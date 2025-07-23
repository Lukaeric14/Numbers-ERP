"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  userRole: string | null
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch user role from database
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching user role:', error)
        return 'student' // Default fallback
      }
      
      return data?.role || 'student'
    } catch (error) {
      console.error('Error fetching user role:', error)
      return 'student'
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        // Fetch role immediately alongside session check
        const role = await fetchUserRole(session.user.id)
        setUserRole(role)
        setLoading(false)
      } else {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
          // Fetch role in background without blocking
          fetchUserRole(session.user.id).then(role => {
            setUserRole(role)
          })
        } else {
          setUser(null)
          setIsAuthenticated(false)
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Split full name into first and last name if provided
    let firstName = ''
    let lastName = ''
    
    if (fullName) {
      const nameParts = fullName.trim().split(' ')
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    // If signup successful, create app_users entry with role detection
    if (!error && data.user) {
      try {
        // Check if user is a student
        const { data: studentData } = await supabase
          .from('students')
          .select('workspace_id')
          .eq('email', email)
          .single()

        // Check if user is a parent
        const { data: parentData } = await supabase
          .from('parents')
          .select('workspace_id')
          .eq('email', email)
          .single()

        let role = 'student' // default
        let workspace_id = null

        if (studentData) {
          role = 'student'
          workspace_id = studentData.workspace_id
        } else if (parentData) {
          role = 'parent'
          workspace_id = parentData.workspace_id
        }

        // Create app_users entry
        const { error: appUserError } = await supabase
          .from('app_users')
          .insert({
            id: data.user.id,
            email: email,
            role: role,
            workspace_id: workspace_id,
          })

        if (appUserError) {
          console.error('Error creating app_users entry:', appUserError)
          // Don't fail the signup for this
        }
      } catch (roleError) {
        console.error('Error during role assignment:', roleError)
        // Don't fail the signup for this
      }
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, userRole, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
