import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Mantenimiento() {
  const [tab, setTab] = useState('vendedores')
  const [vendedores, setVendedores] = useState([])
  const [zonas, setZonas] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState('')

  const [formVendedor, setFormVendedor] = useState({ nombre: '', cedula: '', email: '', telefono: '', zona_id: '', comision_pct: '', usuario: '', password: '' })
  const [formZona, setFormZona] = useState({ nombre: '', descripcion: '' })
  const [formChofer, setFormChofer] = useState({ nombre: '', cedula: '', licencia: '', telefono: '', email: '', vehiculo: '', placa: '' })
  const [claveDescuento, setClaveDescuento] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mensajeClave, setMensajeClave] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [v, z, c] = await Promise.all([
        API.get('/mantenimiento/vendedores'),
        API.get('/mantenimiento/zonas'),
        API.get('/mantenimiento/choferes')
      ])
      setVendedores(v.data.data)
      setZonas(z.data.data)
      setChoferes(c.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleNuevo = () => {
    setEditando(null)
    setError('')
    if (tab === 'vendedores') setFormVendedor({ nombre: '', cedula: '', email: '', telefono: '', zona_id: '', comision_pct: '', usuario: '', password: '' })
    if (tab === 'zonas') setFormZona({ nombre: '', descripcion: '' })
    if (tab === 'choferes') setFormChofer({ nombre: '', cedula: '', licencia: '', telefono: '', email: '', vehiculo: '', placa: '' })
    setShowForm(true)
  }

  const handleEditar = (item) => {
    setEditando(item.id)
    setError('')
    if (tab === 'vendedores') setFormVendedor({ nombre: item.nombre, cedula: item.cedula || '', email: item.email || '', telefono: item.telefono || '', zona_id: item.zona_id || '', comision_pct: item.comision_pct || '' })
    if (tab === 'zonas') setFormZona({ nombre: item.nombre, descripcion: item.descripcion || '' })
    if (tab === 'choferes') setFormChofer({ nombre: item.nombre, cedula: item.cedula || '', licencia: item.licencia || '', telefono: item.telefono || '', email: item.email || '', vehiculo: item.vehiculo || '', placa: item.placa || '' })
    setShowForm(true)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await API.delete(`/mantenimiento/${tab}/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const form = tab === 'vendedores' ? formVendedor : tab === 'zonas' ? formZona : formChofer
      if (editando) {
        await API.put(`/mantenimiento/${tab}/${editando}`, form)
      } else {
        await API.post(`/mantenimiento/${tab}`, form)
      }
      setShowForm(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const tabs = [
    { id: 'vendedores', label: '🧑‍💼 Vendedores' },
    { id: 'zonas', label: '🗺️ Zonas' },
    { id: 'choferes', label: '🚗 Choferes' },
    { id: 'clave', label: '🔐 Clave Descuento' },
  ]

  if (loading) return <p className="text-gray-500 p-6">Cargando...</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Mantenimiento</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(t => (
          <button key={t.id} onClick={async () => {
            setTab(t.id); setShowForm(false)
            if (t.id === 'clave') {
              try {
                const res = await API.get('/mantenimiento/clave-descuento')
                setClaveDescuento(res.data.data.valor)
                setNuevaClave('')
                setMensajeClave('')
              } catch(e) { setMensajeClave('❌ Error al cargar clave') }
            }
          }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'clave' && (
        <div className="flex justify-end mb-4">
          <button onClick={handleNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + Nuevo
          </button>
        </div>
      )}

      {/* Formulario Vendedor */}
      {showForm && tab === 'vendedores' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formVendedor.nombre} onChange={e => setFormVendedor({...formVendedor, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input value={formVendedor.cedula} onChange={e => setFormVendedor({...formVendedor, cedula: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formVendedor.email} onChange={e => setFormVendedor({...formVendedor, email: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={formVendedor.telefono} onChange={e => setFormVendedor({...formVendedor, telefono: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select value={formVendedor.zona_id} onChange={e => setFormVendedor({...formVendedor, zona_id: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin zona</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión %</label>
              <input type="number" step="0.01" value={formVendedor.comision_pct} onChange={e => setFormVendedor({...formVendedor, comision_pct: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input value={formVendedor.usuario} onChange={e => setFormVendedor({...formVendedor, usuario: e.target.value})}
                placeholder="Nombre de usuario para login"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={formVendedor.password} onChange={e => setFormVendedor({...formVendedor, password: e.target.value})}
                placeholder={editando ? 'Dejar vacío para no cambiar' : 'Contraseña de acceso'}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Zona */}
      {showForm && tab === 'zonas' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Zona' : 'Nueva Zona'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formZona.nombre} onChange={e => setFormZona({...formZona, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={formZona.descripcion} onChange={e => setFormZona({...formZona, descripcion: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Chofer */}
      {showForm && tab === 'choferes' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Chofer' : 'Nuevo Chofer'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formChofer.nombre} onChange={e => setFormChofer({...formChofer, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input value={formChofer.cedula} onChange={e => setFormChofer({...formChofer, cedula: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licencia</label>
              <input value={formChofer.licencia} onChange={e => setFormChofer({...formChofer, licencia: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={formChofer.telefono} onChange={e => setFormChofer({...formChofer, telefono: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
              <input value={formChofer.vehiculo} onChange={e => setFormChofer({...formChofer, vehiculo: e.target.value})}
                placeholder="Ej: Toyota Hilux"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input value={formChofer.placa} onChange={e => setFormChofer({...formChofer, placa: e.target.value})}
                placeholder="Ej: A123456"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla Vendedores */}
      {tab === 'vendedores' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Cédula</th>
                <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
                <th className="px-4 py-3 text-left text-gray-600">Zona</th>
                <th className="px-4 py-3 text-left text-gray-600">Comisión</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay vendedores registrados</td></tr>
              ) : vendedores.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.nombre}</td>
                  <td className="px-4 py-3">{v.cedula || '-'}</td>
                  <td className="px-4 py-3">{v.telefono || '-'}</td>
                  <td className="px-4 py-3">{v.zona_nombre || '-'}</td>
                  <td className="px-4 py-3">{v.comision_pct}%</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(v)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(v.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Zonas */}
      {tab === 'zonas' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zonas.length === 0 ? (
                <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">No hay zonas registradas</td></tr>
              ) : zonas.map(z => (
                <tr key={z.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{z.nombre}</td>
                  <td className="px-4 py-3">{z.descripcion || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(z)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(z.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Choferes */}
      {tab === 'choferes' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Cédula</th>
                <th className="px-4 py-3 text-left text-gray-600">Licencia</th>
                <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
                <th className="px-4 py-3 text-left text-gray-600">Vehículo</th>
                <th className="px-4 py-3 text-left text-gray-600">Placa</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {choferes.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay choferes registrados</td></tr>
              ) : choferes.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3">{c.cedula || '-'}</td>
                  <td className="px-4 py-3">{c.licencia || '-'}</td>
                  <td className="px-4 py-3">{c.telefono || '-'}</td>
                  <td className="px-4 py-3">{c.vehiculo || '-'}</td>
                  <td className="px-4 py-3">{c.placa || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(c.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista Clave Descuento */}
      {tab === 'clave' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 max-w-2xl">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">🔐 Clave de Autorización de Descuentos</h3>
            <p className="text-sm text-gray-600">Esta clave permite autorizar la venta de productos por debajo del precio oficial. Comparta esta clave solo con personal autorizado (administradores, contabilidad, gerentes).</p>
          </div>

          {mensajeClave && (
            <div className={`p-3 rounded mb-4 text-sm ${mensajeClave.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {mensajeClave}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-blue-900 mb-2">Clave Actual</label>
            <div className="flex items-center gap-3">
              <input type={mostrarClave ? 'text' : 'password'} value={claveDescuento} readOnly
                className="flex-1 border border-blue-300 rounded px-3 py-2 text-sm bg-white font-mono tracking-wider" />
              <button onClick={() => setMostrarClave(!mostrarClave)}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                {mostrarClave ? '🙈 Ocultar' : '👁️ Ver'}
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-800 mb-3">Cambiar Clave</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Clave (mínimo 4 caracteres)</label>
                <input type="text" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)}
                  placeholder="Escriba la nueva clave..."
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={async () => {
                if (nuevaClave.trim().length < 4) {
                  setMensajeClave('❌ La clave debe tener al menos 4 caracteres')
                  return
                }
                if (!confirm(`¿Cambiar la clave de descuento a "${nuevaClave}"?`)) return
                try {
                  await API.put('/mantenimiento/clave-descuento', { nueva_clave: nuevaClave })
                  setClaveDescuento(nuevaClave)
                  setNuevaClave('')
                  setMensajeClave('✅ Clave actualizada correctamente')
                } catch(e) {
                  setMensajeClave('❌ ' + (e.response?.data?.mensaje || 'Error al actualizar'))
                }
              }}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap">
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}