import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Productos from './pages/Productos'
import Facturas from './pages/Facturas'
import Pagos from './pages/Pagos'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Proveedores from './pages/Proveedores'
import Inventario from './pages/Inventario'
import CuentasCobrar from './pages/CuentasCobrar'
import CuentasPagar from './pages/CuentasPagar'
import Mantenimiento from './pages/Mantenimiento'

function App() {
  const [usuario, setUsuario] = useState(() => {
    const u = sessionStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })
  const [pagina, setPagina] = useState('facturas')

  const handleLogin = (user) => {
    setUsuario(user)
    setPagina(user.rol === 'vendedor' ? 'facturas' : 'dashboard')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('usuario')
    setUsuario(null)
  }

  if (!usuario) return <Login onLogin={handleLogin} />

  const esVendedor = usuario.rol === 'vendedor'

  const menuAdmin = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'clientes', label: '👥 Clientes' },
    { id: 'productos', label: '📦 Productos' },
    { id: 'facturas', label: '🧾 Facturas' },
    { id: 'pagos', label: '💰 Pagos' },
    { id: 'reportes', label: '📈 Reportes' },
    { id: 'proveedores', label: '🏭 Proveedores' },
    { id: 'inventario', label: '📋 Inventario' },
    { id: 'cuentascobrar', label: '💵 Cuentas por Cobrar' },
    { id: 'cuentaspagar', label: '💳 Cuentas por Pagar' },
    { id: 'mantenimiento', label: '🔧 Mantenimiento' },
    { id: 'configuracion', label: '⚙️ Configuración' },
  ]

  const menuVendedor = [
    { id: 'facturas', label: '📋 Pedidos' },
    { id: 'pagos', label: '💰 Pagos' },
    { id: 'cuentascobrar', label: '💵 Cuentas por Cobrar' },
  ]

  const menuItems = esVendedor ? menuVendedor : menuAdmin

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-56 bg-white shadow-md flex flex-col">
        <div className="px-6 py-5 border-b">
          <h1 className="text-lg font-bold text-blue-600">Facturación</h1>
          {esVendedor && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mt-1 inline-block">Vendedor</span>
          )}
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
        {pagina === 'dashboard' && !esVendedor && <Dashboard />}
        {pagina === 'clientes' && !esVendedor && <Clientes />}
        {pagina === 'productos' && !esVendedor && <Productos />}
        {pagina === 'facturas' && <Facturas vendedor_id={esVendedor ? usuario.id : null} />}
        {pagina === 'pagos' && <Pagos vendedor_id={esVendedor ? usuario.id : null} />}
        {pagina === 'reportes' && <Reportes vendedor_id={esVendedor ? usuario.id : null} />}
        {pagina === 'proveedores' && !esVendedor && <Proveedores />}
        {pagina === 'inventario' && !esVendedor && <Inventario />}
        {pagina === 'cuentascobrar' && <CuentasCobrar vendedor_id={esVendedor ? usuario.id : null} />}
        {pagina === 'cuentaspagar' && !esVendedor && <CuentasPagar />}
        {pagina === 'mantenimiento' && !esVendedor && <Mantenimiento />}
        {pagina === 'configuracion' && !esVendedor && <Configuracion />}
      </div>
    </div>
  )
}

export default App