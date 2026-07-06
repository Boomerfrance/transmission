import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { auth as authApi, setToken, clearToken } from './api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  familyId: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('transmission_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((data) => {
        setUser(data.user)
        setFamilyId(data.family?.id || null)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setToken(data.token)
    setUser(data.user)
    setFamilyId(data.familyId)
  }

  const signup = async (name: string, email: string, password: string) => {
    const data = await authApi.signup(name, email, password)
    setToken(data.token)
    setUser(data.user)
    setFamilyId(data.familyId)
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setFamilyId(null)
  }

  return (
    <AuthContext.Provider value={{ user, familyId, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
