import { useState } from 'react'
import API from '../services/api'

export default function Login({ onLogin }) {
  const [tipo, setTipo] = useState('admin')
  const [form, setForm] = useState({ email: '', password: '', usuario: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal de cambio de credenciales en primer login
  const [showCambioModal, setShowCambioModal] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [cambioForm, setCambioForm] = useState({
    nuevo_usuario: '',
    nueva_password: '',
    repetir_password: ''
  })
  const [cambioError, setCambioError] = useState('')
  const [cambioLoading, setCambioLoading] = useState(false)

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
      
      // Si es primer login, mostrar modal obligatorio
      if (res.data.requiere_cambio) {
        setTempToken(res.data.token)
        sessionStorage.setItem('token', res.data.token)
        setShowCambioModal(true)
        setLoading(false)
        return
      }
      
      sessionStorage.setItem('token', res.data.token)
      sessionStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      onLogin(res.data.usuario)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleCambioSubmit = async (e) => {
    e.preventDefault()
    setCambioLoading(true)
    setCambioError('')
    try {
      // Validar contraseñas iguales en frontend
      if (cambioForm.nueva_password !== cambioForm.repetir_password) {
        setCambioError('Las contraseñas no coinciden')
        setCambioLoading(false)
        return
      }

      await API.post('/auth/cambiar-credenciales', cambioForm)
      
      alert('✅ Credenciales actualizadas correctamente.\n\nPor favor, inicie sesión nuevamente con sus nuevas credenciales.')
      
      // Limpiar todo y volver al login
      sessionStorage.clear()
      localStorage.clear()
      setShowCambioModal(false)
      setForm({ email: '', password: '', usuario: '' })
      setCambioForm({ nuevo_usuario: '', nueva_password: '', repetir_password: '' })
    } catch (err) {
      setCambioError(err.response?.data?.mensaje || 'Error al cambiar credenciales')
    } finally {
      setCambioLoading(false)
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

      {/* MODAL DE CAMBIO DE CREDENCIALES (Primer Login) */}
      {showCambioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-blue-700">🔒 Configure sus Credenciales</h2>
              <p className="text-sm text-gray-600 mt-2">
                Por seguridad, debe configurar sus credenciales personales antes de continuar.
              </p>
            </div>

            {cambioError && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {cambioError}
              </div>
            )}

            <form onSubmit={handleCambioSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                <input
                  type="text"
                  value={cambioForm.nuevo_usuario}
                  onChange={(e) => setCambioForm({ ...cambioForm, nuevo_usuario: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={cambioForm.nueva_password}
                  onChange={(e) => setCambioForm({ ...cambioForm, nueva_password: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repita la Contraseña *</label>
                <input
                  type="password"
                  value={cambioForm.repetir_password}
                  onChange={(e) => setCambioForm({ ...cambioForm, repetir_password: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={cambioLoading}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {cambioLoading ? 'Guardando...' : 'Guardar y Continuar'}
              </button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              ⚠️ Este paso es obligatorio. Una vez configurado, podrá iniciar sesión normalmente.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}