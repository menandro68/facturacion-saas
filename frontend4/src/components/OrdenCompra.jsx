import { useState, useEffect } from 'react'
import API from '../services/api'

export default function OrdenCompra() {
  const [ordenes, setOrdenes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ supplier_id: '', fecha_entrega: '', notas: '' })
  const [items, setItems] = useState([{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])

  const fetchData = async () => {
    try {
      const [ord, prov, prod] = await Promise.all([
        API.get('/purchase-orders'),
        API.get('/suppliers'),
        API.get('/products')
      ])
      setOrdenes(ord.data.data)
      setProveedores(prov.data.data)
      setProductos(prod.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleItemChange = (idx, field, value) => {
    const updated = [...items]
    updated[idx][field] = value
    if (field === 'product_id' && value) {
      const prod = productos.find(p => p.id === value)
      if (prod) {
        updated[idx].descripcion = prod.nombre
        updated[idx].precio_unitario = prod.costo || prod.precio || ''
      }
    }
    setItems(updated)
  }

  const agregarItem = () => {
    setItems([...items, { product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
  }

  const eliminarItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const totalOrden = items.reduce((sum, i) => sum + ((parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_unitario) || 0)), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (items.length === 0 || !items[0].descripcion) {
      setError('Agrega al menos un producto')
      return
    }
 const itemsValidos = items.filter(i => i.descripcion && i.cantidad && i.precio_unitario)
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un producto con descripción, cantidad y precio')
      return
    }
    try {
      await API.post('/purchase-orders', { ...form, items: itemsValidos })
      setShowForm(false)
      setForm({ supplier_id: '', fecha_entrega: '', notas: '' })
      setItems([{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleEstado = async (id, estado) => {
    try {
      await API.put(`/purchase-orders/${id}/estado`, { estado })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta orden?')) return
    try {
      await API.delete(`/purchase-orders/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const estadoColor = (e) => {
    if (e === 'recibida') return 'bg-green-100 text-green-700'
    if (e === 'cancelada') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Órdenes de Compra</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Nueva Orden
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h4 className="text-md font-semibold mb-4">Nueva Orden de Compra</h4>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Sin proveedor --</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Entrega</label>
              <input type="date" value={form.fecha_entrega} onChange={e => setForm({...form, fecha_entrega: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <h5 className="font-medium text-gray-700 mb-2">Productos</h5>
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <select value={item.product_id} onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <input value={item.descripcion} onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción"
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.cantidad} onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                    placeholder="Cant."
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.precio_unitario} onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                    placeholder="Precio"
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => eliminarItem(idx)} className="text-red-500 hover:text-red-700 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-4">
            <button onClick={agregarItem} className="text-blue-600 hover:underline text-sm">+ Agregar línea</button>
            <p className="font-semibold text-gray-800">Total: RD${totalOrden.toLocaleString('es-DO', {minimumFractionDigits: 2})}</p>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar Orden</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Número</th>
              <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
              <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Entrega</th>
              <th className="px-4 py-3 text-left text-gray-600">Total</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay órdenes de compra</td></tr>
            ) : ordenes.map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{o.numero}</td>
                <td className="px-4 py-3">{o.proveedor_nombre || '-'}</td>
                <td className="px-4 py-3">{new Date(o.creado_en).toLocaleDateString()}</td>
                <td className="px-4 py-3">{o.fecha_entrega ? new Date(o.fecha_entrega).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3">RD${parseFloat(o.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(o.estado)}`}>
                    {o.estado.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {o.estado === 'pendiente' && (
                    <button onClick={() => handleEstado(o.id, 'recibida')}
                      className="text-green-600 hover:underline text-xs">Recibida</button>
                  )}
                  <button onClick={() => handleEliminar(o.id)}
                    className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}