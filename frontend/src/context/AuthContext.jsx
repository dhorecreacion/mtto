import { createContext, useState, useEffect } from 'react'
import api from '../api/axios'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.get('/api/accounts/perfil/')
        .then(({ data }) => setUsuario(data))
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setCargando(false))
    } else {
      setCargando(false)
    }
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/api/token/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const perfil = await api.get('/api/accounts/perfil/')
    setUsuario(perfil.data)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUsuario(null)
  }

  const refreshUser = async () => {
    const { data } = await api.get('/api/accounts/perfil/')
    setUsuario(data)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
