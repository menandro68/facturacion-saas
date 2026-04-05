import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Facturas() {
  const [tab, setTab] = useState('fecha')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [facturas, setFacturas] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: ''
  })
  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }
  ])

  const fetchData = async () => {
    try {
      const [f, c, p] = await Promise.all([
        API.get('/invoices'),
        API.get('/customers'),
        API.get('/products')
      ])
      setFacturas(f.data.data)
      setClientes(c.data.data)
      setProductos(p.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleItemChange = (index, e) => {
    const newItems = [...items]
    newItems[index][e.target.name] = e.target.value
    if (e.target.name === 'product_id' && e.target.value) {
      const prod = productos.find(p => p.id === e.target.value)
      if (prod) {
        newItems[index].descripcion = prod.nombre
        newItems[index].precio_unitario = prod.precio
        newItems[index].itbis_rate = prod.itbis_rate
      }
    }
    setItems(newItems)
  }

  const agregarItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
  }

  const eliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calcularTotales = () => {
    let subtotal = 0, itbis = 0
    items.forEach(item => {
      const s = parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0)
      subtotal += s
      itbis += s * (parseFloat(item.itbis_rate || 0) / 100)
    })
    return { subtotal, itbis, total: subtotal + itbis }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/invoices', { ...form, items })
      setShowForm(false)
      setForm({ customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: '' })
      setItems([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al crear factura')
    }
  }

  const handleEmitir = async (id) => {
    if (!confirm('¿Emitir esta factura? Se asignará un NCF.')) return
    try {
      await API.put(`/invoices/${id}/emitir`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al emitir')
    }
  }

  const handleAnular = async (id) => {
    if (!confirm('¿Anular esta factura?')) return
    try {
      await API.put(`/invoices/${id}/anular`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al anular')
    }
  }

  const handlePDF = (id) => {
    const token = sessionStorage.getItem('token')
    window.open(`https://facturacion-saas-production.up.railway.app/invoices/${id}/pdf?token=${token}`, '_blank')
  }

  const { subtotal, itbis, total } = calcularTotales()

  const estadoColor = (estado) => {
    if (estado === 'pagada') return 'bg-green-100 text-green-700'
    if (estado === 'emitida') return 'bg-blue-100 text-blue-700'
    if (estado === 'anulada') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const tabsFila1 = [
    { id: 'fecha', label: 'Venta por Fecha' },
    { id: 'zona', label: 'Venta por Zona' },
    { id: 'vendedor', label: 'Venta por Vendedor' },
    { id: 'producto', label: 'Venta por Producto' },
    { id: 'cliente', label: 'Venta por Cliente' },
    { id: 'chofer', label: 'Entregada Chofer' },
    { id: 'relacion_vendedor', label: 'Relacion Vendedor' },
  ]

  const tabsFila2 = [

    { id: 'cobro_vendedor', label: 'Cobro por Vendedor' },
    { id: 'cxc_vendedor', label: 'Cuenta por Cobrar por Vendedor' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'cotizacion', label: 'Cotización' },
    { id: 'nota_credito', label: 'Nota de Crédito' },
  ]
  

  if (loading) return <p className="text-gray-500 p-6">Cargando facturas...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Facturas</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Nueva Factura
        </button>
      </div>

      {/* Filtro de fechas */}
      <div className="flex gap-4 items-end mb-4 bg-white p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Buscar
        </button>
      </div>

      {/* Tabs fila 1 */}
      <div className="flex gap-2 border-b mb-0">
        {tabsFila1.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabs fila 2 */}
      <div className="flex gap-2 border-b mb-6">
        {tabsFila2.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {tab !== 'fecha' && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          <p className="text-lg">Módulo en desarrollo...</p>
          <p className="text-sm mt-2">Próximamente disponible</p>
        </div>
      )}

      {tab === 'fecha' && (
        <>
          {/* Formulario */}
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Nueva Factura</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <select name="customer_id" value={form.customer_id} onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Consumidor Final</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo NCF</label>
                    <select name="ncf_tipo" value={form.ncf_tipo} onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="B01">B01 - Consumidor Final</option>
                      <option value="B14">B14 - Régimen Especial</option>
                      <option value="B15">B15 - Gubernamental</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                    <input type="date" name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Items</label>
                    <button type="button" onClick={agregarItem}
                      className="text-blue-600 text-sm hover:underline">+ Agregar item</button>
                  </div>
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-3">
                        <select name="product_id" value={item.product_id} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm">
                          <option value="">Seleccionar producto</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input name="descripcion" placeholder="Descripción" value={item.descripcion} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm" required />
                      </div>
                      <div className="col-span-2">
                        <input name="cantidad" type="number" placeholder="Cant." value={item.cantidad} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm" min="1" required />
                      </div>
                      <div className="col-span-2">
                        <input name="precio_unitario" type="number" placeholder="Precio" value={item.precio_unitario} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm" required />
                      </div>
                      <div className="col-span-1">
                        <select name="itbis_rate" value={item.itbis_rate} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm">
                          <option value="18">18%</option>
                          <option value="16">16%</option>
                          <option value="0">0%</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {items.length > 1 && (
                          <button type="button" onClick={() => eliminarItem(index)}
                            className="text-red-500 hover:text-red-700 text-lg">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="flex justify-end mb-4">
                  <div className="text-sm text-right">
                    <p className="text-gray-600">Subtotal: <span className="font-medium">RD${subtotal.toFixed(2)}</span></p>
                    <p className="text-gray-600">ITBIS: <span className="font-medium">RD${itbis.toFixed(2)}</span></p>
                    <p className="text-lg font-bold text-gray-800">Total: RD${total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    Guardar 
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
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay facturas</td></tr>
                ) : (
                  facturas.map((f) => (
                    <tr key={f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                      <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3">RD${parseFloat(f.total).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>
                          {f.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString()}</td>
                      <td className="px-4 py-3 flex gap-2 flex-wrap">
                        {f.estado === 'borrador' && (
                          <button onClick={() => handleEmitir(f.id)}
                            className="text-blue-600 hover:underline text-xs">Emitir</button>
                        )}
                        {f.estado !== 'anulada' && (
                          <button onClick={() => handleAnular(f.id)}
                            className="text-red-500 hover:underline text-xs">Anular</button>
                        )}
                        {f.estado !== 'borrador' && (
                          <button onClick={() => handlePDF(f.id)}
                            className="text-green-600 hover:underline text-xs">PDF</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}