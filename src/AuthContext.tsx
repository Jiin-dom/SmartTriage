import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { setAuthToken, getAuthToken } from './apiClient'

interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'agent' | string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = getAuthToken()
    const storedUser = localStorage.getItem('authUser')
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser
        setToken(storedToken)
        setUser(parsed)
      } catch {
        setAuthToken(null)
        localStorage.removeItem('authUser')
      }
    }
  }, [])

  const handleLogin = (newToken: string, newUser: AuthUser) => {
    if (!newToken || !newUser?.id) return
    setToken(newToken)
    setUser(newUser)
    setAuthToken(newToken)
    localStorage.setItem('authUser', JSON.stringify(newUser))
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    setAuthToken(null)
    localStorage.removeItem('authUser')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login: handleLogin,
        logout: handleLogout,
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


