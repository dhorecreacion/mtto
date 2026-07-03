import axios from 'axios'

// Deriva la URL del backend del MISMO host con el que se abrió la app.
// Así funciona en localhost o en cualquier IP de la red local sin reconstruir.
// Si defines VITE_API_URL en el entorno, ese valor tiene prioridad (útil en producción).
function resolverApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:8000`
}

const API_URL = resolverApiUrl()

const api = axios.create({
  baseURL: API_URL,
})

// Antes de cada petición, agrega el token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si Django responde 401 (token vencido), intenta renovarlo
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${API_URL}/api/token/refresh/`,
            { refresh }
          )
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
