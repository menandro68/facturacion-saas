import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '', rnc: '', email: '', telefono: '', direccion: '', contacto: ''
  })
  const [error, setError] = useState('')

  const fetchProveedores = async () => {
    try {
      const res = await API.get('/suppliers')
      setProveedores(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProveedores() }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleNuevo = () => {
    setForm({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', contacto: '' })
    setEditando(null)
    setShowForm(true)
    setError('')
  }

  const handleEditar = (proveedor) => {
    setForm({
      nombre: proveedor.nombre,
      rnc: proveedor.rnc || '',
      email: proveedor.email || '',
      telefono: proveedor.telefono || '',
      direccion: proveedor.direccion || '',
      contacto: proveedor.contacto || ''
    })
    setEditando(proveedor.id)
    setShowForm(true)
    setError('')
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    try {
      await API.delete(`/suppliers/${id}`)
      fetchProveedores()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editando) {
        await API.put(`/suppliers/${editando}`, form)
      } else {
        await API.post('/suppliers', form)
      }
      setShowForm(false)
      fetchProveedores()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando proveedores...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Proveedores</h2>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input name="contacto" value={form.contacto} onChange={handleChange}
                placeholder="Nombre del contacto"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <th className="px-4 py-3 text-left text-gray-600">Email</th>
              <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
              <th className="px-4 py-3 text-left text-gray-600">Contacto</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay proveedores registrados</td></tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.email || '-'}</td>
                  <td className="px-4 py-3">{p.telefono || '-'}</td>
                  <td className="px-4 py-3">{p.contacto || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(p)}
                      className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(p.id)}
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