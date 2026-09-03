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
             ? { email: (form.email || '').trim(), password: form.password, rol_esperado: 'admin' }
        : { usuario: (form.usuario || '').trim(), password: form.password, rol_esperado: tipo }

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

  const claseTab = (activo) =>
    `py-2.5 px-1 text-[11px] sm:text-xs font-semibold leading-tight rounded-md transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 focus:z-10 ${
      activo
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-transparent text-slate-500 hover:bg-white hover:text-slate-700'
    }`

  const claseInput =
    'w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2.5 text-base text-slate-800 placeholder-slate-400 transition focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  const LogoMarca = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="8" y="34" width="11" height="24" rx="2" fill="#3B82F6" />
      <rect x="23" y="22" width="11" height="36" rx="2" fill="#1D6FE0" />
      <rect x="38" y="10" width="11" height="48" rx="2" fill="#0B2A6B" />
      <path d="M5 45 C 22 45, 36 32, 50 12" stroke="#1D6FE0" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M42 10 L54 8 L52 21 Z" fill="#1D6FE0" />
    </svg>
  )

  return (
    <div className="min-h-screen relative bg-[#EEF3FA] overflow-x-hidden">
      {/* Fondo estilo marca */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="fondoClaro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8EFF9" />
          </linearGradient>
          <linearGradient id="fondoAzul" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0A2A6B" />
            <stop offset="100%" stopColor="#123C8F" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#fondoClaro)" />
        <path d="M1010 0 C 1150 130, 1290 250, 1440 300 L1440 0 Z" fill="url(#fondoAzul)" opacity="0.92" />
        <path d="M0 610 C 340 700, 1060 520, 1440 615 L1440 900 L0 900 Z" fill="url(#fondoAzul)" />
      </svg>

      {/* Puntos decorativos */}
      <svg className="absolute top-8 left-8 w-24 h-16 opacity-40" viewBox="0 0 100 60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(f => [0, 1, 2, 3, 4, 5, 6].map(c => (
          <circle key={`${f}-${c}`} cx={4 + c * 15} cy={4 + f * 13} r="2.5" fill="#9DB6DC" />
        )))}
      </svg>
      <svg className="absolute top-10 right-10 w-24 h-16 opacity-50" viewBox="0 0 100 60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(f => [0, 1, 2, 3, 4, 5, 6].map(c => (
          <circle key={`${f}-${c}`} cx={4 + c * 15} cy={4 + f * 13} r="2.5" fill="#5B8FE0" />
        )))}
      </svg>
      <div className="absolute top-52 left-6 w-40 h-40 rounded-full border-8 border-slate-200 opacity-60 hidden lg:block"></div>

      {/* Contenido */}
      <div className="relative z-10 min-h-screen flex flex-col px-5 sm:px-8 lg:px-12 py-8">
        <div className="flex-1 grid lg:grid-cols-[37rem_minmax(0,1fr)] gap-10 items-start">

          {/* Tarjeta de acceso */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-72 lg:w-96 lg:max-w-none lg:origin-top-left lg:scale-[0.78] bg-white rounded-2xl shadow-2xl border border-white p-6 sm:p-7 order-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 text-center">
              Sistema de Facturación
            </h1>
            <p className="text-sm text-slate-500 text-center mt-1 mb-5">Inicia sesión para continuar</p>

            {/* Selector Admin / Operador / Vendedor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-5 p-1 rounded-xl bg-slate-100">
              <button
                id="tipo-admin"
                type="button"
                onFocus={() => setTipo('admin')}
                onClick={() => setTipo('admin')}
                className={claseTab(tipo === 'admin')}
              >
                Administrador
              </button>
              <button
                id="tipo-operador"
                type="button"
                onFocus={() => setTipo('operador')}
                onClick={() => setTipo('operador')}
                className={claseTab(tipo === 'operador')}
              >
                Operador
              </button>
              <button
                id="tipo-vendedor"
                type="button"
                onFocus={() => setTipo('vendedor')}
                onClick={() => setTipo('vendedor')}
                className={claseTab(tipo === 'vendedor')}
              >
                Vendedor
              </button>
              <button
                id="tipo-cajero"
                type="button"
                onFocus={() => setTipo('cajero')}
                onClick={() => setTipo('cajero')}
                className={claseTab(tipo === 'cajero')}
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
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium">Configuración inicial de esta caja</p>
              <p className="text-xs text-blue-600 mt-1">Ingrese el usuario de la empresa. Solo se pide una vez en este equipo.</p>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuario de la Empresa</label>
            <input
              type="text"
              autoFocus
              value={configEmpresa}
              onChange={(e) => setConfigEmpresa(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && configEmpresa.trim()) { localStorage.setItem('empresa_caja', configEmpresa.trim()); setEmpresaCaja(configEmpresa.trim()) } }}
              placeholder="Ej: menandro"
              className={claseInput + ' mb-4'}
            />
            <button
              type="button"
              onClick={() => { if (configEmpresa.trim()) { localStorage.setItem('empresa_caja', configEmpresa.trim()); setEmpresaCaja(configEmpresa.trim()) } }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Configurar Caja
            </button>
          </div>
        ) : tipo === 'cajero' ? (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-5">
              <p className="text-lg font-semibold text-slate-800">Introduzca su PIN</p>
              <p className="text-xs text-slate-500 mt-1">{empresaCaja}</p>
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
              className="w-full border-2 border-slate-300 bg-slate-50 rounded-xl px-3 py-4 mb-5 text-center tracking-[0.5em] text-2xl text-slate-800 transition focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />
            <button
              id="login-entrar"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => { if (confirm('¿Cambiar la empresa configurada en esta caja?')) { localStorage.removeItem('empresa_caja'); setEmpresaCaja(''); setConfigEmpresa('') } }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 mt-4">
              Cambiar empresa de esta caja
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            {tipo === 'admin' ? (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuario</label>
                <input
                  id="login-usuario"
                  type="text"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Usuario o email"
                  className={claseInput}
                  required
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuario</label>
                <input
                  id="login-usuario"
                  type="text"
                  name="usuario"
                  value={form.usuario}
                  onChange={handleChange}
                  className={claseInput}
                  required
                />
              </>
            )}
          </div>

      <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{tipo === 'cajero' ? 'PIN (4 dígitos)' : 'Contraseña'}</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              maxLength={tipo === 'cajero' ? 4 : undefined}
              inputMode={tipo === 'cajero' ? 'numeric' : undefined}
              placeholder={tipo === 'cajero' ? '••••' : ''}
              className={`${claseInput} ${tipo === 'cajero' ? 'text-center tracking-widest text-lg' : ''}`}
              required
            />
          </div>

          <button
            id="login-entrar"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        )}

            <p className="text-center text-[11px] text-slate-400 mt-6">Inversiones Lindo — Sistema de Facturación SaaS</p>
          </div>

          {/* Marca */}
          <div className="text-center order-2 lg:pt-4">
            <div className="flex justify-center mb-2">
              <LogoMarca className="w-20 h-20 sm:w-24 sm:h-24" />
            </div>
            <p className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0B2A6B] leading-none">INVERSIONES</p>
            <div className="flex items-center justify-center gap-4 mt-1">
              <span className="h-1 w-8 sm:w-12 rounded bg-[#1D6FE0]"></span>
              <p className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1D6FE0] leading-none">LINDO</p>
              <span className="h-1 w-8 sm:w-12 rounded bg-[#1D6FE0]"></span>
            </div>
            <div className="h-px bg-slate-300 max-w-md mx-auto my-5"></div>
            <p className="text-sm sm:text-xl tracking-[0.25em] text-[#2B3F63] font-medium">SISTEMA DE FACTURACIÓN</p>
            <span className="inline-block bg-[#1D6FE0] text-white text-lg sm:text-2xl font-bold px-8 py-2 rounded-full mt-4">SAAS</span>
          </div>
        </div>

        {/* Franja de atributos */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-5 mt-12 text-white max-w-4xl">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1D6FE0] flex items-center justify-center text-lg font-bold">$</span>
            <div>
              <p className="font-bold uppercase text-xs sm:text-sm tracking-wide">Facturación</p>
              <p className="text-xs text-blue-200 uppercase">Rápida y fácil</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1D6FE0] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white"><rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></svg>
            </span>
            <div>
              <p className="font-bold uppercase text-xs sm:text-sm tracking-wide">Reportes</p>
              <p className="text-xs text-blue-200 uppercase">En tiempo real</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1D6FE0] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3 19c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2z"/><path d="M15.6 19c0-2.2 1.4-3.8 3.4-3.8 1.4 0 2 .5 2 3.8z"/></svg>
            </span>
            <div>
              <p className="font-bold uppercase text-xs sm:text-sm tracking-wide">Gestión de clientes</p>
              <p className="text-xs text-blue-200 uppercase">Todo en un lugar</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1D6FE0] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white"><path d="M7 18h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.6 9.6 3.7 3.7 0 0 0 7 18z"/></svg>
            </span>
            <div>
              <p className="font-bold uppercase text-xs sm:text-sm tracking-wide">100% en la nube</p>
              <p className="text-xs text-blue-200 uppercase">Seguro y confiable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sello de seguridad */}
      <div className="hidden lg:flex absolute bottom-10 right-10 z-10 items-center gap-4 rounded-xl border border-white/20 bg-white/10 px-5 py-4">
        <span className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1D6FE0] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white" aria-hidden="true">
            <path d="M12 2a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3zm0 9a1.8 1.8 0 0 1 .9 3.35V18a.9.9 0 0 1-1.8 0v-1.65A1.8 1.8 0 0 1 12 13z"/>
          </svg>
        </span>
        <div className="text-white">
          <p className="font-bold text-sm tracking-wide">Conexión segura</p>
          <p className="text-xs text-blue-200">Datos cifrados de extremo a extremo</p>
        </div>
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