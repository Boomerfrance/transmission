import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  login: () => void
  signup: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const PUBLIC_PATHS = ['/', '/connexion', '/inscription', '/mot-de-passe-oublie']

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getIdTokenClaims,
  } = useAuth0()

  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const didInit = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (auth0Loading || didInit.current) return
    didInit.current = true

    ;(async () => {
      // 1. Try existing JWT (returning user with valid session)
      const existingToken = localStorage.getItem('transmission_token')
      if (existingToken) {
        try {
          const data = await authApi.me()
          setUser(data.user)
          setFamilyId(data.family?.id || null)
          setReady(true)
          return
        } catch {
          clearToken()
        }
      }

      // 2. Auth0 just authenticated → sync with our backend
      if (isAuthenticated) {
        try {
          const claims = await getIdTokenClaims()
          if (claims) {
            const data = await authApi.auth0Login(claims.__raw)
            setToken(data.token)
            setUser(data.user)
            setFamilyId(data.familyId)
            // Redirect to dashboard from public pages
            if (PUBLIC_PATHS.includes(location.pathname)) {
              navigate('/tableau-de-bord', { replace: true })
            }
          }
        } catch (err) {
          console.error('Auth0 sync error:', err)
        }
      }

      setReady(true)
    })()
  }, [auth0Loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    loginWithRedirect()
  }, [loginWithRedirect])

  const signup = useCallback(() => {
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })
  }, [loginWithRedirect])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setFamilyId(null)
    didInit.current = false
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }, [auth0Logout])

  return (
    <AuthContext.Provider value={{ user, familyId, loading: auth0Loading || !ready, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
