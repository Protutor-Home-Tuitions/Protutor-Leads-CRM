// src/lib/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import { auth as authApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('crm_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    sessionStorage.setItem('crm_token', data.token)
    sessionStorage.setItem('crm_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('crm_token')
    sessionStorage.removeItem('crm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
