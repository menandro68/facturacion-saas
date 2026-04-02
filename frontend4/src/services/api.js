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
export default API