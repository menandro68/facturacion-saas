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

  // Empresa configurada en esta caja (se pide una sola vez)
  const [empresaCaja, setEmpresaCaja] = useState(() => localStorage.getItem('empresa_caja') || '')
  const [configEmpresa, setConfigEmpresa] = useState('')

  // NAVEGACIÓN POR TECLADO (sin mouse)
useEffect(() => {
    if (showCambioModal || modalError) return
    if (!document.activeElement?.id?.startsWith('tipo-')) {
      setTimeout(() => document.getElementById(tipo === 'cajero' ? 'login-password' : 'login-usuario')?.focus(), 150)
    }
    const filas = tipo === 'cajero'
      ? [
          ['tipo-admin', 'tipo-operador', 'tipo-vendedor', 'tipo-cajero'],
          ['login-password'],
          ['login-entrar']
        ]
      : [
          ['tipo-admin', 'tipo-operador', 'tipo-vendedor', 'tipo-cajero'],
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
 }, [showCambioModal, modalError, tipo])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
if (tipo === 'cajero') {
        const resPin = await API.post('/auth/login-cajero-pin', { usuario: empresaCaja, pin: form.password })
        sessionStorage.setItem('token', resPin.data.token)
        sessionStorage.setItem('usuario', JSON.stringify(resPin.data.usuario))
        sessionStorage.setItem('es_matriz', 'false')
        onLogin(resPin.data.usuario)
        setLoading(false)
        return
      }

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white p-5 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold text-blue-600 text-center mb-1">
          Sistema de Facturación
        </h1>
        <p className="text-base font-semibold text-red-500 text-center mb-2 lowercase">saas</p>
        <p className="text-gray-500 text-center mb-6">Inicia sesión para continuar</p>

        {/* Selector Admin / Operador / Vendedor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-6 border border-gray-200 rounded-lg overflow-hidden bg-gray-200">
          <button
            id="tipo-admin"
            type="button"
            onFocus={() => setTipo('admin')}
            onClick={() => setTipo('admin')}
            className={`py-2.5 px-1 text-xs sm:text-sm font-medium leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 focus:z-10 ${tipo === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Administrador
          </button>
          <button
            id="tipo-operador"
            type="button"
            onFocus={() => setTipo('operador')}
            onClick={() => setTipo('operador')}
            className={`py-2.5 px-1 text-xs sm:text-sm font-medium leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 focus:z-10 ${tipo === 'operador' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Operador
          </button>
          <button
            id="tipo-vendedor"
            type="button"
            onFocus={() => setTipo('vendedor')}
            onClick={() => setTipo('vendedor')}
            className={`py-2.5 px-1 text-xs sm:text-sm font-medium leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 focus:z-10 ${tipo === 'vendedor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Vendedor
          </button>
          <button
            id="tipo-cajero"
            type="button"
            onFocus={() => setTipo('cajero')}
            onClick={() => setTipo('cajero')}
            className={`py-2.5 px-1 text-xs sm:text-sm font-medium leading-tight focus:outline-none focus:ring-4 focus:ring-blue-300 focus:z-10 ${tipo === 'cajero' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Cajero
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

       {tipo === 'cajero' && !empresaCaja ? (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium">Configuración inicial de esta caja</p>
              <p className="text-xs text-blue-600 mt-1">Ingrese el usuario de la empresa. Solo se pide una vez en este equipo.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de la Empresa</label>
            <input
              type="text"
              autoFocus
              value={configEmpresa}
              onChange={(e) => setConfigEmpresa(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && configEmpresa.trim()) { localStorage.setItem('empresa_caja', configEmpresa.trim()); setEmpresaCaja(configEmpresa.trim()) } }}
              placeholder="Ej: menandro"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => { if (configEmpresa.trim()) { localStorage.setItem('empresa_caja', configEmpresa.trim()); setEmpresaCaja(configEmpresa.trim()) } }}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
              Configurar Caja
            </button>
          </div>
        ) : tipo === 'cajero' ? (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <p className="text-lg font-semibold text-gray-800">Introduzca su PIN</p>
              <p className="text-xs text-gray-500 mt-1">{empresaCaja}</p>
            </div>
            <input
              id="login-password"
              type="password"
              name="password"
              autoFocus
              value={form.password}
              onChange={handleChange}
              maxLength={4}
              inputMode="numeric"
              placeholder="••••"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-4 mb-6 text-center tracking-[0.5em] text-2xl focus:outline-none focus:ring-4 focus:ring-blue-300"
              required
            />
            <button
              id="login-entrar"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-300">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => { if (confirm('¿Cambiar la empresa configurada en esta caja?')) { localStorage.removeItem('empresa_caja'); setEmpresaCaja(''); setConfigEmpresa('') } }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 mt-4">
              Cambiar empresa de esta caja
            </button>
          </form>
        ) : (
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </>
            )}
          </div>

      <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">{tipo === 'cajero' ? 'PIN (4 dígitos)' : 'Contraseña'}</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              maxLength={tipo === 'cajero' ? 4 : undefined}
              inputMode={tipo === 'cajero' ? 'numeric' : undefined}
              placeholder={tipo === 'cajero' ? '••••' : ''}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${tipo === 'cajero' ? 'text-center tracking-widest text-lg' : ''}`}
              required
            />
          </div>

          <button
            id="login-entrar"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 sm:py-2.5 rounded-lg font-medium text-base hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        )}
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