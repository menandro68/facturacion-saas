import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '', precio: '', costo: '', itbis_rate: '18', unidad: 'unidad', comision_vendedor: '', beneficio: '', suplidor: '', stock_minimo: '', stock_maximo: ''
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
    const { name, value } = e.target
    const updated = { ...form, [name]: value }

// Auto-calcular precio de venta en función de costo y % beneficio
    if (name === 'beneficio' || name === 'costo') {
      const costo = parseFloat(name === 'costo' ? value : updated.costo) || 0
      const beneficio = parseFloat(name === 'beneficio' ? value : updated.beneficio) || 0
      if (costo > 0 && beneficio > 0) {
        updated.precio = (costo + (costo * beneficio / 100)).toFixed(2)
      }
    }

    // Auto-calcular % beneficio en función de precio de venta y costo
    if (name === 'precio' || (name === 'costo' && updated.precio)) {
      const costo = parseFloat(name === 'costo' ? value : updated.costo) || 0
      const precio = parseFloat(name === 'precio' ? value : updated.precio) || 0
      if (costo > 0 && precio > 0 && precio > costo) {
        updated.beneficio = (((precio - costo) / costo) * 100).toFixed(2)
      }
    }

    setForm(updated)
  }

  const handleNuevo = () => {
    setForm({ codigo: '', nombre: '', descripcion: '', precio: '', costo: '', itbis_rate: '18', unidad: 'unidad', comision_vendedor: '', beneficio: '', suplidor: '', stock_minimo: '', stock_maximo: '' })
    setEditando(null)
    setShowForm(true)
    setError('')
  }

  const handleEditar = (producto) => {
    setForm({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      costo: producto.costo || '',
      itbis_rate: producto.itbis_rate,
      unidad: producto.unidad,
      comision_vendedor: producto.comision_vendedor || '',
      beneficio: producto.beneficio || '',
      suplidor: producto.suplidor || '',
      stock_minimo: producto.stock_minimo || '',
      stock_maximo: producto.stock_maximo || ''
    })
    setEditando(producto.id)
    setShowForm(true)
    setError('')
  }

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar el articulo "${nombre}"?\n\nEsta accion no se puede deshacer.`)) return
    try {
      await API.delete(`/products/${id}`)
      alert('✅ Articulo eliminado correctamente')
      fetchProductos()
    } catch (err) {
      const mensajeError = err.response?.data?.mensaje || 'Error al eliminar el articulo'
      alert(`⚠️ ${mensajeError}`)
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
        <h2 className="text-xl font-bold text-gray-800">Articulos</h2>
        <button
          onClick={handleNuevo}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Nuevo Articulo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Articulos' : 'Nuevo Producto'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
         <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault() }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input name="codigo" value={form.codigo || ''} onChange={handleChange}
                placeholder="Código del Articulo"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Articulo *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                placeholder="Descripción"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta *</label>
              <input name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
              <input name="costo" type="number" step="0.01" value={form.costo} onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">% del Vendedor</label>
              <input name="comision_vendedor" type="number" step="0.01" min="0" max="100" value={form.comision_vendedor || ''} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">% de Beneficio</label>
              <input name="beneficio" type="number" step="0.01" min="0" max="100" value={form.beneficio || ''} onChange={handleChange}
                placeholder="0.00"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suplidor</label>
              <input name="suplidor" value={form.suplidor || ''} onChange={handleChange}
                placeholder="Nombre del suplidor"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
              <input name="stock_minimo" type="number" step="1" min="0" value={form.stock_minimo || ''} onChange={handleChange}
                placeholder="0"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
              <input name="stock_maximo" type="number" step="1" min="0" value={form.stock_maximo || ''} onChange={handleChange}
                placeholder="0"
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Código</th>
              <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left text-gray-600">% Beneficio</th>
              <th className="px-4 py-3 text-left text-gray-600">Precio</th>
              <th className="px-4 py-3 text-left text-gray-600">Costo</th>
              <th className="px-4 py-3 text-left text-gray-600">ITBIS</th>
              <th className="px-4 py-3 text-left text-gray-600">% Vendedor</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay productos registrados</td></tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{p.codigo || '-'}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.beneficio ? `${p.beneficio}%` : '-'}</td>
                  <td className="px-4 py-3">RD${parseFloat(p.precio).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.costo ? `RD$${parseFloat(p.costo).toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3">{p.itbis_rate}%</td>
                  <td className="px-4 py-3">{p.comision_vendedor ? `${p.comision_vendedor}%` : '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(p)}
                      className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(p.id, p.nombre)}
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