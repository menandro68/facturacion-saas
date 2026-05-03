import { useState, useEffect } from 'react'
import API from '../services/api'
import { listarDispositivos, imprimirEnDispositivo } from '../utils/bluetoothPrint'

export default function CuentasCobrar({ vendedor_id = null, modulos_permitidos = null }) {
  const [tab, setTab] = useState(vendedor_id ? 'cobro_vendedor' : 'cuentas')
  const [cuentas, setCuentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [facturas, setFacturas] = useState([])
  const [todasFacturas, setTodasFacturas] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAbono, setShowAbono] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '', invoice_id: '', descripcion: '', monto_total: '', fecha_vencimiento: '', notas: ''
  })
  const [abonoMonto, setAbonoMonto] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [cxcFiltradas, setCxcFiltradas] = useState([])
  const [pagos, setPagos] = useState([])
  const [invoiceItems, setInvoiceItems] = useState([])
  const [modalResumen, setModalResumen] = useState(null)
  const [btModal, setBtModal] = useState(false)
  const [btDevices, setBtDevices] = useState([])
  const [btLineas, setBtLineas] = useState([])
  const [btLoading, setBtLoading] = useState(false)

  const fetchData = async () => {
    try {
      const [c, res, cli, fac] = await Promise.all([
        API.get('/accounts-receivable'),
        API.get('/accounts-receivable/resumen'),
        API.get('/customers'),
        API.get('/invoices')
      ])
      setCuentas(c.data.data)
      setResumen(res.data.data)
      setClientes(cli.data.data)
      setTodasFacturas(fac.data.data)
      setFacturas(fac.data.data.filter(f => f.estado === 'emitida'))
      API.get('/mantenimiento/vendedores').then(r => setVendedores(r.data.data)).catch(() => {})
      API.get('/payments').then(r => setPagos(r.data.data)).catch(() => {})
      API.get('/invoices/items/todos').then(r => setInvoiceItems(r.data.data)).catch(() => {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'invoice_id' && e.target.value) {
      const factura = facturas.find(f => f.id === e.target.value)
      if (factura) {
        setForm(prev => ({
          ...prev,
          invoice_id: e.target.value,
          monto_total: factura.total,
          descripcion: `Factura ${factura.ncf || 'BORRADOR'}`
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/accounts-receivable', form)
      setShowForm(false)
      setForm({ customer_id: '', invoice_id: '', descripcion: '', monto_total: '', fecha_vencimiento: '', notas: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleAbono = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.put(`/accounts-receivable/${showAbono}/abono`, { monto: abonoMonto })
      setShowAbono(null)
      setAbonoMonto('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar abono')
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return
    try {
      await API.delete(`/accounts-receivable/${id}`)
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

  if (loading) return <p className="text-gray-500 p-6">Cargando cuentas por cobrar...</p>

  const centerText = (text, width) => {
    const spaces = Math.max(0, Math.floor((width - text.length) / 2))
    return ' '.repeat(spaces) + text
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-xl font-bold text-gray-800">Cuentas por Cobrar</h2>
        {vendedor_id && (
          <button onClick={() => setTab('cobro_vendedor')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-2">
            ← Volver
          </button>
        )}
        <button onClick={() => {
          const hoy = new Date()
          const emitidas = todasFacturas.filter(f => f.estado === 'emitida')
          const pagadas = todasFacturas.filter(f => f.estado === 'pagada')
          const vencidas = emitidas.filter(f => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < hoy)
          const totalPendiente = emitidas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
          const totalCobrado = pagadas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
          const totalVencidas = vencidas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
          setModalResumen({ totalCuentas: totalPendiente + totalCobrado, totalPendiente, totalCobrado, totalVencidas, fecha: hoy.toLocaleDateString('es-DO') })
        }}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm flex items-center gap-2">
          🖨️ Imprimir Resumen
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        {[
          { id: 'cuentas', label: 'Cuentas por Cobrar' },
          { id: 'cobro_vendedor', label: 'Cobro por Vendedor' },
          { id: 'cxc_vendedor', label: 'Cuenta por Cobrar por Vendedor' },
          { id: 'estado_cuenta', label: 'Estado de Cuenta x Cliente' },
          { id: 'historial', label: 'Historial' },
        ].filter(t => !vendedor_id || t.id === 'cobro_vendedor' || t.id === 'cxc_vendedor' || t.id === 'estado_cuenta')
        .filter(t => !modulos_permitidos || modulos_permitidos.includes(`cuentas_cobrar:${t.id}`))
        .map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Cuentas por Cobrar */}
      {tab === 'cuentas' && (
        <>
          {(() => {
            const hoy = new Date()
            const emitidas = todasFacturas.filter(f => f.estado === 'emitida')
            const pagadas = todasFacturas.filter(f => f.estado === 'pagada')
            const vencidas = emitidas.filter(f => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < hoy)
            const totalPendiente = emitidas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
            const totalCobrado = pagadas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Total Cuentas</p>
                  <p className="text-2xl font-bold text-blue-600">RD$ {(totalPendiente + totalCobrado).toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Total Pendiente</p>
                  <p className="text-2xl font-bold text-orange-500">RD$ {totalPendiente.toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Cobrado total</p>
                  <p className="text-2xl font-bold text-green-600">RD$ {totalCobrado.toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">RD$ {vencidas.reduce((s,f) => s + parseFloat(f.total||0), 0).toLocaleString('es-DO', {minimumFractionDigits:2})}</p>
                </div>
              </div>
            )
          })()}

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Nueva Cuenta por Cobrar</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <select name="customer_id" value={form.customer_id} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Factura (opcional)</label>
                  <select name="invoice_id" value={form.invoice_id} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin factura</option>
                    {facturas.map(f => (
                      <option key={f.id} value={f.id}>{f.ncf} — RD${parseFloat(f.total).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                  <input name="monto_total" type="number" step="0.01" value={form.monto_total} onChange={handleChange} required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <input name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
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
                <h3 className="text-lg font-semibold mb-4">Registrar Abono</h3>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleAbono} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto del Abono *</label>
                    <input type="number" step="0.01" value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)} required
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAbono(null); setError('') }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Registrar Abono</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Pagado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Pendiente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay cuentas por cobrar</td></tr>
                ) : (
                  cuentas.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.cliente_nombre || 'Sin cliente'}</td>
                      <td className="px-4 py-3">{c.descripcion}</td>
                      <td className="px-4 py-3">RD${parseFloat(c.monto_total).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600">RD${parseFloat(c.monto_pagado).toLocaleString()}</td>
                      <td className="px-4 py-3 text-orange-500 font-medium">RD${parseFloat(c.monto_pendiente).toLocaleString()}</td>
                      <td className="px-4 py-3">{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(c.estado)}`}>
                          {c.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {c.estado !== 'pagada' && (
                          <button onClick={() => { setShowAbono(c.id); setError('') }}
                            className="text-blue-600 hover:underline text-xs">Abono</button>
                        )}
                        <button onClick={() => handleEliminar(c.id)}
                          className="text-red-500 hover:underline text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab: Cobro por Vendedor */}
      {tab === 'cobro_vendedor' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Cobro por Vendedor</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end mb-6 flex-wrap">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-full sm:w-auto">
              {!vendedor_id && <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>}
              {!vendedor_id ? (
                <select id="cob-vendedor"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                  <option value="">-- Seleccionar vendedor --</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              ) : (
                <input type="hidden" id="cob-vendedor" value={vendedor_id} />
              )}
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => {
                const vendedorId = document.getElementById('cob-vendedor').value
                if (!vendedorId) return
                const vendedorNombreSeleccionado = vendedores.find(v => v.id === vendedorId)?.nombre || ''
         const filtradas = pagos.filter(p => {
                  // Filtrar por vendedor del CLIENTE de la factura (no por quien registro el pago)
                  const factura = todasFacturas.find(f => f.id === p.invoice_id)
                  if (!factura) return false
                  const cliente = clientes.find(c => c.id === factura.customer_id)
                  if (!cliente) return false
                  if (cliente.vendedor_id !== vendedorId) return false

                  const d = new Date(p.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  return true
                })
                const totalCobrado = filtradas.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                const totalItbis = 0
                const totalSubtotal = totalCobrado

     // Calcular comision SOLO si la factura esta pagada al 100%
                let totalComision = 0
                const facturasYaProcesadas = new Set()
                filtradas.forEach(p => {
                  if (facturasYaProcesadas.has(p.invoice_id)) return
                  facturasYaProcesadas.add(p.invoice_id)

                  const factura = todasFacturas.find(f => f.id === p.invoice_id)
                  if (!factura) return

                  const totalFactura = parseFloat(factura.total || 0)
                  const totalPagadoFactura = pagos
                    .filter(pg => pg.invoice_id === p.invoice_id)
                    .reduce((s, pg) => s + parseFloat(pg.monto || 0), 0)

                  // Solo dar comision si la factura esta pagada al 100% (o mas)
                  if (totalPagadoFactura < totalFactura - 0.01) return

           const itemsDeFactura = invoiceItems.filter(it => it.invoice_id === p.invoice_id)
                  itemsDeFactura.forEach(item => {
                    const totalItem = parseFloat(item.total || 0)
                    const porcentaje = parseFloat(item.comision_vendedor || 0)
                    totalComision += totalItem * (porcentaje / 100)
                  })
                })

                document.getElementById('cob-resultado').innerHTML = `
                  <p class="text-sm text-gray-600">Facturas pagadas: <span class="font-bold text-gray-800">${filtradas.length}</span></p>
                  <p class="text-sm text-gray-600">Subtotal: <span class="font-medium">RD$${totalSubtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-sm text-gray-600">ITBIS: <span class="font-medium">RD$${totalItbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-lg font-bold text-green-700 mt-1">Total Cobrado: RD$${totalCobrado.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                  <p class="text-base font-bold text-purple-700 mt-1">Comision Vendedor: RD$${totalComision.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>`
                const tbody = document.getElementById('cob-tbody')
                tbody.innerHTML = filtradas.length === 0
                  ? '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No hay facturas pagadas</td></tr>'
                  : filtradas.map(p => {
                    const factura = todasFacturas.find(f => f.id === p.invoice_id)
                    return `<tr class="border-t hover:bg-gray-50">
                      <td class="px-4 py-3 font-mono text-sm">${factura?.ncf || 'N/A'}</td>
                      <td class="px-4 py-3 text-sm">${factura?.cliente_nombre || p.cliente_nombre || 'Consumidor Final'}</td>
                      <td class="px-4 py-3 text-right text-sm font-medium text-green-700">RD$${parseFloat(p.monto).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td class="px-4 py-3 text-sm">${new Date(p.creado_en).toLocaleDateString('es-DO')}</td>
                    </tr>`}).join('')
              }}>
              Buscar
            </button>
          </div>
          <div id="cob-resultado" className="mb-4 text-right bg-green-50 p-3 rounded-lg min-h-8"></div>
        <div className="flex justify-end mb-4">
          <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
            onClick={async () => {
              const tbody = document.getElementById('cob-tbody')
              if (!tbody || tbody.innerHTML.includes('No hay') || tbody.innerHTML.includes('Selecciona')) return alert('Primero realiza una búsqueda')
              const resultado = document.getElementById('cob-resultado')
              if (vendedor_id && window.bluetoothSerial) {
                try {
                  setBtLoading(true)
                  let devices = []
                  const filas = Array.from(tbody.querySelectorAll('tr')).map(tr =>
                    Array.from(tr.querySelectorAll('td')).map(td => td.innerText).join('  |  ')
                  )
                  const W = 48

                  const pad = (text, length, align = 'left') => {
                    text = String(text || '')
                    if (text.length > length) return text.substring(0, length)
                    if (align === 'right') return ' '.repeat(length - text.length) + text
                    if (align === 'center') {
                      const spaces = Math.floor((length - text.length) / 2)
                      return ' '.repeat(spaces) + text + ' '.repeat(length - text.length - spaces)
                    }
                    return text + ' '.repeat(length - text.length)
                  }

                  const line = (a, b, c, d) => {
                    return (
                      pad(a, 12) +
                      pad(b, 14) +
                      pad(c, 12, 'right') +
                      pad(d, 10, 'right')
                    )
                  }

                  const sep = '='.repeat(W)
                  const sep2 = '-'.repeat(W)

                  const empresa = sessionStorage.getItem('tenant_name') || 'MI EMPRESA'
                  const vendedorNombre = vendedor_id
                    ? (vendedores.find(v => v.id === vendedor_id)?.nombre || sessionStorage.getItem('user_nombre') || 'VENDEDOR')
                    : (sessionStorage.getItem('user_nombre') || 'VENDEDOR')

                  const fechaIni = fechaInicio
                    ? new Date(fechaInicio).toLocaleDateString('es-DO')
                    : '--/--/----'

                  const fechaFin2 = fechaFin
                    ? new Date(fechaFin).toLocaleDateString('es-DO')
                    : '--/--/----'

                  const filasDatos = Array.from(tbody.querySelectorAll('tr')).map(tr => {
                    const tds = Array.from(tr.querySelectorAll('td'))
                    if (tds.length < 4) return ''
                    const factura = tds[0].innerText.trim().slice(-10)
                    const cliente = tds[1].innerText.trim()
                    const monto = tds[2].innerText.replace('RD$', '').trim()
                    const fecha = tds[3].innerText.trim()
                    return line(factura, cliente, monto, fecha)
                  }).filter(Boolean)

                  const lineas = [
                    sep,
                    pad(empresa.toUpperCase(), W, 'center'),
                    pad('REPORTE DE COBRO', W, 'center'),
                    sep,
                    `VENDEDOR: ${vendedorNombre}`,
                    sep2,
                    `FECHA INI: ${fechaIni}`,
                    `FECHA FIN: ${fechaFin2}`,
                    sep2,
                    line('FACT.', 'CLIENTE', 'COBRADO', 'FECHA'),
                    sep2,
                    ...filasDatos,
                    sep2,
                    `FACTURAS: ${resultado?.innerText.match(/Facturas pagadas:\s*(\d+)/)?.[1] || ''}`,
                    `TOTAL: ${resultado?.innerText.match(/Total Cobrado[:\s]+(.+)/)?.[1]?.trim() || ''}`,
                    sep,
                    pad('** GRACIAS **', W, 'center'),
                    sep,
                    '', '', ''
                  ]

                  const savedAddress = localStorage.getItem('bt_printer_address')
                  const savedName = localStorage.getItem('bt_printer_name')
                  if (savedAddress) {
                    try {
                      await imprimirEnDispositivo(savedAddress, lineas)
                      alert('✅ Impreso en ' + (savedName || savedAddress))
                    } catch (err) {
                      alert('❌ Error al imprimir: ' + err)
                    }
                    return
                  }
                  devices = await listarDispositivos()
                  setBtDevices(devices)
                  setBtLineas(lineas)
                  setBtModal(true)
                } catch (err) {
                  alert('❌ ' + err)
                } finally {
                  setBtLoading(false)
                }
                return
              }
              const printW = window.open('', '_blank')
              printW.document.write(`
                <!DOCTYPE html><html><head><title>Cobro por Vendedor</title>
                <style>
                  body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                  h2{color:#1e40af;margin-bottom:4px}
                  p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                  th{background:#1e40af;color:white;padding:8px;text-align:left}
                  td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                  tr:nth-child(even){background:#f8fafc}
                  .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                  @media print{button{display:none}}
                </style></head><body>
              <h2>Cobro por Vendedor — ${vendedor_id ? (vendedores.find(v => v.id === vendedor_id)?.nombre || '') : (vendedores.find(v => v.id === document.getElementById('cob-vendedor')?.value)?.nombre || '')}</h2>
                <p class="sub">Fecha: ${new Date().toLocaleDateString('es-DO')}</p>
                <table>
                  <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total Cobrado</th><th>Fecha</th></tr></thead>
                  <tbody>${tbody.innerHTML}</tbody>
                </table>
                <div class="resumen">${resultado.innerHTML}</div>
                <script>window.onload=()=>window.print()</script>
                </body></html>`)
              printW.document.close()
            }}>
            🖨️ Imprimir Reporte
          </button>
        </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-right text-gray-600">Total Cobrado</th>
                <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody id="cob-tbody">
              <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Selecciona un vendedor y presiona Buscar</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: CXC por Vendedor */}
      {tab === 'cxc_vendedor' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Cuenta por Cobrar por Vendedor</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div>
              {!vendedor_id && <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>}
              {!vendedor_id ? (
                <select id="cxc-vendedor"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                  <option value="">-- Seleccionar vendedor --</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              ) : (
                <input type="hidden" id="cxc-vendedor" value={vendedor_id} />
              )}
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => {
                const vendedorId = document.getElementById('cxc-vendedor').value
                if (!vendedorId) return
                const clientesVendedor = clientes.filter(c => c.vendedor_id === vendedorId)
                const idsClientes = clientesVendedor.map(c => c.id)
                const filtradas = todasFacturas.filter(f =>
                  idsClientes.includes(f.customer_id) && f.estado === 'emitida'
                )
                const totalPendiente = filtradas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
                const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
                document.getElementById('cxc-resultado').innerHTML = `
                  <p class="text-sm text-gray-600">Facturas pendientes: <span class="font-bold text-gray-800">${filtradas.length}</span></p>
                  <p class="text-sm text-gray-600">Subtotal: <span class="font-medium">RD$${totalSubtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-sm text-gray-600">ITBIS: <span class="font-medium">RD$${totalItbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-lg font-bold text-red-600 mt-1">Total Pendiente: RD$${totalPendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>`
                const tbody = document.getElementById('cxc-tbody')
                setCxcFiltradas(filtradas)
                tbody.innerHTML = filtradas.length === 0
                  ? '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No hay cuentas por cobrar</td></tr>'
                  : filtradas.map(f => `
                    <tr class="border-t hover:bg-gray-50">
                      <td class="px-4 py-3 font-mono text-sm">${f.ncf || 'N/A'}</td>
                      <td class="px-4 py-3 text-sm">${f.cliente_nombre || 'Consumidor Final'}</td>
                      <td class="px-4 py-3 text-right text-sm font-medium text-red-600">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td class="px-4 py-3 text-sm">${f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-DO') : '-'}</td>
                      <td class="px-4 py-3 text-sm">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                    </tr>`).join('')
              }}>
              Buscar
            </button>
            <button className={`bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 ${vendedor_id ? 'hidden' : ''}`}
              onClick={() => {
                const vendedorNombre = vendedores.find(v => v.id === document.getElementById('cxc-vendedor').value)?.nombre || ''
                const resumenHtml = document.getElementById('cxc-resultado').innerHTML
                const tbodyHtml = document.getElementById('cxc-tbody').innerHTML
                const printW = window.open('', '_blank')
                const hoy = new Date()
                const notasCredito = todasFacturas.filter(x => x.estado === 'nota_credito')
                const filas = cxcFiltradas.map(f => {
                  const fechaEmitida = new Date(f.creado_en)
                  const diasVencido = f.fecha_vencimiento
                    ? Math.max(0, Math.floor((hoy - new Date(f.fecha_vencimiento)) / (1000*60*60*24)))
                    : 0
                  const nc = notasCredito.filter(n => n.referencia_id === f.id)
                  const montoNc = nc.reduce((s, n) => s + parseFloat(n.total || 0), 0)
                  const abono = parseFloat(f.monto_pagado || 0)
                  const balance = parseFloat(f.total) - montoNc - abono
                  return `<tr>
                    <td>${f.ncf || 'N/A'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:center">${fechaEmitida.toLocaleDateString('es-DO')}</td>
                    <td style="text-align:right">${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center;${diasVencido > 60 ? 'color:#dc2626;font-weight:bold' : ''}">${diasVencido}</td>
                    <td style="text-align:right">${montoNc > 0 ? montoNc.toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}</td>
                    <td style="text-align:right">${abono > 0 ? abono.toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}</td>
                    <td style="text-align:right;font-weight:bold">${balance.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  </tr>`
                }).join('')
                const totalBalance = cxcFiltradas.reduce((s,f) => s + parseFloat(f.total||0), 0)
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>CXC Vendedor</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.sub{color:#64748b;font-size:12px;margin-bottom:12px}
                    table{width:100%;border-collapse:collapse;font-size:12px}
                    th{background:#1e40af;color:white;padding:7px 8px;text-align:left;border:1px solid #1e3a8a}
                    td{padding:6px 8px;border:1px solid #cbd5e1}
                    tr:nth-child(even){background:#f8fafc}
                    .total-row{font-weight:bold;background:#f1f5f9}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Cuenta por Cobrar — Vendedor: ${vendedorNombre}</h2>
                  <p class="sub">Fecha: ${hoy.toLocaleDateString('es-DO')}</p>
                  <table>
                    <thead><tr>
                      <th>FACTURA</th>
                      <th>CLIENTE</th>
                      <th style="text-align:center">FECHA EMITIDA</th>
                      <th style="text-align:right">VALOR</th>
                      <th style="text-align:center">DÍAS VENCIDO</th>
                      <th style="text-align:right">NOTA DE CRÉDITO</th>
                      <th style="text-align:right">ABONO</th>
                      <th style="text-align:right">BALANCE</th>
                    </tr></thead>
                    <tbody>
                      ${filas}
                      <tr class="total-row">
                        <td colspan="3">TOTAL</td>
                        <td style="text-align:right">${totalBalance.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td colspan="3"></td>
                        <td style="text-align:right">${totalBalance.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      </tr>
                    </tbody>
                  </table>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}>
              🖨️ Imprimir
            </button>
          </div>
          <div id="cxc-resultado" className="mb-4 text-right bg-red-50 p-3 rounded-lg min-h-8"></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-right text-gray-600">Total Pendiente</th>
                <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody id="cxc-tbody">
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">Selecciona un vendedor y presiona Buscar</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab === 'estado_cuenta' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Estado de Cuenta por Cliente</h3>
          <div className="relative mb-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Cliente</label>
            <input type="text" placeholder="🔍 Escriba el nombre del cliente..." autoComplete="off"
              className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => {
                const val = e.target.value.toLowerCase()
                const list = document.getElementById('ec-cliente-list')
                list.innerHTML = ''
                document.getElementById('ec-resultado').innerHTML = ''
                document.getElementById('ec-tbody').innerHTML = ''
                if (val.length < 2) return
                const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val) && (!vendedor_id || c.vendedor_id === vendedor_id)).slice(0, 10)
                filtrados.forEach(c => {
                  const div = document.createElement('div')
                  div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b'
                  div.textContent = c.nombre
                  div.onmousedown = () => {
                    e.target.value = c.nombre
                    list.innerHTML = ''
                    const facturasCliente = todasFacturas.filter(f => f.customer_id === c.id && f.estado === 'emitida')
                    const notasCliente = todasFacturas.filter(f => f.customer_id === c.id && f.estado === 'nota_credito')
                    const hoy = new Date()
                    let totalFacturas = 0, totalNc = 0, totalAbono = 0, totalBalance = 0
                    const filas = facturasCliente.map(f => {
                      const nc = notasCliente.filter(n => n.referencia_id === f.id)
                      const montoNc = nc.reduce((s, n) => s + parseFloat(n.total || 0), 0)
                      const abono = parseFloat(f.monto_pagado || 0)
                      const balance = parseFloat(f.total) - montoNc - abono
                      const diasVencido = f.fecha_vencimiento ? Math.max(0, Math.floor((hoy - new Date(f.fecha_vencimiento)) / (1000*60*60*24))) : 0
                      totalFacturas += parseFloat(f.total)
                      totalNc += montoNc
                      totalAbono += abono
                      totalBalance += balance
                      return `<tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3 font-mono text-sm">${f.ncf || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                        <td class="px-4 py-3 text-right text-sm">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td class="px-4 py-3 text-right text-sm ${diasVencido > 60 ? 'text-red-600 font-bold' : ''}">${diasVencido}</td>
                        <td class="px-4 py-3 text-right text-sm text-blue-600">${montoNc > 0 ? 'RD$'+montoNc.toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}</td>
                        <td class="px-4 py-3 text-right text-sm text-green-600">${abono > 0 ? 'RD$'+abono.toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}</td>
                        <td class="px-4 py-3 text-right text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}">RD$${balance.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      </tr>`
                    }).join('')
                    document.getElementById('ec-resultado').innerHTML = `
                      <div class="flex gap-4 flex-wrap mb-4">
                        <div class="bg-gray-50 rounded-lg p-3 text-center min-w-32"><p class="text-xs text-gray-500">Facturas</p><p class="text-lg font-bold text-gray-800">${facturasCliente.length}</p></div>
                        <div class="bg-orange-50 rounded-lg p-3 text-center min-w-32"><p class="text-xs text-gray-500">Total Facturado</p><p class="text-lg font-bold text-orange-600">RD$${totalFacturas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-blue-50 rounded-lg p-3 text-center min-w-32"><p class="text-xs text-gray-500">Nota Crédito</p><p class="text-lg font-bold text-blue-600">RD$${totalNc.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-green-50 rounded-lg p-3 text-center min-w-32"><p class="text-xs text-gray-500">Abonado</p><p class="text-lg font-bold text-green-600">RD$${totalAbono.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <div class="bg-red-50 rounded-lg p-3 text-center min-w-32"><p class="text-xs text-gray-500">Balance</p><p class="text-lg font-bold text-red-600">RD$${totalBalance.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div>
                        <button onclick="
                          const printW = window.open('','_blank');
                          const filas = document.getElementById('ec-tbody').innerHTML;
                          printW.document.write('<!DOCTYPE html><html><head><title>Estado de Cuenta</title><style>body{font-family:Arial;padding:20px;color:#1e293b}h2{color:#1e40af;margin-bottom:4px}p.sub{color:#64748b;font-size:12px;margin-bottom:16px}.resumen{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center;min-width:100px}.card p.lbl{font-size:11px;color:#64748b;margin:0 0 4px}.card p.val{font-size:16px;font-weight:bold;margin:0}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1e40af;color:white;padding:7px;text-align:left}td{padding:6px 8px;border:1px solid #cbd5e1}tr:nth-child(even){background:#f8fafc}.total{font-weight:bold;background:#f1f5f9}@media print{button{display:none}}</style></head><body>');
                          printW.document.write('<h2>Estado de Cuenta: ${c.nombre}</h2>');
                          printW.document.write('<p class=sub>Fecha: ${new Date().toLocaleDateString('es-DO')}</p>');
                          printW.document.write('<div class=resumen><div class=card><p class=lbl>Facturas</p><p class=val>${facturasCliente.length}</p></div><div class=card><p class=lbl>Total Facturado</p><p class=val style=color:#ea580c>RD\$${totalFacturas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div><div class=card><p class=lbl>Nota Crédito</p><p class=val style=color:#2563eb>RD\$${totalNc.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div><div class=card><p class=lbl>Abonado</p><p class=val style=color:#16a34a>RD\$${totalAbono.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div><div class=card><p class=lbl>Balance</p><p class=val style=color:#dc2626>RD\$${totalBalance.toLocaleString('es-DO',{minimumFractionDigits:2})}</p></div></div>');
                          printW.document.write('<table><thead><tr><th>FACTURA</th><th>FECHA</th><th style=text-align:right>VALOR</th><th style=text-align:right>DÍAS VEN.</th><th style=text-align:right>NOTA CR.</th><th style=text-align:right>ABONO</th><th style=text-align:right>BALANCE</th></tr></thead><tbody>'+filas+'</tbody></table>');
                          printW.document.write('<script>window.onload=()=>window.print()<\/script></body></html>');
                          printW.document.close();
                        " style="background:#16a34a;color:white;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:13px;align-self:center;display:${vendedor_id ? 'none' : 'inline-block'}">🖨️ Imprimir</button>
                      </div>`
                    document.getElementById('ec-tbody').innerHTML = filas || '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No hay facturas pendientes</td></tr>'
                  }
                  list.appendChild(div)
                })
              }}
              onBlur={() => setTimeout(() => { document.getElementById('ec-cliente-list').innerHTML = '' }, 200)}
            />
            <div id="ec-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
          </div>
          <div id="ec-resultado"></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">FACTURA</th>
                <th className="px-4 py-3 text-left text-gray-600">FECHA</th>
                <th className="px-4 py-3 text-right text-gray-600">VALOR</th>
                <th className="px-4 py-3 text-right text-gray-600">DÍAS VEN.</th>
                <th className="px-4 py-3 text-right text-gray-600">NOTA CR.</th>
                <th className="px-4 py-3 text-right text-gray-600">ABONO</th>
                <th className="px-4 py-3 text-right text-gray-600">BALANCE</th>
              </tr>
            </thead>
            <tbody id="ec-tbody">
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Busca un cliente para ver su estado de cuenta</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {tab === 'historial' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Historial de Cliente</h3>
          <div className="relative mb-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Cliente</label>
            <input type="text" placeholder="🔍 Escriba el nombre del cliente..." autoComplete="off"
              className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => {
                const val = e.target.value.toLowerCase()
                const list = document.getElementById('hist-cliente-list')
                list.innerHTML = ''
                document.getElementById('hist-tbody').innerHTML = ''
                document.getElementById('hist-titulo').innerHTML = ''
                if (val.length < 2) return
                const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                filtrados.forEach(c => {
                  const div = document.createElement('div')
                  div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b'
                  div.textContent = c.nombre
                  div.onmousedown = () => {
                    e.target.value = c.nombre
                    list.innerHTML = ''
                    const condDias = { contado: 0, '7_dias': 7, '15_dias': 15, '30_dias': 30, '45_dias': 45, '60_dias': 60 }
                    const diasCondicion = condDias[c.condiciones] || 0
                    const facturasCliente = todasFacturas
                      .filter(f => f.customer_id === c.id && (f.estado === 'emitida' || f.estado === 'pagada'))
                      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                      .slice(0, 10)
                    const hoy = new Date()
                    document.getElementById('hist-titulo').innerHTML = `
                      <div class="mb-3 p-3 bg-blue-50 rounded-lg text-sm">
                        <span class="font-medium text-gray-700">Cliente: </span><span class="text-blue-700 font-bold">${c.nombre}</span>
                        <span class="ml-4 font-medium text-gray-700">Condición: </span><span class="text-gray-600">${c.condiciones?.replace(/_/g, ' ') || 'contado'} (${diasCondicion} días)</span>
                      </div>`
                    const filas = facturasCliente.map(f => {
                      const fechaEmitida = new Date(f.creado_en)
                      const fechaVencimientoCondicion = new Date(fechaEmitida)
                      fechaVencimientoCondicion.setDate(fechaVencimientoCondicion.getDate() + diasCondicion)
                      const fechaPago = f.estado === 'pagada' ? new Date(f.actualizado_en) : null
                      const fechaRef = fechaPago || hoy
                      const diasVencido = Math.max(0, Math.floor((fechaRef - fechaVencimientoCondicion) / (1000*60*60*24)))
                      const vencidoColor = diasVencido === 0 ? 'color:#16a34a' : diasVencido <= 30 ? 'color:#f97316' : 'color:#dc2626;font-weight:bold'
                      return `<tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3 font-mono text-sm">${f.ncf || 'N/A'}</td>
                        <td class="px-4 py-3 text-right text-sm font-medium">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td class="px-4 py-3 text-sm">${fechaEmitida.toLocaleDateString('es-DO')}</td>
                        <td class="px-4 py-3 text-sm">${fechaPago ? fechaPago.toLocaleDateString('es-DO') : '-'}</td>
                        <td class="px-4 py-3 text-sm text-center" style="${vencidoColor}">${diasVencido > 0 ? diasVencido+' días' : 'Al día'}</td>
                        <td class="px-4 py-3 text-sm">
                          <span class="px-2 py-1 rounded text-xs font-medium ${f.estado === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                            ${f.estado.toUpperCase()}
                          </span>
                        </td>
                      </tr>`
                    }).join('')
                    document.getElementById('hist-tbody').innerHTML = filas || '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No hay facturas</td></tr>'
                  }
                  list.appendChild(div)
                })
              }}
              onBlur={() => setTimeout(() => { document.getElementById('hist-cliente-list').innerHTML = '' }, 200)}
            />
            <div id="hist-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
          </div>
          <div id="hist-titulo"></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">FACTURA</th>
                <th className="px-4 py-3 text-right text-gray-600">VALOR</th>
                <th className="px-4 py-3 text-left text-gray-600">FECHA EMITIDA</th>
                <th className="px-4 py-3 text-left text-gray-600">FECHA PAGO</th>
                <th className="px-4 py-3 text-center text-gray-600">DÍAS VENCIDO</th>
                <th className="px-4 py-3 text-left text-gray-600">ESTADO</th>
              </tr>
            </thead>
            <tbody id="hist-tbody">
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Busca un cliente para ver su historial</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {btModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Seleccionar Impresora</h3>
              <p className="text-sm text-gray-500 mt-1">Elige el dispositivo Bluetooth</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {btDevices.length === 0 ? (
                <p className="p-4 text-center text-gray-400 text-sm">No hay dispositivos emparejados</p>
              ) : btDevices.map(d => (
                <button key={d.address} className="w-full text-left px-4 py-3 border-b hover:bg-blue-50 flex items-center gap-3"
                  onClick={async () => {
                    setBtModal(false)
                    localStorage.setItem('bt_printer_address', d.address)
                    localStorage.setItem('bt_printer_name', d.name)
                    try {
                      await imprimirEnDispositivo(d.address, btLineas)
                      alert('✅ Impreso en ' + d.name)
                    } catch (err) {
                      alert('❌ ' + err)
                    }
                  }}>
                  <span className="text-2xl">🖨️</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.address}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 flex justify-end">
              <button onClick={() => setBtModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {modalResumen && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-blue-700">Resumen — CxC</h2>
            <button onClick={() => setModalResumen(null)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">← Volver</button>
          </div>
          <p className="text-gray-400 text-sm mb-6">Fecha: {modalResumen.fecha}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Cuentas</p>
              <p className="text-xl font-bold text-blue-600">RD$ {modalResumen.totalCuentas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
            </div>
            <div className="bg-orange-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Pendiente</p>
              <p className="text-xl font-bold text-orange-500">RD$ {modalResumen.totalPendiente.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
            </div>
            <div className="bg-green-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Cobrado Total</p>
              <p className="text-xl font-bold text-green-600">RD$ {modalResumen.totalCobrado.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
            </div>
            <div className="bg-red-50 border rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Vencidas</p>
              <p className="text-xl font-bold text-red-600">RD$ {modalResumen.totalVencidas.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}