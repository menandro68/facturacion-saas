import axios from 'axios'

const API = axios.create({
  baseURL: 'https://facturacion-saas-production.up.railway.app'
})

// Interceptor de request: agregar token JWT
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Función helper: esperar N milisegundos
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Interceptor de response: retry automático en 429 + manejo de 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Retry automático para errores 429 (Too Many Requests)
    // Estrategia: Exponential backoff (1s, 2s, 4s) con hasta 3 reintentos
    if (error.response?.status === 429 && config && !config._retry429Count) {
      config._retry429Count = 0
    }

    if (error.response?.status === 429 && config && config._retry429Count < 3) {
      config._retry429Count += 1
      const delay = Math.pow(2, config._retry429Count - 1) * 1000 // 1s, 2s, 4s
      console.warn(`⏳ Rate limit (429). Reintentando en ${delay}ms... (intento ${config._retry429Count}/3)`)
      await sleep(delay)
      return API(config)
    }

    // Manejo de 401: sesion expirada
    if (error.response?.status === 401) {
      sessionStorage.clear()
      localStorage.clear()
      window.location.reload()
    }
    // Manejo de 403: cuenta suspendida (bloqueo en tiempo real)
    if (error.response?.status === 403) {
      const mensaje = error.response?.data?.mensaje || ''
      if (mensaje.toLowerCase().includes('suspendida') || mensaje.toLowerCase().includes('no encontrada')) {
        alert('🚫 Su cuenta ha sido suspendida.\n\nContacte al administrador del sistema.')
        sessionStorage.clear()
        localStorage.clear()
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

export default API