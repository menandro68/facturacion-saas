import { useState, useEffect, useRef } from 'react'
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
  const [buscarCliente, setBuscarCliente] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [clienteIndex, setClienteIndex] = useState(-1)
  const buscarClienteRef = useRef(null)
  const buscarProductoRef = useRef(null)
  const buscarProductoRefs = useRef({})
  const cantidadRefs = useRef({})
  const agregarLineaRef = useRef(null)
  const guardarRef = useRef(null)
  const [buscarProducto, setBuscarProducto] = useState({})
  const [mostrarDropdownProducto, setMostrarDropdownProducto] = useState({})
  const [productoIndex, setProductoIndex] = useState({})
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [facturaGuardadaId, setFacturaGuardadaId] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: ''
  })
  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }
  ])

  const [vendedores, setVendedores] = useState([])
  const [zonas, setZonas] = useState([])

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
      API.get('/mantenimiento/vendedores').then(r => setVendedores(r.data.data)).catch(() => {})
      API.get('/mantenimiento/zonas').then(r => setZonas(r.data.data)).catch(() => {})
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
    setMostrarConfirmar(true)
  }

  const handleConfirmarSi = async () => {
    setMostrarConfirmar(false)
    setError('')
    try {
      const res = await API.post('/invoices', { ...form, items, estado: 'emitida' })
      setShowForm(false)
      setForm({ customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: '' })
      setItems([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
      setBuscarCliente('')
      setClienteSeleccionado(null)
      setBuscarProducto({})
      fetchData()
      const imprimir = window.confirm('¿Desea imprimir la factura?')
      if (imprimir) {
        const token = sessionStorage.getItem('token')
        const id = res.data.data?.id
        if (id) window.open(`https://facturacion-saas-production.up.railway.app/invoices/${id}/pdf?token=${token}`, '_blank')
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleConfirmarVolver = () => {
    setMostrarConfirmar(false)
    setTimeout(() => agregarLineaRef.current?.focus(), 100)
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
        <button onClick={() => { setShowForm(true); setTimeout(() => buscarClienteRef.current?.focus(), 100) }}
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

      {/* Modal confirmar guardar */}
      {mostrarConfirmar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desear Grabar Esta Factura?</p>
            <div className="flex justify-center gap-6">
              <button
                autoFocus
                onClick={handleConfirmarSi}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-volver')?.focus() }
                  if (e.key === 'Enter') handleConfirmarSi()
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
              <button
                id="btn-volver"
                onClick={handleConfirmarVolver}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft') { e.preventDefault(); document.querySelector('[autoFocus]')?.focus() }
                  if (e.key === 'Enter') handleConfirmarVolver()
                }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                Volver
              </button>
            </div>
          </div>
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
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      ref={buscarClienteRef}
                      value={buscarCliente}
                   onChange={e => { setBuscarCliente(e.target.value); setMostrarDropdown(e.target.value.length > 0) }}
                      onBlur={() => setTimeout(() => { setMostrarDropdown(false); setClienteIndex(-1) }, 200)}
onKeyDown={e => {
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase()))
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setClienteIndex(i => Math.min(i + 1, filtrados.length))
    setMostrarDropdown(true)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setClienteIndex(i => Math.max(i - 1, -1))
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (clienteIndex === 0) {
      setForm({...form, customer_id: ''}); setBuscarCliente(''); setMostrarDropdown(false); setClienteSeleccionado(null)
    } else if (clienteIndex > 0 && filtrados[clienteIndex - 1]) {
      const c = filtrados[clienteIndex - 1]
      setForm({...form, customer_id: c.id}); setBuscarCliente(c.nombre); setMostrarDropdown(false); setClienteSeleccionado(c)
    }
    setClienteIndex(-1)
    setTimeout(() => buscarProductoRef.current?.focus(), 100)
  } else if (e.key === 'Escape') {
    setMostrarDropdown(false); setClienteIndex(-1)
  }
}}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {mostrarDropdown && (
                      <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                        <div
                          className={`px-3 py-2 text-sm cursor-pointer text-gray-500 ${clienteIndex === 0 ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
onMouseEnter={() => setClienteIndex(0)}
                          onMouseDown={() => {
                                setForm({...form, customer_id: ''})
                                setBuscarCliente('')
                                setMostrarDropdown(false)
                                setClienteSeleccionado(null)
                              }}>
                          Consumidor Final
                        </div>
                        {clientes
                          .filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase()))
                          .map(c => (
                            <div key={c.id}
                              className={`px-3 py-2 text-sm cursor-pointer ${
  clienteIndex === clientes.filter(x => x.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).indexOf(c) + 1
    ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'
}`}
onMouseEnter={() => setClienteIndex(clientes.filter(x => x.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).indexOf(c) + 1)}
                              onMouseDown={() => {
                                setForm({...form, customer_id: c.id})
                                setBuscarCliente(c.nombre)
                                setMostrarDropdown(false)
                                setClienteSeleccionado(c)
                              }}>
                              {c.nombre} {c.telefono ? `- ${c.telefono}` : ''}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info del cliente seleccionado */}
                {clienteSeleccionado && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="font-medium text-gray-600">RNC/Cédula:</span> {clienteSeleccionado.rnc_cedula || '-'}</div>
                    <div><span className="font-medium text-gray-600">Teléfono:</span> {clienteSeleccionado.telefono || '-'}</div>
                    <div><span className="font-medium text-gray-600">Negocio:</span> {clienteSeleccionado.email || '-'}</div>
                    <div><span className="font-medium text-gray-600">Tipo:</span> {clienteSeleccionado.tipo?.replace(/_/g, ' ') || '-'}</div>
                    <div><span className="font-medium text-gray-600">Condiciones:</span> {clienteSeleccionado.condiciones?.replace(/_/g, ' ') || '-'}</div>
                    <div><span className="font-medium text-gray-600">Dirección:</span> {clienteSeleccionado.direccion || '-'}</div>
                    <div><span className="font-medium text-gray-600">Vendedor:</span> {vendedores.find(v => v.id === clienteSeleccionado.vendedor_id)?.nombre || '-'}</div>
                    <div><span className="font-medium text-gray-600">Zona:</span> {zonas.find(z => z.id === clienteSeleccionado.zona_id)?.nombre || '-'}</div>
                  </div>
                )}

                <div className="hidden">
                  <select name="ncf_tipo" value={form.ncf_tipo} onChange={handleFormChange}>
                    <option value="B01">B01 - Consumidor Final</option>
                    <option value="B14">B14 - Régimen Especial</option>
                    <option value="B15">B15 - Gubernamental</option>
                  </select>
                  <input type="date" name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleFormChange} />
                </div>

                {/* Items */}
                <div className="mb-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-3 relative">
                        <input
                          type="text"
                          placeholder="🔍 Buscar producto..."
                          ref={el => { buscarProductoRefs.current[index] = el; if (index === 0) buscarProductoRef.current = el }}
                          value={buscarProducto[index] || ''}
                          onChange={e => {
                            setBuscarProducto(prev => ({...prev, [index]: e.target.value}))
                            setMostrarDropdownProducto(prev => ({...prev, [index]: e.target.value.length > 0}))
                          }}
                          onBlur={() => setTimeout(() => { setMostrarDropdownProducto(prev => ({...prev, [index]: false})); setProductoIndex(prev => ({...prev, [index]: -1})) }, 200)}
                          onKeyDown={e => {
  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase()))
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setProductoIndex(prev => ({...prev, [index]: Math.min((prev[index] ?? -1) + 1, filtrados.length - 1)}))
    setMostrarDropdownProducto(prev => ({...prev, [index]: true}))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setProductoIndex(prev => ({...prev, [index]: Math.max((prev[index] ?? 0) - 1, -1)}))
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const idx = productoIndex[index] ?? -1
    if (idx >= 0 && filtrados[idx]) {
      const p = filtrados[idx]
      const newItems = [...items]
      newItems[index].product_id = p.id
      newItems[index].descripcion = p.nombre
      newItems[index].precio_unitario = p.precio
      newItems[index].itbis_rate = p.itbis_rate
      setItems(newItems)
      setBuscarProducto(prev => ({...prev, [index]: p.nombre}))
      setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
      setProductoIndex(prev => ({...prev, [index]: -1}))
      setTimeout(() => cantidadRefs.current[index]?.focus(), 100)
    }
  } else if (e.key === 'Escape') {
    setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
  }
}}
                          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {mostrarDropdownProducto[index] && (
                          <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                            {productos
                              .filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase()))
                              .map(p => (
                                <div key={p.id}
                                  className={`px-3 py-2 text-sm cursor-pointer ${(productoIndex[index] ?? -1) === productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p) ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                                  onMouseEnter={() => setProductoIndex(prev => ({...prev, [index]: productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p)}))}
                                  onMouseDown={() => {
                                    const newItems = [...items]
                                    newItems[index].product_id = p.id
                                    newItems[index].descripcion = p.nombre
                                    newItems[index].precio_unitario = p.precio
                                    newItems[index].itbis_rate = p.itbis_rate
                                    setItems(newItems)
                                    setBuscarProducto(prev => ({...prev, [index]: p.nombre}))
                                    setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
                                  }}>
                                  {p.nombre} — RD${parseFloat(p.precio).toLocaleString()}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-3">
                        <input name="descripcion" placeholder="Descripción" value={item.descripcion} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm" required />
                      </div>
                      <div className="col-span-2">
                        <input name="cantidad" type="number" placeholder="Cant." value={item.cantidad} onChange={(e) => handleItemChange(index, e)}
                          ref={el => cantidadRefs.current[index] = el}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              agregarLineaRef.current?.focus()
                            }
                          }}
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
                  <div className="flex items-center gap-4 mt-1">
                    <button type="button" ref={agregarLineaRef} onClick={agregarItem}
                      onKeyDown={e => {
                        if (e.key === 'ArrowRight') { e.preventDefault(); guardarRef.current?.focus() }
                        if (e.key === 'Enter') { e.preventDefault(); agregarItem(); setTimeout(() => { const nextIndex = items.length; buscarProductoRefs.current[nextIndex]?.focus() }, 150) }
                      }}
                      className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
                    <button type="submit" ref={guardarRef}
                      onKeyDown={e => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); agregarLineaRef.current?.focus() }
                      }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      Guardar
                    </button>
                  </div>
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