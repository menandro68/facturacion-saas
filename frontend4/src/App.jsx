import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import Facturas from './pages/Facturas'
import Pagos from './pages/Pagos'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'

function App() {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })
  const [pagina, setPagina] = useState('dashboard')

  const handleLogin = (user) => setUsuario(user)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  if (!usuario) return <Login onLogin={handleLogin} />

  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'clientes', label: '👥 Clientes' },
    { id: 'productos', label: '📦 Productos' },
    { id: 'facturas', label: '🧾 Facturas' },
    { id: 'pagos', label: '💰 Pagos' },
    { id: 'reportes', label: '📈 Reportes' },
    { id: 'configuracion', label: '⚙️ Configuración' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-md flex flex-col">
        <div className="px-6 py-5 border-b">
          <h1 className="text-lg font-bold text-blue-600">Facturación</h1>
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPagina(item.id)}
              className={`w-full text-left px-4 py-2 rounded mb-1 text-sm ${
                pagina === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <p className="text-xs text-gray-500 mb-2">{usuario.nombre}</p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto">
        {pagina === 'dashboard' && <Dashboard />}
        {pagina === 'clientes' && <Clientes />}
        {pagina === 'productos' && <Productos />}
        {pagina === 'facturas' && <Facturas />}
        {pagina === 'pagos' && <Pagos />}
        {pagina === 'reportes' && <Reportes />}
        {pagina === 'configuracion' && <Configuracion />}
      </div>
    </div>
  )
}

export default App