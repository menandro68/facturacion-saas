import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Login({ onLogin }) {
  const [tipo, setTipo] = useState('admin')
  const [form, setForm] = useState({ email: '', password: '', usuario: '' })
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
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

  // NAVEGACIÓN POR TECLADO (sin mouse)
  useEffect(() => {
    if (showCambioModal || modalError) return
    setTimeout(() => document.getElementById('login-usuario')?.focus(), 150)
    const filas = [
      ['tipo-admin', 'tipo-operador', 'tipo-vendedor'],
      ['login-usuario'],
      ['login-password'],
      ['login-entrar']
    ]
    const posicion = () => {
      const id = document.activeElement?.id
      for (let f = 0; f < filas.length; f++) {
        const c = filas[f].indexOf(id)
        if (c >= 0) return [f, c]
      }
      return [-1, -1]
    }
    const ir = (f, c) => {
      const fila = filas[f]
      if (!fila) return
      document.getElementById(fila[Math.min(c, fila.length - 1)])?.focus()
    }
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const [f, c] = posicion()
      if (f === -1) { ir(1, 0); return }
      if (e.key === 'ArrowDown') ir(Math.min(f + 1, filas.length - 1), c)
      else if (e.key === 'ArrowUp') ir(Math.max(f - 1, 0), c)
      else if (e.key === 'ArrowRight') ir(f, Math.min(c + 1, filas[f].length - 1))
      else if (e.key === 'ArrowLeft') ir(f, Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCambioModal, modalError])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
   const payload = tipo === 'admin'
        ? { email: form.email, password: form.password, rol_esperado: 'admin' }
        : { usuario: form.usuario, password: form.password, rol_esperado: tipo }

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
      sessionStorage.setItem('es_matriz', res.data.usuario.es_matriz ? 'true' : 'false')
      onLogin(res.data.usuario)
    } catch (err) {
      setModalError(err.response?.data?.mensaje || 'Error al iniciar sesión')
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
            id="tipo-admin"
            type="button"
            onFocus={() => setTipo('admin')}
            onClick={() => setTipo('admin')}
            className={`flex-1 py-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-300 ${tipo === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Administrador
          </button>
          <button
            id="tipo-operador"
            type="button"
            onFocus={() => setTipo('operador')}
            onClick={() => setTipo('operador')}
            className={`flex-1 py-2 text-sm font-medium border-l border-r border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-300 ${tipo === 'operador' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Operador
          </button>
          <button
            id="tipo-vendedor"
            type="button"
            onFocus={() => setTipo('vendedor')}
            onClick={() => setTipo('vendedor')}
            className={`flex-1 py-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-300 ${tipo === 'vendedor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Vendedor
          </button>
        </div>
{modalError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-red-50 px-6 pt-6 pb-4 text-center">
                <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-3">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Acceso denegado</h3>
                <p className="text-sm text-gray-600">{modalError}</p>
              </div>
              <div className="px-6 py-4">
              <button type="button"
                  autoFocus
                  onClick={() => {
                    setModalError('')
                    setForm({ email: '', password: '', usuario: '' })
                    setTimeout(() => document.getElementById('login-usuario')?.focus(), 150)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault()
                      setModalError('')
                      setForm({ email: '', password: '', usuario: '' })
                      setTimeout(() => document.getElementById('login-usuario')?.focus(), 150)
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300">
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            {tipo === 'admin' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input
                  id="login-usuario"
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
                  id="login-usuario"
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
              id="login-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            id="login-entrar"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-300"
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