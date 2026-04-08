import { useState, useEffect, useRef, useMemo } from 'react'
import API from '../services/api'

export default function Facturas() {
  const [tab, setTab] = useState('fecha')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [facturas, setFacturas] = useState([])
  const [facturasFiltradas, setFacturasFiltradas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState('')
  const [facturasZona, setFacturasZona] = useState([])
  const [resumenZona, setResumenZona] = useState(null)
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('')
  const [facturasVendedor, setFacturasVendedor] = useState([])
  const [resumenVendedor, setResumenVendedor] = useState(null)
  const [productosReporte, setProductosReporte] = useState([])
  const [facturasCliente, setFacturasCliente] = useState([])
  const [resumenCliente, setResumenCliente] = useState(null)
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
  const [mostrarImprimir, setMostrarImprimir] = useState(false)
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
      setFacturasFiltradas(f.data.data)
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
    const newItems = items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [e.target.name]: e.target.value }
      if (e.target.name === 'product_id' && e.target.value) {
        const prod = productos.find(p => p.id === e.target.value)
        if (prod) {
          updated.descripcion = prod.nombre
          updated.precio_unitario = prod.precio
          updated.itbis_rate = prod.itbis_rate
        }
      }
      return updated
    })
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
      const id = res.data.data?.id || res.data.id
      console.log('Factura guardada ID:', id, 'Response:', res.data)
      if (id) {
        setFacturaGuardadaId(id)
        setMostrarImprimir(true)
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

  const { subtotal, itbis, total } = useMemo(() => {
    let subtotal = 0, itbis = 0
    items.forEach(item => {
      const s = parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0)
      subtotal += s
      itbis += s * (parseFloat(item.itbis_rate || 0) / 100)
    })
    return { subtotal, itbis, total: subtotal + itbis }
  }, [items])

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
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          onClick={async () => {
            const filtradas = facturas.filter(f => {
              const d = new Date(f.creado_en)
              const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
              if (fechaInicio && fecha < fechaInicio) return false
              if (fechaFin && fecha > fechaFin) return false
              return true
            })
            setFacturasFiltradas(filtradas)
            // Cargar resumen
            try {
              const params = []
              let url = '/invoices/reporte/resumen'
              const qs = []
              if (fechaInicio) qs.push(`fecha_inicio=${fechaInicio}`)
              if (fechaFin) qs.push(`fecha_fin=${fechaFin}`)
              if (qs.length) url += '?' + qs.join('&')
              const res = await API.get(url)
              setResumen(res.data.data)
            } catch (e) { console.error(e) }
          }}>
          Buscar
        </button>
        {resumen && (
          <button
            onClick={() => {
              const printW = window.open('', '_blank')
              const filas = facturasFiltradas.map(f => `
                <tr>
                  <td>${f.ncf || 'BORRADOR'}</td>
                  <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                  <td style="text-align:right">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td style="text-align:center">${f.estado.toUpperCase()}</td>
                  <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                </tr>`).join('')
              printW.document.write(`
                <!DOCTYPE html><html><head><title>Reporte de Ventas</title>
                <style>
                  body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                  h2{color:#1e40af;margin-bottom:4px}
                  p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                  th{background:#1e40af;color:white;padding:8px;text-align:left}
                  td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                  tr:nth-child(even){background:#f8fafc}
                  .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                  .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                  .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                  .resumen-fila.beneficio{font-weight:bold;font-size:14px;color:#16a34a;border-bottom:none}
                  @media print{button{display:none}}
                </style></head><body>
                <h2>Reporte de Ventas</h2>
                <p class="periodo">Período: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}</p>
                <table>
                  <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                  <tbody>${filas}</tbody>
                </table>
                <div class="resumen">
                  <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumen.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumen.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${resumen.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila"><span>Costo Total:</span><span>RD$${resumen.total_costo.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila beneficio"><span>Beneficio Neto:</span><span>RD$${resumen.beneficio_neto.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                </div>
                <script>window.onload=()=>window.print()</script>
                </body></html>`)
              printW.document.close()
            }}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
            🖨️ Imprimir Reporte
          </button>
        )}
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
      {tab === 'zona' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Zona</h3>
          <div className="flex gap-4 items-end mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select value={zonaSeleccionada} onChange={e => setZonaSeleccionada(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                <option value="">-- Seleccionar zona --</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={async () => {
                if (!zonaSeleccionada) return
                const clientesZona = clientes.filter(c => c.zona_id === zonaSeleccionada)
                const idsClientes = clientesZona.map(c => c.id)
                const filtradas = facturas.filter(f => {
                  if (!idsClientes.includes(f.customer_id)) return false
                  const d = new Date(f.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  return true
                })
                setFacturasZona(filtradas)
                const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
                const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
                setResumenZona({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal })
              }}>
              Buscar
            </button>
            {resumenZona && (
              <button onClick={() => {
                const zona = zonas.find(z => z.id === zonaSeleccionada)
                const printW = window.open('', '_blank')
                const filas = facturasZona.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Zona</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas por Zona: ${zona?.nombre || ''}</h2>
                  <p class="periodo">Total de facturas: ${facturasZona.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenZona.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenZona.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${resumenZona.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              🖨️ Imprimir Reporte
            </button>
            )}
          </div>
          {facturasZona.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {facturasZona.map(f => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                    <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {resumenZona && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenZona.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenZona.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">Total: RD${resumenZona.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'producto' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Producto</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select id="prod-vendedor" className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                <option value="">-- Todos --</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                id="prod-cliente-input"
                type="text"
                placeholder="🔍 Buscar cliente..."
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                onChange={e => {
                  document.getElementById('prod-cliente').value = e.target.value
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('prod-cliente-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(c => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = c.nombre
                      div.onmousedown = () => {
                        document.getElementById('prod-cliente-input').value = c.nombre
                        document.getElementById('prod-cliente').value = c.id
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
                onBlur={() => setTimeout(() => { document.getElementById('prod-cliente-list').innerHTML = '' }, 200)}
              />
              <input type="hidden" id="prod-cliente" value="" />
              <div id="prod-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
              <input
                id="prod-producto-input"
                type="text"
                placeholder="-- Todos --"
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                onChange={e => {
                  document.getElementById('prod-producto').value = e.target.value
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('prod-producto-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(p => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = p.nombre
                      div.onmousedown = () => {
                        document.getElementById('prod-producto-input').value = p.nombre
                        document.getElementById('prod-producto').value = p.nombre
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
                onBlur={() => setTimeout(() => { document.getElementById('prod-producto-list').innerHTML = '' }, 200)}
              />
              <input type="hidden" id="prod-producto" value="" />
              <div id="prod-producto-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={async () => {
                const vendedorId = document.getElementById('prod-vendedor').value
                const clienteId = document.getElementById('prod-cliente').value
                const productoNombre = document.getElementById('prod-producto').value
                const qs = []
                if (fechaInicio) qs.push(`fecha_inicio=${fechaInicio}`)
                if (fechaFin) qs.push(`fecha_fin=${fechaFin}`)
                if (vendedorId) qs.push(`vendedor_id=${vendedorId}`)
                if (clienteId) qs.push(`customer_id=${clienteId}`)
                if (productoNombre) qs.push(`producto=${encodeURIComponent(productoNombre)}`)
                let url = '/invoices/reporte/productos'
                if (qs.length) url += '?' + qs.join('&')
                try {
                  const res = await API.get(url)
                  setProductosReporte(res.data.data)
                } catch (e) { console.error(e) }
              }}>
              Buscar
            </button>
            {productosReporte.length > 0 && (
              <button onClick={() => {
                const vendedorNombre = vendedores.find(v => v.id === document.getElementById('prod-vendedor').value)?.nombre || 'Todos'
                const clienteNombre = clientes.find(c => c.id === document.getElementById('prod-cliente').value)?.nombre || 'Todos'
                const printW = window.open('', '_blank')
                const filas = productosReporte.map(p => `
                  <tr>
                    <td>${p.descripcion}</td>
                    <td style="text-align:right">${parseFloat(p.total_cantidad).toFixed(0)}</td>
                    <td style="text-align:right">RD$${parseFloat(p.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right">RD$${parseFloat(p.total_subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right">RD$${parseFloat(p.total_costo).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right;color:#16a34a;font-weight:bold">RD$${parseFloat(p.beneficio).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  </tr>`).join('')
                const totalVenta = productosReporte.reduce((s, p) => s + parseFloat(p.total_venta||0), 0)
                const totalCosto = productosReporte.reduce((s, p) => s + parseFloat(p.total_costo||0), 0)
                const totalBeneficio = productosReporte.reduce((s, p) => s + parseFloat(p.beneficio||0), 0)
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Producto</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    .resumen-fila.beneficio{font-weight:bold;font-size:14px;color:#16a34a;border-bottom:none}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Venta por Producto</h2>
                  <p class="sub">Período: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} | Vendedor: ${vendedorNombre} | Cliente: ${clienteNombre}</p>
                  <table>
                    <thead><tr>
                      <th>Producto</th>
                      <th style="text-align:right">Cant.</th>
                      <th style="text-align:right">P. Unit</th>
                      <th style="text-align:right">Subtotal</th>
                      <th style="text-align:right">Costo</th>
                      <th style="text-align:right">Beneficio</th>
                    </tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${totalVenta.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>Total Costo:</span><span>RD$${totalCosto.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila beneficio"><span>Beneficio Neto:</span><span>RD$${totalBeneficio.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              🖨️ Imprimir Reporte
            </button>
            )}
          </div>
          {productosReporte.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-right text-gray-600">Cant.</th>
                  <th className="px-4 py-3 text-right text-gray-600">P. Unit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Subtotal</th>
                  <th className="px-4 py-3 text-right text-gray-600">Costo</th>
                  <th className="px-4 py-3 text-right text-gray-600 text-green-700">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {productosReporte.map((p, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{p.descripcion}</td>
                    <td className="px-4 py-3 text-right">{parseFloat(p.total_cantidad).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.precio_unitario).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.total_subtotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.total_costo).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">RD${parseFloat(p.beneficio).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'vendedor' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Vendedor</h3>
          <div className="flex gap-4 items-end mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select value={vendedorSeleccionado} onChange={e => setVendedorSeleccionado(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                <option value="">-- Seleccionar vendedor --</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => {
                if (!vendedorSeleccionado) return
                const clientesVendedor = clientes.filter(c => c.vendedor_id === vendedorSeleccionado)
                const idsClientes = clientesVendedor.map(c => c.id)
                const filtradas = facturas.filter(f => {
                  if (!idsClientes.includes(f.customer_id)) return false
                  const d = new Date(f.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  return true
                })
                setFacturasVendedor(filtradas)
                const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
                const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
                setResumenVendedor({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal })
              }}>
              Buscar
            </button>
            {resumenVendedor && (
              <button onClick={() => {
                const vendedor = vendedores.find(v => v.id === vendedorSeleccionado)
                const printW = window.open('', '_blank')
                const filas = facturasVendedor.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Vendedor</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas por Vendedor: ${vendedor?.nombre || ''}</h2>
                  <p class="periodo">Período: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'} — Total facturas: ${facturasVendedor.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenVendedor.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenVendedor.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${resumenVendedor.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              🖨️ Imprimir Reporte
            </button>
            )}
          </div>
          {facturasVendedor.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {facturasVendedor.map(f => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                    <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {resumenVendedor && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenVendedor.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenVendedor.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">Total: RD${resumenVendedor.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'cliente' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Cliente</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                id="cli-cliente-input"
                type="text"
                placeholder="🔍 Buscar cliente..."
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64 w-full"
                onChange={e => {
                  document.getElementById('cli-cliente').value = ''
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('cli-cliente-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(c => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = c.nombre
                      div.onmousedown = () => {
                        document.getElementById('cli-cliente-input').value = c.nombre
                        document.getElementById('cli-cliente').value = c.id
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
                onBlur={() => setTimeout(() => { document.getElementById('cli-cliente-list').innerHTML = '' }, 200)}
              />
              <input type="hidden" id="cli-cliente" value="" />
              <div id="cli-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => {
                const clienteId = document.getElementById('cli-cliente').value
                if (!clienteId) return
                const filtradas = facturas.filter(f => {
                  if (f.customer_id !== clienteId) return false
                  const d = new Date(f.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  return true
                })
                setFacturasCliente(filtradas)
                const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
                const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
                setResumenCliente({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal })
              }}>
              Buscar
            </button>
            {resumenCliente && (
              <button onClick={() => {
                const clienteNombre = document.getElementById('cli-cliente-input').value
                const printW = window.open('', '_blank')
                const filas = facturasCliente.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Cliente</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas: ${clienteNombre}</h2>
                  <p class="periodo">Período: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} — Total facturas: ${facturasCliente.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenCliente.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenCliente.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${resumenCliente.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              🖨️ Imprimir Reporte
            </button>
            )}
          </div>
          {facturasCliente.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {facturasCliente.map(f => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {resumenCliente && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenCliente.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenCliente.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">Total: RD${resumenCliente.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab !== 'fecha' && tab !== 'zona' && tab !== 'vendedor' && tab !== 'producto' && tab !== 'cliente' && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          <p className="text-lg">Módulo en desarrollo...</p>
          <p className="text-sm mt-2">Próximamente disponible</p>
        </div>
      )}

      {/* Modal imprimir */}
      {mostrarImprimir && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir la factura?</p>
            <div className="flex justify-center gap-6">
              <button
                autoFocus
                onClick={() => {
                  const token = sessionStorage.getItem('token')
                  window.open(`https://facturacion-saas-production.up.railway.app/invoices/${facturaGuardadaId}/pdf?token=${token}`, '_blank')
                  setMostrarImprimir(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-no-imprimir')?.focus() }
                  if (e.key === 'Enter') { const token = sessionStorage.getItem('token'); window.open(`https://facturacion-saas-production.up.railway.app/invoices/${facturaGuardadaId}/pdf?token=${token}`, '_blank'); setMostrarImprimir(false) }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
              <button
                id="btn-no-imprimir"
                onClick={() => setMostrarImprimir(false)}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft') { e.preventDefault(); document.querySelector('[autoFocus]')?.focus() }
                  if (e.key === 'Enter') setMostrarImprimir(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
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
                                setItems(prev => prev.map((item, i) => i === index ? {...item, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : item))
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
                                    setItems(prev => prev.map((item, i) => i === index ? {...item, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : item))
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
                      <div className="col-span-2">
                        <input type="text" readOnly
                          value={item.precio_unitario && item.cantidad ? 'RD$' + (parseFloat(item.cantidad||0)*parseFloat(item.precio_unitario||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : ''}
                          placeholder="Subtotal"
                          className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50 text-right font-medium text-gray-700" />
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
                {facturasFiltradas.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay facturas</td></tr>
                ) : (
                  facturasFiltradas.map((f) => (
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