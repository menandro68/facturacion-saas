import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function SuperAdmin() {
  const [logueado, setLogueado] = useState(!!localStorage.getItem('super_admin_token'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [showUsuariosModal, setShowUsuariosModal] = useState(false)
  const [usuariosData, setUsuariosData] = useState(null)
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [tenantSeleccionado, setTenantSeleccionado] = useState(null)
  const [form, setForm] = useState({
    nombre: '', rnc: '', email: '', telefono: '', direccion: '',
    admin_username: '', admin_password: '', admin_nombre: ''
  })

  const API = axios.create({
    baseURL: API_URL + '/super-admin',
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('super_admin_token')
    }
  })

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const r = await API.get('/tenants')
      setTenants(r.data.data)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('super_admin_token')
        setLogueado(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (logueado) fetchTenants()
  }, [logueado])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await axios.post(API_URL + '/super-admin/login', { username, password })
      localStorage.setItem('super_admin_token', r.data.token)
      setLogueado(true)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de login')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token')
    setLogueado(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingTenant) {
        await API.put('/tenants/' + editingTenant.id, {
          nombre: form.nombre, rnc: form.rnc, email: form.email,
          telefono: form.telefono, direccion: form.direccion
        })
      } else {
        await API.post('/tenants', form)
      }
      setShowForm(false)
      setEditingTenant(null)
      setForm({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', admin_username: '', admin_password: '', admin_nombre: '' })
      fetchTenants()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleToggleEstado = async (tenant) => {
    const nuevoEstado = tenant.estado === 'activo' ? 'suspendido' : 'activo'
    if (!confirm(`¿Seguro que quieres ${nuevoEstado === 'activo' ? 'ACTIVAR' : 'SUSPENDER'} a "${tenant.nombre}"?`)) return
    try {
      await API.put('/tenants/' + tenant.id + '/estado', { estado: nuevoEstado })
      fetchTenants()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error')
    }
  }

  const handleVerUsuarios = async (tenant) => {
    setTenantSeleccionado(tenant)
    setShowUsuariosModal(true)
    setUsuariosLoading(true)
    try {
      const r = await API.get('/tenants/' + tenant.id + '/usuarios')
      setUsuariosData(r.data.data)
    } catch (err) {
      alert('Error al cargar usuarios')
    } finally {
      setUsuariosLoading(false)
    }
  }

  const handleEliminar = async (tenant) => {
    if (!confirm(`⚠️ ATENCIÓN ⚠️\n\n¿Seguro que quieres ELIMINAR PERMANENTEMENTE a "${tenant.nombre}"?\n\nEsto borrará TODOS sus datos:\n- Usuarios\n- Clientes\n- Facturas\n- Productos\n- Inventario\n\nEsta accion NO SE PUEDE DESHACER.`)) return
    if (!confirm(`Esta es la ULTIMA confirmacion. ¿Realmente eliminar "${tenant.nombre}"?`)) return
    try {
      await API.delete('/tenants/' + tenant.id)
      alert('✅ Empresa eliminada correctamente')
      fetchTenants()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al eliminar')
    }
  }

  const handleEdit = (tenant) => {
    setEditingTenant(tenant)
    setForm({
      nombre: tenant.nombre, rnc: tenant.rnc || '', email: tenant.email,
      telefono: tenant.telefono || '', direccion: tenant.direccion || '',
      admin_username: '', admin_password: '', admin_nombre: ''
    })
    setShowForm(true)
  }

  // PANTALLA DE LOGIN
  if (!logueado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">🔒 Super Admin</h1>
            <p className="text-sm text-gray-500 mt-2">Panel de Control - Squid Apps RD</p>
          </div>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-700" />
            </div>
            <button type="submit"
              className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 font-semibold">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // PANEL PRINCIPAL
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">🔒 Panel Super Admin — Squid Apps RD</h1>
        <button onClick={handleLogout}
          className="bg-red-600 px-4 py-2 rounded text-sm hover:bg-red-700">Cerrar Sesión</button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Empresas (Tenants)</h2>
            <p className="text-sm text-gray-500">Total: {tenants.length} | Activos: {tenants.filter(t => t.estado === 'activo').length} | Suspendidos: {tenants.filter(t => t.estado !== 'activo').length}</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingTenant(null); setForm({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', admin_username: '', admin_password: '', admin_nombre: '' }) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            ➕ Nueva Empresa
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-auto">
              <h3 className="text-lg font-semibold mb-4">{editingTenant ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Empresa *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RNC</label>
                  <input type="text" value={form.rnc} onChange={e => setForm({...form, rnc: e.target.value})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Empresa *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                {!editingTenant && (
                  <>
                    <div className="md:col-span-2 mt-2 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Usuario Administrador de la Empresa</h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                    <input type="text" value={form.admin_username} onChange={e => setForm({...form, admin_username: e.target.value})} required
                        className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                      <input type="text" value={form.admin_password} onChange={e => setForm({...form, admin_password: e.target.value})} required
                        className="w-full border rounded px-3 py-2" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Admin (opcional)</label>
                      <input type="text" value={form.admin_nombre} onChange={e => setForm({...form, admin_nombre: e.target.value})}
                        className="w-full border rounded px-3 py-2" />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 flex gap-3 justify-end mt-4">
                  <button type="button" onClick={() => { setShowForm(false); setEditingTenant(null); setError('') }}
                    className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editingTenant ? 'Guardar' : 'Crear Empresa'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Cargando...</p>
          ) : tenants.length === 0 ? (
            <p className="p-6 text-center text-gray-400">No hay empresas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">RNC</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">Usuarios</th>
                  <th className="px-4 py-3 text-center">Facturas</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.rnc || '-'}</td>
                    <td className="px-4 py-3 text-xs">{t.email}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-semibold text-blue-700">{t.total_usuarios}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        A:{t.total_admins} | O:{t.total_operadores} | V:{t.total_vendedores}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{t.total_facturas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${t.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.estado === 'activo' ? '🟢 ACTIVO' : '🔴 SUSPENDIDO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEdit(t)}
                          className="text-blue-600 hover:underline text-xs">✏️ Editar</button>
                        <button onClick={() => handleToggleEstado(t)}
                          className={`text-xs hover:underline ${t.estado === 'activo' ? 'text-red-600' : 'text-green-600'}`}>
                          {t.estado === 'activo' ? '🔴 Suspender' : '🟢 Activar'}
                        </button>
                        <button onClick={() => handleVerUsuarios(t)}
                          className="text-xs hover:underline text-purple-600">
                          👥 Ver Usuarios
                        </button>
                        <button onClick={() => handleEliminar(t)}
                          className="text-xs hover:underline text-red-700 font-semibold">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL VER USUARIOS */}
      {showUsuariosModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">👥 Usuarios de {tenantSeleccionado?.nombre}</h3>
                <p className="text-xs text-gray-500 mt-1">Total: {tenantSeleccionado?.total_usuarios} usuarios facturables</p>
              </div>
              <button onClick={() => { setShowUsuariosModal(false); setUsuariosData(null); setTenantSeleccionado(null) }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold">✕</button>
            </div>

            {usuariosLoading ? (
              <p className="text-center py-6 text-gray-500">Cargando...</p>
            ) : usuariosData ? (
              <div className="space-y-4">
                {/* ADMINS */}
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">🔑 Administradores ({usuariosData.admins.length})</h4>
                  {usuariosData.admins.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay administradores</p>
                  ) : (
                    <table className="w-full text-sm border">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-left">Usuario/Email</th>
                          <th className="px-3 py-2 text-left">Rol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosData.admins.map(u => (
                          <tr key={u.id} className="border-t">
                            <td className="px-3 py-2">{u.nombre}</td>
                            <td className="px-3 py-2 text-xs">{u.email?.replace('@empresa.local', '') || '-'}</td>
                            <td className="px-3 py-2 text-xs">{u.rol}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* OPERADORES */}
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">💼 Operadores ({usuariosData.operadores.length})</h4>
                  {usuariosData.operadores.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay operadores</p>
                  ) : (
                    <table className="w-full text-sm border">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-left">Usuario</th>
                          <th className="px-3 py-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosData.operadores.map(u => (
                          <tr key={u.id} className="border-t">
                            <td className="px-3 py-2">{u.nombre}</td>
                            <td className="px-3 py-2 text-xs">{u.username}</td>
                            <td className="px-3 py-2 text-center text-xs">
                              {u.activo ? <span className="text-green-600">✅ Activo</span> : <span className="text-red-600">❌ Inactivo</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* VENDEDORES */}
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">🏃 Vendedores ({usuariosData.vendedores.length})</h4>
                  {usuariosData.vendedores.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No hay vendedores</p>
                  ) : (
                    <table className="w-full text-sm border">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-left">Cédula</th>
                          <th className="px-3 py-2 text-left">Teléfono</th>
                          <th className="px-3 py-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosData.vendedores.map(u => (
                          <tr key={u.id} className="border-t">
                            <td className="px-3 py-2">{u.nombre}</td>
                            <td className="px-3 py-2 text-xs font-mono">{u.cedula || '-'}</td>
                            <td className="px-3 py-2 text-xs">{u.telefono || '-'}</td>
                            <td className="px-3 py-2 text-center text-xs">
                              {u.estado === 'activo' ? <span className="text-green-600">✅ Activo</span> : <span className="text-red-600">❌ Inactivo</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}