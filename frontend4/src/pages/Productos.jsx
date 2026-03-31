import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '', descripcion: '', precio: '', itbis_rate: '18', unidad: 'unidad'
  })
  const [error, setError] = useState('')

  const fetchProductos = async () => {
    try {
      const res = await API.get('/products')
      setProductos(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProductos() }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleNuevo = () => {
    setForm({ nombre: '', descripcion: '', precio: '', itbis_rate: '18', unidad: 'unidad' })
    setEditando(null)
    setShowForm(true)
    setError('')
  }

  const handleEditar = (producto) => {
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      itbis_rate: producto.itbis_rate,
      unidad: producto.unidad
    })
    setEditando(producto.id)
    setShowForm(true)
    setError('')
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await API.delete(`/products/${id}`)
      fetchProductos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editando) {
        await API.put(`/products/${editando}`, form)
      } else {
        await API.post('/products', form)
      }
      setShowForm(false)
      fetchProductos()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando productos...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Productos y Servicios</h2>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
              <input name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ITBIS %</label>
              <select name="itbis_rate" value={form.itbis_rate} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="18">18%</option>
                <option value="16">16%</option>
                <option value="0">0% (Exento)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select name="unidad" value={form.unidad} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="unidad">Unidad</option>
                <option value="hora">Hora</option>
                <option value="dia">Día</option>
                <option value="mes">Mes</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
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
              <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
              <th className="px-4 py-3 text-left text-gray-600">Precio</th>
              <th className="px-4 py-3 text-left text-gray-600">ITBIS</th>
              <th className="px-4 py-3 text-left text-gray-600">Unidad</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay productos registrados</td></tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.descripcion || '-'}</td>
                  <td className="px-4 py-3">RD${parseFloat(p.precio).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.itbis_rate}%</td>
                  <td className="px-4 py-3 capitalize">{p.unidad}</td>
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