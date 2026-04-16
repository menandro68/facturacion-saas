import axios from 'axios'
const API = axios.create({
  baseURL: 'https://facturacion-saas-production.up.railway.app'
})
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear()
      localStorage.clear()
      window.location.reload()
    }
    return Promise.reject(error)
  }
)
export default API