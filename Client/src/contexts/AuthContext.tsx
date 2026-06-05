import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import * as authApi from '@/lib/api/auth'
import type { User } from '@/lib/api/auth'

export type { User }

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const data = await authApi.fetchMe()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.loginUser(email, password)
    setUser(data.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.registerUser(name, email, password)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logoutUser()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
