import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '', rnc_cedula: '', email: '', telefono: '', direccion: '', tipo: 'consumidor_final', vendedor_id: '', zona_id: '', condiciones: ''
  })
  const [error, setError] = useState('')
  const [zonas, setZonas] = useState([])
  const [vendedores, setVendedores] = useState([])

  const fetchClientes = async () => {
    try {
      const res = await API.get('/customers')
      setClientes(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
    API.get('/mantenimiento/zonas').then(r => setZonas(r.data.data)).catch(() => {})
    API.get('/mantenimiento/vendedores').then(r => setVendedores(r.data.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleNuevo = () => {
    setForm({ nombre: '', rnc_cedula: '', email: '', telefono: '', direccion: '', tipo: 'consumidor_final', vendedor_id: '', zona_id: '', condiciones: '' })
    setEditando(null)
    setShowForm(true)
    setError('')
  }

  const handleEditar = (cliente) => {
    setForm({
      nombre: cliente.nombre,
      rnc_cedula: cliente.rnc_cedula || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      tipo: cliente.tipo,
      vendedor_id: cliente.vendedor_id || '',
      zona_id: cliente.zona_id || '',
      condiciones: cliente.condiciones || ''
    })
    setEditando(cliente.id)
    setShowForm(true)
    setError('')
  }

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar al cliente "${nombre}"?\n\nEsta accion no se puede deshacer.`)) return
    try {
      const res = await API.delete(`/customers/${id}`)
      alert('✅ Cliente eliminado correctamente')
      fetchClientes()
    } catch (err) {
      // Mostrar el mensaje de error del backend (ej: cliente con deudas pendientes)
      const mensajeError = err.response?.data?.mensaje || 'Error al eliminar el cliente'
      alert(`⚠️ ${mensajeError}`)
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editando) {
        await API.put(`/customers/${editando}`, form)
      } else {
        await API.post('/customers', form)
      }
      setShowForm(false)
      fetchClientes()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando clientes...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RNC/Cédula</label>
              <input name="rnc_cedula" value={form.rnc_cedula} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
              <input name="email" type="text" value={form.email} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="consumidor_final">Consumidor Final</option>
                <option value="credito_fiscal">Crédito Fiscal</option>
                <option value="gubernamental">Gubernamental</option>
                <option value="e31_credito_fiscal_electronico">E31 - Crédito Fiscal Electrónico</option>
                <option value="e32_consumo_electronico">E32 - Consumo Electrónico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select name="vendedor_id" value={form.vendedor_id || ''} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sin asignar --</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select name="zona_id" value={form.zona_id || ''} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sin asignar --</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones</label>
              <select name="condiciones" value={form.condiciones || ''} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sin condición --</option>
                <option value="contado">Contado</option>
                <option value="7_dias">7 Días</option>
                <option value="15_dias">15 Días</option>
                <option value="30_dias">30 Días</option>
                <option value="45_dias">45 Días</option>
                <option value="60_dias">60 Días</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input name="direccion" value={form.direccion} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left text-gray-600">RNC/Cédula</th>
              <th className="px-4 py-3 text-left text-gray-600">Nombre del Negocio</th>
              <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
              <th className="px-4 py-3 text-left text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay clientes registrados</td></tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3">{c.rnc_cedula || '-'}</td>
                  <td className="px-4 py-3">{c.email || '-'}</td>
                  <td className="px-4 py-3">{c.telefono || '-'}</td>
                  <td className="px-4 py-3 capitalize">{c.tipo.replace('_', ' ')}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(c)}
                      className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(c.id, c.nombre)}
                      className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}