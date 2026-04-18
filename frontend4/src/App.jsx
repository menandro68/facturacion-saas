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
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [listadoPrecios, setListadoPrecios] = useState(null)

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
    { id: 'listado_precios', label: '🏷️ Listado de Precios' },
  ]

  const menuItems = esVendedor ? menuVendedor : menuAdmin

  const handleNavegar = (id) => {
    setPagina(id)
    setMenuAbierto(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header móvil */}
      <div className="bg-white shadow-md flex items-center justify-between px-4 py-3 md:hidden">
        <div>
          <h1 className="text-base font-bold text-blue-600">Facturación</h1>
          {esVendedor && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Vendedor</span>}
        </div>
        <button onClick={() => setMenuAbierto(!menuAbierto)}
          className="text-gray-700 focus:outline-none text-2xl">
          {menuAbierto ? '✕' : '☰'}
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {menuAbierto && (
        <div className="bg-white shadow-lg md:hidden z-50">
          <nav className="p-3">
            {menuItems.map((item) => (
              <button key={item.id} onClick={async () => {
                if (item.id === 'listado_precios') {
                  const token = sessionStorage.getItem('token')
                  const res = await fetch('https://facturacion-saas-production.up.railway.app/products', { headers: { Authorization: `Bearer ${token}` } })
                  const resInv = await fetch('https://facturacion-saas-production.up.railway.app/inventory', { headers: { Authorization: `Bearer ${token}` } })
                  const data = await res.json()
                  const invData = await resInv.json()
                  const prods = data.data.filter(p => p.precio).map(p => {
                    const inv = invData.data?.find(i => i.product_id === p.id)
                    return { ...p, stock_real: inv?.stock_actual || 0 }
                  })
                  setListadoPrecios(prods)
                  setMenuAbierto(false)
                  return
                }
                handleNavegar(item.id)
              }}
                className={`w-full text-left px-4 py-3 rounded mb-1 text-sm font-medium ${
                  pagina === item.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-4 pb-4 border-t pt-3">
            <p className="text-xs text-gray-500 mb-2">{usuario.nombre}</p>
            <button onClick={handleLogout}
              className="w-full bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm">
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <div className="hidden md:flex w-56 bg-white shadow-md flex-col">
          <div className="px-6 py-5 border-b">
            <h1 className="text-lg font-bold text-blue-600">Facturación</h1>
            {esVendedor && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mt-1 inline-block">Vendedor</span>
            )}
          </div>
          <nav className="flex-1 p-4">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => setPagina(item.id)}
                className={`w-full text-left px-4 py-2 rounded mb-1 text-sm ${
                  pagina === item.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t">
            <p className="text-xs text-gray-500 mb-2">{usuario.nombre}</p>
            <button onClick={handleLogout}
              className="w-full bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm">
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
      {listadoPrecios && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-700">🏷️ Listado de Precios</h2>
            <button onClick={() => setListadoPrecios(null)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">← Volver</button>
          </div>
          <p className="text-gray-400 text-sm mb-4">Fecha: {new Date().toLocaleDateString('es-DO')} — {listadoPrecios.length} producto(s)</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-3 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {listadoPrecios.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-3 text-gray-800">{p.nombre}</td>
                  <td className="px-3 py-3 text-right text-blue-700 font-medium">{parseFloat(p.stock_real || 0).toLocaleString('es-DO')}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800">RD${parseFloat(p.precio).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App