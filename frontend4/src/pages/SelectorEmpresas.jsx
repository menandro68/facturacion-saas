import { useState, useEffect } from 'react'
import API from '../services/api'

export default function SelectorEmpresas({ onEntrar, onSalir }) {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [empresaSel, setEmpresaSel] = useState(null)
  const [tipo, setTipo] = useState('admin')
  const [cred, setCred] = useState({ usuario: '', password: '' })
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await API.get('/auth/empresas-selector')
        const lista = res.data.data
// Si solo tiene su propia empresa (sin sub-empresas), entrar directo
        if (lista.length <= 1) {
          const u = JSON.parse(sessionStorage.getItem('usuario'))
          sessionStorage.setItem('es_matriz', lista[0]?.es_principal ? 'true' : 'false')
          onEntrar(u)
          return
        }
        setEmpresas(lista)
        setLoading(false)
      } catch (e) {
        setError('No se pudieron cargar las empresas')
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const abrirLogin = (emp) => {
// Si es la empresa principal del usuario, entra directo (ya esta autenticado)
    if (emp.es_principal) {
      const u = JSON.parse(sessionStorage.getItem('usuario'))
      sessionStorage.setItem('es_matriz', 'true')
      onEntrar(u)
      return
    }
    // Si es sub-empresa, pide credenciales de esa empresa
    setEmpresaSel(emp)
    setCred({ usuario: '', password: '' })
    setError('')
    setTipo('admin')
  }

  const entrarEmpresa = async (e) => {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      const res = await API.post('/auth/login-empresa', {
        empresa_id: empresaSel.id,
        usuario: cred.usuario,
        password: cred.password
      })
 sessionStorage.setItem('token', res.data.token)
      sessionStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      sessionStorage.setItem('es_matriz', 'false')
      onEntrar(res.data.usuario)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Credenciales incorrectas')
    } finally {
      setEntrando(false)
    }
  }

  const empresasFiltradas = empresas.filter(emp =>
    emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (emp.rnc || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-blue-600">Selecciona una Empresa</h1>
          <button onClick={onSalir} className="text-sm text-gray-500 hover:text-gray-700">Cerrar sesion</button>
        </div>
        <p className="text-gray-500 mb-6 text-sm">Elige la empresa a la que deseas ingresar. Te pedira las credenciales de esa empresa.</p>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Cargando empresas...</p>
        ) : (
          <>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar empresa por nombre o RNC..."
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {empresasFiltradas.length === 0 ? (
                <p className="text-gray-400 col-span-2 text-center py-6">No hay empresas</p>
              ) : empresasFiltradas.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => abrirLogin(emp)}
                  className="text-left border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="font-semibold text-gray-800">{emp.nombre}</div>
                  <div className="text-xs text-gray-500 mt-1">RNC: {emp.rnc || 'N/D'}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {empresaSel && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-blue-700 mb-1">{empresaSel.nombre}</h2>
            <p className="text-sm text-gray-500 mb-4">Ingresa las credenciales de esta empresa</p>

            <div className="flex mb-4 border border-gray-200 rounded overflow-hidden">
              <button type="button" onClick={() => setTipo('admin')}
                className={`flex-1 py-2 text-sm font-medium ${tipo === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Administrador
              </button>
              <button type="button" onClick={() => setTipo('operador')}
                className={`flex-1 py-2 text-sm font-medium border-l border-gray-200 ${tipo === 'operador' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Operador
              </button>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={entrarEmpresa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input type="text" value={cred.usuario}
                  onChange={e => setCred({ ...cred, usuario: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                <input type="password" value={cred.password}
                  onChange={e => setCred({ ...cred, password: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEmpresaSel(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-medium hover:bg-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={entrando}
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
                  {entrando ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}