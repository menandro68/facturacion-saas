import { useState } from 'react'
import API from '../services/api'

export default function Login({ onLogin }) {
  const [tipo, setTipo] = useState('admin')
  const [form, setForm] = useState({ email: '', password: '', usuario: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = tipo === 'admin'
        ? { email: form.email, password: form.password }
        : { usuario: form.usuario, password: form.password }

      const res = await API.post('/auth/login', payload)
      sessionStorage.setItem('token', res.data.token)
      sessionStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      onLogin(res.data.usuario)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
     <h1 className="text-2xl font-bold text-blue-600 text-center mb-1">
          Sistema de Facturación
        </h1>
        <p className="text-base font-semibold text-red-500 text-center mb-2 lowercase">saas</p>
        <p className="text-gray-500 text-center mb-6">Inicia sesión para continuar</p>

        {/* Selector Admin / Operador / Vendedor */}
        <div className="flex mb-6 border border-gray-200 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setTipo('admin')}
            className={`flex-1 py-2 text-sm font-medium ${tipo === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Administrador
          </button>
          <button
            type="button"
            onClick={() => setTipo('operador')}
            className={`flex-1 py-2 text-sm font-medium border-l border-r border-gray-200 ${tipo === 'operador' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Operador
          </button>
          <button
            type="button"
            onClick={() => setTipo('vendedor')}
            className={`flex-1 py-2 text-sm font-medium ${tipo === 'vendedor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Vendedor
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            {tipo === 'admin' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input
                  type="text"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Usuario o email"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input
                  type="text"
                  name="usuario"
                  value={form.usuario}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}