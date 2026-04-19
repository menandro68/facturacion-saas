import { useState, useEffect } from 'react'
import API from '../services/api'

export default function CuentasPagar() {
  const [cuentas, setCuentas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAbono, setShowAbono] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('cuentas')
  const [form, setForm] = useState({
    supplier_id: '', descripcion: '', monto_total: '', fecha_vencimiento: '', notas: ''
  })
  const [abonoMonto, setAbonoMonto] = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroDias, setFiltroDias] = useState('30')
  const [diasBusqueda, setDiasBusqueda] = useState(null)
  const [ordenes, setOrdenes] = useState([])
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
  const [montoPagoOrden, setMontoPagoOrden] = useState('')
  const [metodoPagoOrden, setMetodoPagoOrden] = useState('efectivo')
  const [loadingPago, setLoadingPago] = useState(false)

  const fetchData = async () => {
    try {
      const [c, res, prov, ord] = await Promise.all([
        API.get('/accounts-payable'),
        API.get('/accounts-payable/resumen'),
        API.get('/suppliers'),
        API.get('/purchase-orders')
      ])
      const cuentasData = c.data.data
      const ordenesData = ord.data.data || []
      setCuentas(cuentasData)
      setProveedores(prov.data.data)
      setOrdenes(ordenesData)

      // Calcular resumen combinado: cuentas por pagar + órdenes de compra pendientes
      const resumenCxP = res.data.data
      const totalOrdenesTotal = ordenesData.reduce((s, o) => s + parseFloat(o.total || 0), 0)
      const totalOrdenesPagado = ordenesData.reduce((s, o) => s + parseFloat(o.monto_pagado || 0), 0)
      const totalOrdenesPendiente = totalOrdenesTotal - totalOrdenesPagado
      const ordenesVencidas = 0

      // Contar solo órdenes pendientes de pago (no PAGADA)
      const ordenesPendientesCount = ordenesData.filter(o => (o.estado_pago || 'pendiente') !== 'pagada').length

      setResumen({
        total_cuentas: ordenesPendientesCount,
        total_pendiente: parseFloat(resumenCxP?.total_pendiente || 0) + totalOrdenesPendiente,
        total_pagado: parseFloat(resumenCxP?.total_pagado || 0) + totalOrdenesPagado,
        total_vencidas: parseInt(resumenCxP?.total_vencidas || 0) + ordenesVencidas
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Refresh automático cuando la pestaña vuelve a ser visible
    // (estándar profesional: Gmail, Notion, Linear)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    // Refresh cuando la ventana recibe foco
    const handleFocus = () => {
      fetchData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/accounts-payable', form)
      setShowForm(false)
      setForm({ supplier_id: '', descripcion: '', monto_total: '', fecha_vencimiento: '', notas: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleAbono = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.put(`/accounts-payable/${showAbono}/abono`, { monto: abonoMonto })
      setShowAbono(null)
      setAbonoMonto('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar pago')
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return
    try {
      await API.delete(`/accounts-payable/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const estadoColor = (estado) => {
    if (estado === 'pagada') return 'bg-green-100 text-green-700'
    if (estado === 'vencida') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const imprimir = (titulo, contenido) => {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>${titulo}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
    h2{color:#1e40af;margin-bottom:4px}p.sub{color:#64748b;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#1e40af;color:white;padding:7px 8px;text-align:left}
    td{padding:6px 8px;border:1px solid #cbd5e1}
    tr:nth-child(even){background:#f8fafc}
    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap}
    .card{text-align:center;min-width:120px}.card p{margin:0}.card .val{font-size:18px;font-weight:bold}
    @media print{button{display:none}}</style></head><body>${contenido}
    <script>window.onload=()=>window.print()<\/script></body></html>`)
    w.document.close()
  }

  const hoy = new Date()

  // Reporte 1: Por vencimiento (incluye cuentas por pagar + ordenes de compra)
  // Solo filtra cuando el usuario presiona el boton Buscar (diasBusqueda !== null)
  const cuentasPorVencer = diasBusqueda === null ? [] : cuentas.filter(c => {
    if (c.estado === 'pagada') return false
    if (!c.fecha_vencimiento) return false
    const venc = new Date(c.fecha_vencimiento)
    const dias = Math.ceil((venc - hoy) / (1000*60*60*24))
    return dias >= 0 && dias <= parseInt(diasBusqueda)
  }).sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))

  // Ordenes de compra proximas a vencer (por fecha_vencimiento_pago)
  const ordenesPorVencer = diasBusqueda === null ? [] : ordenes.filter(o => {
    if ((o.estado_pago || 'pendiente') === 'pagada') return false
    if (!o.fecha_vencimiento_pago) return false
    const venc = new Date(o.fecha_vencimiento_pago)
    const dias = Math.ceil((venc - hoy) / (1000*60*60*24))
    return dias >= 0 && dias <= parseInt(diasBusqueda)
  }).sort((a, b) => new Date(a.fecha_vencimiento_pago) - new Date(b.fecha_vencimiento_pago))

  // Reporte 2: Por proveedor
  const porProveedor = proveedores.map(p => {
    const cxp = cuentas.filter(c => c.supplier_id === p.id)
    const total = cxp.reduce((s, c) => s + parseFloat(c.monto_total || 0), 0)
    const pagado = cxp.reduce((s, c) => s + parseFloat(c.monto_pagado || 0), 0)
    const pendiente = cxp.reduce((s, c) => s + parseFloat(c.monto_pendiente || 0), 0)
    return { ...p, total, pagado, pendiente, cantidad: cxp.length }
  }).filter(p => p.cantidad > 0).sort((a, b) => b.pendiente - a.pendiente)

  // Reporte 3: Pagos realizados
  const pagosRealizados = cuentas.filter(c => {
    if (parseFloat(c.monto_pagado) <= 0) return false
    if (filtroDesde && new Date(c.actualizado_en) < new Date(filtroDesde)) return false
    if (filtroHasta && new Date(c.actualizado_en) > new Date(filtroHasta + 'T23:59:59')) return false
    if (filtroProveedor && !c.proveedor_nombre?.toLowerCase().includes(filtroProveedor.toLowerCase())) return false
    return true
  })

  // Reporte 4: Vencidas
  const cuentasVencidas = cuentas.filter(c => {
    if (c.estado === 'pagada') return false
    if (!c.fecha_vencimiento) return false
    return new Date(c.fecha_vencimiento) < hoy
  }).sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))

  if (loading) return <p className="text-gray-500 p-6">Cargando cuentas por pagar...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Cuentas por Pagar</h2>
        {/* Botón Actualizar oculto - refresh automático al pagar y al volver a la pestaña */}
        <div className="flex gap-2">
          <button onClick={() => imprimir('Resumen Cuentas por Pagar', `
            <h2>Resumen General - Cuentas por Pagar</h2>
            <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
            <div class="resumen">
              <div class="card"><p>Total Cuentas</p><p class="val" style="color:#1e40af">${resumen?.total_cuentas || 0}</p></div>
              <div class="card"><p>Total Pendiente</p><p class="val" style="color:#ea580c">RD$${parseFloat(resumen?.total_pendiente || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
              <div class="card"><p>Total Pagado</p><p class="val" style="color:#16a34a">RD$${parseFloat(resumen?.total_pagado || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
              <div class="card"><p>Vencidas</p><p class="val" style="color:#dc2626">${resumen?.total_vencidas || 0}</p></div>
            </div>
          `)}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm">
            🖨️ Imprimir
          </button>
          {/* Botón + Nueva Cuenta oculto */}
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Cuentas</p>
            <p className="text-2xl font-bold text-blue-600">{resumen.total_cuentas}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Pendiente</p>
            <p className="text-2xl font-bold text-orange-500">RD${parseFloat(resumen.total_pendiente || 0).toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="text-2xl font-bold text-green-600">RD${parseFloat(resumen.total_pagado || 0).toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Vencidas</p>
            <p className="text-2xl font-bold text-red-600">{resumen.total_vencidas}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 flex-wrap">
        {[
          { id: 'cuentas', label: '📋 Cuentas' },
          { id: 'vencimiento', label: '⏰ Por Vencer' },
          { id: 'proveedor', label: '🏭 Por Proveedor' },
          { id: 'pagos', label: '✅ Pagos Realizados' },
          { id: 'vencidas', label: '🔴 Vencidas' },
          { id: 'estado_cuenta', label: '📊 Estado por Proveedor' },
          { id: 'pagar_orden', label: '🧾 Pagar Orden' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: CUENTAS */}
      {tab === 'cuentas' && (
        <>
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Nueva Cuenta por Pagar</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select name="supplier_id" value={form.supplier_id} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                  <input name="monto_total" type="number" step="0.01" value={form.monto_total} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <input name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <input name="notas" value={form.notas} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar</button>
                </div>
              </form>
            </div>
          )}
          {showAbono && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Registrar Pago</h3>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleAbono} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto del Pago *</label>
                    <input type="number" step="0.01" value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)} required
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAbono(null); setError('') }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Registrar Pago</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div className="flex justify-end mb-3">
            <button onClick={() => imprimir('Cuentas por Pagar', `
              <h2>Cuentas por Pagar</h2>
              <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
              <table><thead><tr><th>Proveedor</th><th>Descripción</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>${cuentas.map(c => `<tr><td>${c.proveedor_nombre||'-'}</td><td>${c.descripcion}</td><td>RD$${parseFloat(c.monto_total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td>RD$${parseFloat(c.monto_pagado).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td>RD$${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td>${c.fecha_vencimiento?new Date(c.fecha_vencimiento).toLocaleDateString('es-DO'):'-'}</td><td>${c.estado.toUpperCase()}</td></tr>`).join('')}</tbody></table>
            `)}
              className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
              🖨️ Imprimir
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-gray-600">Pagado</th>
                  <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Vence Pago</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado Pago</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.filter(o => (o.estado_pago || 'pendiente') !== 'pagada').length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay cuentas por pagar</td></tr>
                ) : ordenes.filter(o => (o.estado_pago || 'pendiente') !== 'pagada').map(o => {
                  const pagado = parseFloat(o.monto_pagado || 0)
                  const total = parseFloat(o.total || 0)
                  const pendiente = total - pagado
                  const estadoPago = o.estado_pago || 'pendiente'
                  return (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium">{o.numero}</td>
                      <td className="px-4 py-3">{o.proveedor_nombre || '-'}</td>
                      <td className="px-4 py-3 text-right">RD${total.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right text-green-600">RD${pagado.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">RD${pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3">{o.fecha_vencimiento_pago ? new Date(o.fecha_vencimiento_pago).toLocaleDateString('es-DO') : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${estadoPago === 'parcial' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                          {estadoPago.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setOrdenSeleccionada(o); setMontoPagoOrden(pendiente.toFixed(2)); setMetodoPagoOrden('efectivo') }}
                          className="text-blue-600 hover:underline text-xs font-medium">
                          💳 Pagar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB: POR VENCER */}
      {tab === 'vencimiento' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximos a vencer en</label>
              <select value={filtroDias} onChange={e => setFiltroDias(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="60">60 días</option>
                <option value="90">90 días</option>
              </select>
            </div>
            <button onClick={() => setDiasBusqueda(filtroDias)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              🔍 Buscar
            </button>
            <button onClick={() => imprimir('Cuentas por Vencer', `
              <h2>Cuentas por Vencer en ${filtroDias} días</h2>
              <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
              <table><thead><tr><th>Proveedor</th><th>Descripción</th><th>Pendiente</th><th>Vencimiento</th><th>Días</th></tr></thead>
              <tbody>${cuentasPorVencer.map(c => {
                const dias = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / (1000*60*60*24))
                return `<tr><td>${c.proveedor_nombre||'-'}</td><td>${c.descripcion}</td><td>RD$${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td>${new Date(c.fecha_vencimiento).toLocaleDateString('es-DO')}</td><td style="${dias<=0?'color:red;font-weight:bold':dias<=7?'color:orange':'color:green'}">${dias<=0?'VENCIDA':dias+' días'}</td></tr>`
              }).join('')}</tbody></table>
              <p><strong>Total pendiente: RD$${cuentasPorVencer.reduce((s,c)=>s+parseFloat(c.monto_pendiente||0),0).toLocaleString('es-DO',{minimumFractionDigits:2})}</strong></p>
            `)}
              className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
              🖨️ Imprimir
            </button>
          </div>
          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Cuentas: <span className="font-bold">{cuentasPorVencer.length + ordenesPorVencer.length}</span> — Total Pendiente: <span className="font-bold text-orange-600">RD${(cuentasPorVencer.reduce((s,c)=>s+parseFloat(c.monto_pendiente||0),0) + ordenesPorVencer.reduce((s,o)=>s+(parseFloat(o.total||0)-parseFloat(o.monto_pagado||0)),0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                <th className="px-4 py-3 text-center text-gray-600">Días</th>
              </tr>
            </thead>
            <tbody>
              {cuentasPorVencer.length === 0 && ordenesPorVencer.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay cuentas próximas a vencer</td></tr>
              ) : (
                <>
                  {cuentasPorVencer.map(c => {
                    const dias = Math.ceil((new Date(c.fecha_vencimiento) - hoy) / (1000*60*60*24))
                    return (
                      <tr key={`cxp-${c.id}`} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{c.proveedor_nombre || '-'}</td>
                        <td className="px-4 py-3">{c.descripcion}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">RD${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3">{new Date(c.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                        <td className={`px-4 py-3 text-center font-bold ${dias <= 0 ? 'text-red-600' : dias <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                          {dias <= 0 ? 'VENCIDA' : `${dias} días`}
                        </td>
                      </tr>
                    )
                  })}
                  {ordenesPorVencer.map(o => {
                    const dias = Math.ceil((new Date(o.fecha_vencimiento_pago) - hoy) / (1000*60*60*24))
                    const pendiente = parseFloat(o.total||0) - parseFloat(o.monto_pagado||0)
                    return (
                      <tr key={`oc-${o.id}`} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{o.proveedor_nombre || '-'}</td>
                        <td className="px-4 py-3">📦 Orden {o.numero}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">RD${pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3">{new Date(o.fecha_vencimiento_pago).toLocaleDateString('es-DO')}</td>
                        <td className={`px-4 py-3 text-center font-bold ${dias <= 0 ? 'text-red-600' : dias <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                          {dias <= 0 ? 'VENCIDA' : `${dias} días`}
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: POR PROVEEDOR */}
      {tab === 'proveedor' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end mb-4">
            <button onClick={() => imprimir('CxP por Proveedor', `
              <h2>Cuentas por Pagar por Proveedor</h2>
              <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
              <table><thead><tr><th>Proveedor</th><th>Cuentas</th><th>Total</th><th>Pagado</th><th>Pendiente</th></tr></thead>
              <tbody>${porProveedor.map(p=>`<tr><td>${p.nombre}</td><td style="text-align:center">${p.cantidad}</td><td style="text-align:right">RD$${p.total.toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td style="text-align:right">RD$${p.pagado.toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td style="text-align:right;font-weight:bold;color:#ea580c">RD$${p.pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody></table>
              <p><strong>Total Pendiente General: RD$${porProveedor.reduce((s,p)=>s+p.pendiente,0).toLocaleString('es-DO',{minimumFractionDigits:2})}</strong></p>
            `)}
              className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
              🖨️ Imprimir
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                <th className="px-4 py-3 text-center text-gray-600">Cuentas</th>
                <th className="px-4 py-3 text-right text-gray-600">Total</th>
                <th className="px-4 py-3 text-right text-gray-600">Pagado</th>
                <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {porProveedor.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay datos</td></tr>
              ) : porProveedor.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-center">{p.cantidad}</td>
                  <td className="px-4 py-3 text-right">RD${p.total.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-right text-green-600">RD${p.pagado.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">RD${p.pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-center">{porProveedor.reduce((s,p)=>s+p.cantidad,0)}</td>
                <td className="px-4 py-3 text-right">RD${porProveedor.reduce((s,p)=>s+p.total,0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                <td className="px-4 py-3 text-right text-green-600">RD${porProveedor.reduce((s,p)=>s+p.pagado,0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                <td className="px-4 py-3 text-right text-orange-600">RD${porProveedor.reduce((s,p)=>s+p.pendiente,0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: PAGOS REALIZADOS */}
      {tab === 'pagos' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-3 items-end mb-6 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)}
                placeholder="Buscar proveedor..."
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => imprimir('Pagos Realizados', `
              <h2>Pagos Realizados a Proveedores</h2>
              <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
              <table><thead><tr><th>Proveedor</th><th>Descripción</th><th>Total Cuenta</th><th>Pagado</th><th>Pendiente</th></tr></thead>
              <tbody>${pagosRealizados.map(c=>`<tr><td>${c.proveedor_nombre||'-'}</td><td>${c.descripcion}</td><td style="text-align:right">RD$${parseFloat(c.monto_total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td style="text-align:right;color:green;font-weight:bold">RD$${parseFloat(c.monto_pagado).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td style="text-align:right">RD$${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody></table>
              <p><strong>Total Pagado: RD$${pagosRealizados.reduce((s,c)=>s+parseFloat(c.monto_pagado||0),0).toLocaleString('es-DO',{minimumFractionDigits:2})}</strong></p>
            `)}
              className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
              🖨️ Imprimir
            </button>
          </div>
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Registros: <span className="font-bold">{pagosRealizados.length}</span> — Total Pagado: <span className="font-bold text-green-600">RD${pagosRealizados.reduce((s,c)=>s+parseFloat(c.monto_pagado||0),0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-right text-gray-600">Total Cuenta</th>
                <th className="px-4 py-3 text-right text-gray-600">Pagado</th>
                <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagosRealizados.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay pagos registrados</td></tr>
              ) : pagosRealizados.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.proveedor_nombre || '-'}</td>
                  <td className="px-4 py-3">{c.descripcion}</td>
                  <td className="px-4 py-3 text-right">RD${parseFloat(c.monto_total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">RD${parseFloat(c.monto_pagado).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3 text-right text-orange-500">RD${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(c.estado)}`}>{c.estado.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: VENCIDAS */}
      {tab === 'vencidas' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end mb-4">
            <button onClick={() => imprimir('Cuentas Vencidas', `
              <h2>Cuentas Vencidas</h2>
              <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
              <table><thead><tr><th>Proveedor</th><th>Descripción</th><th>Pendiente</th><th>Vencimiento</th><th>Días Vencido</th></tr></thead>
              <tbody>${cuentasVencidas.map(c=>{
                const dias = Math.floor((hoy-new Date(c.fecha_vencimiento))/(1000*60*60*24))
                return `<tr><td>${c.proveedor_nombre||'-'}</td><td>${c.descripcion}</td><td style="text-align:right">RD$${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td><td>${new Date(c.fecha_vencimiento).toLocaleDateString('es-DO')}</td><td style="text-align:center;color:red;font-weight:bold">${dias} días</td></tr>`
              }).join('')}</tbody></table>
              <p><strong>Total Vencido: RD$${cuentasVencidas.reduce((s,c)=>s+parseFloat(c.monto_pendiente||0),0).toLocaleString('es-DO',{minimumFractionDigits:2})}</strong></p>
            `)}
              className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
              🖨️ Imprimir
            </button>
          </div>
          <div className="mb-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Cuentas vencidas: <span className="font-bold text-red-600">{cuentasVencidas.length}</span> — Total: <span className="font-bold text-red-600">RD${cuentasVencidas.reduce((s,c)=>s+parseFloat(c.monto_pendiente||0),0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                <th className="px-4 py-3 text-center text-gray-600">Días Vencido</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentasVencidas.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay cuentas vencidas ✅</td></tr>
              ) : cuentasVencidas.map(c => {
                const dias = Math.floor((hoy - new Date(c.fecha_vencimiento)) / (1000*60*60*24))
                return (
                  <tr key={c.id} className="border-t hover:bg-red-50">
                    <td className="px-4 py-3 font-medium">{c.proveedor_nombre || '-'}</td>
                    <td className="px-4 py-3">{c.descripcion}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">RD${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td className="px-4 py-3">{new Date(c.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">{dias} días</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setShowAbono(c.id); setError(''); setTab('cuentas') }}
                        className="text-blue-600 hover:underline text-xs">Pagar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: PAGAR ORDEN */}
      {tab === 'pagar_orden' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🧾 Pagar Orden de Compra</h3>
          <div className="flex gap-3 items-end mb-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Número de Orden</label>
              <input type="text" id="buscar-orden" placeholder="Ej: OC-0020"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                onChange={e => {
                  const val = e.target.value.toLowerCase()
                  setOrdenes(prev => prev.map(o => ({ ...o, _hidden: val && !o.numero.toLowerCase().includes(val) })))
                }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" placeholder="Buscar proveedor..."
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                onChange={e => {
                  const val = e.target.value.toLowerCase()
                  setOrdenes(prev => prev.map(o => ({ ...o, _hiddenProv: val && !(o.proveedor_nombre||'').toLowerCase().includes(val) })))
                }} />
            </div>
            <button onClick={() => fetchData()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300">
              🔄 Limpiar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-gray-600">Pagado</th>
                  <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado Pago</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay órdenes de compra</td></tr>
                ) : ordenes.filter(o => !o._hidden && !o._hiddenProv).map(o => {
                  const pagado = parseFloat(o.monto_pagado || 0)
                  const total = parseFloat(o.total || 0)
                  const pendiente = total - pagado
                  const estadoPago = o.estado_pago || 'pendiente'
                  return (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium">{o.numero}</td>
                      <td className="px-4 py-3">{o.proveedor_nombre || '-'}</td>
                      <td className="px-4 py-3 text-right">RD${total.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right text-green-600">RD${pagado.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">RD${pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${estadoPago === 'pagada' ? 'bg-green-100 text-green-700' : estadoPago === 'parcial' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                          {estadoPago.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {estadoPago !== 'pagada' && (
                          <button onClick={() => { setOrdenSeleccionada(o); setMontoPagoOrden(pendiente.toFixed(2)); setMetodoPagoOrden('efectivo') }}
                            className="text-blue-600 hover:underline text-xs font-medium">
                            💳 Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal pago orden */}
      {ordenSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">💳 Pagar Orden {ordenSeleccionada.numero}</h3>
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
              <p><span className="text-gray-500">Proveedor:</span> <span className="font-medium">{ordenSeleccionada.proveedor_nombre || '-'}</span></p>
              <p><span className="text-gray-500">Total:</span> <span className="font-medium">RD${parseFloat(ordenSeleccionada.total||0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
              <p><span className="text-gray-500">Ya pagado:</span> <span className="font-medium text-green-600">RD${parseFloat(ordenSeleccionada.monto_pagado||0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
              <p><span className="text-gray-500">Pendiente:</span> <span className="font-bold text-orange-600">RD${(parseFloat(ordenSeleccionada.total||0)-parseFloat(ordenSeleccionada.monto_pagado||0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar *</label>
                <input type="number" step="0.01" value={montoPagoOrden} onChange={e => setMontoPagoOrden(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select value={metodoPagoOrden} onChange={e => setMetodoPagoOrden(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setOrdenSeleccionada(null)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button disabled={loadingPago} onClick={async () => {
                if (!montoPagoOrden || parseFloat(montoPagoOrden) <= 0) return alert('Ingresa un monto válido')
                setLoadingPago(true)
                try {
                  await API.put(`/purchase-orders/${ordenSeleccionada.id}/pagar`, {
                    monto: montoPagoOrden,
                    metodo: metodoPagoOrden
                  })
                  setOrdenSeleccionada(null)
                  setMontoPagoOrden('')
                  await fetchData()
                  alert('✅ Pago registrado correctamente')
                } catch (err) {
                  alert('❌ ' + (err.response?.data?.mensaje || 'Error al pagar'))
                } finally {
                  setLoadingPago(false)
                }
              }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {loadingPago ? 'Procesando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ESTADO POR PROVEEDOR */}
      {tab === 'estado_cuenta' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Estado de Cuenta por Proveedor</h3>
          <div className="relative mb-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Proveedor</label>
            <input type="text" placeholder="🔍 Escriba el nombre del proveedor..." autoComplete="off"
              className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => {
                const val = e.target.value.toLowerCase()
                const list = document.getElementById('ec-prov-list')
                list.innerHTML = ''
                document.getElementById('ec-prov-resultado').innerHTML = ''
                document.getElementById('ec-prov-tbody').innerHTML = ''
                if (val.length < 2) return
                const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                filtrados.forEach(p => {
                  const div = document.createElement('div')
                  div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b'
                  div.textContent = p.nombre
                  div.onmousedown = () => {
                    e.target.value = p.nombre
                    list.innerHTML = ''
                    const cxp = cuentas.filter(c => c.supplier_id === p.id)
                    const total = cxp.reduce((s,c)=>s+parseFloat(c.monto_total||0),0)
                    const pagado = cxp.reduce((s,c)=>s+parseFloat(c.monto_pagado||0),0)
                    const pendiente = cxp.reduce((s,c)=>s+parseFloat(c.monto_pendiente||0),0)
                    const vencidas = cxp.filter(c=>c.fecha_vencimiento && new Date(c.fecha_vencimiento)<hoy && c.estado!=='pagada').length
                    document.getElementById('ec-prov-resultado').innerHTML = `
                      <div class="flex gap-4 flex-wrap mb-4">
                        <div class="bg-gray-50 rounded-lg p-3 text-center min-w-28"><p class="text-xs text-gray-500">Cuentas</p><p class="text-lg font-bold text-gray-800">${cxp.length}</p></div>
                        <div class="bg-orange-50 rounded-lg p-3 text-center min-w-28"><p class="text-xs text-gray-500">Total</p><p class="text-lg font-bold text-orange-600">RD$${total.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-green-50 rounded-lg p-3 text-center min-w-28"><p class="text-xs text-gray-500">Pagado</p><p class="text-lg font-bold text-green-600">RD$${pagado.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-red-50 rounded-lg p-3 text-center min-w-28"><p class="text-xs text-gray-500">Pendiente</p><p class="text-lg font-bold text-red-600">RD$${pendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-yellow-50 rounded-lg p-3 text-center min-w-28"><p class="text-xs text-gray-500">Vencidas</p><p class="text-lg font-bold text-yellow-600">${vencidas}</p></div>
                      </div>`
                    document.getElementById('ec-prov-tbody').innerHTML = cxp.length === 0
                      ? '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No hay cuentas</td></tr>'
                      : cxp.map(c => {
                        const diasVenc = c.fecha_vencimiento ? Math.floor((hoy-new Date(c.fecha_vencimiento))/(1000*60*60*24)) : 0
                        return `<tr class="border-t hover:bg-gray-50">
                          <td class="px-4 py-3 text-sm">${c.descripcion}</td>
                          <td class="px-4 py-3 text-right text-sm">RD$${parseFloat(c.monto_total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                          <td class="px-4 py-3 text-right text-sm text-green-600">RD$${parseFloat(c.monto_pagado).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                          <td class="px-4 py-3 text-right text-sm font-bold text-orange-600">RD$${parseFloat(c.monto_pendiente).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                          <td class="px-4 py-3 text-sm">${c.fecha_vencimiento?new Date(c.fecha_vencimiento).toLocaleDateString('es-DO'):'-'}</td>
                          <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded text-xs font-medium ${estadoColor(c.estado)}">${c.estado.toUpperCase()}</span></td>
                        </tr>`
                      }).join('')
                  }
                  list.appendChild(div)
                })
              }}
              onBlur={() => setTimeout(() => { document.getElementById('ec-prov-list').innerHTML = '' }, 200)}
            />
            <div id="ec-prov-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
          </div>
          <div id="ec-prov-resultado"></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-right text-gray-600">Total</th>
                <th className="px-4 py-3 text-right text-gray-600">Pagado</th>
                <th className="px-4 py-3 text-right text-gray-600">Pendiente</th>
                <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody id="ec-prov-tbody">
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Busca un proveedor para ver su estado de cuenta</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}