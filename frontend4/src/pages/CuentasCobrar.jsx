import { useState, useEffect } from 'react'
import API from '../services/api'

export default function CuentasCobrar() {
  const [tab, setTab] = useState('cuentas')
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Cuentas por Cobrar</h2>
        <button onClick={() => window.print()}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm flex items-center gap-2">
          🖨️ Imprimir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        {[
          { id: 'cuentas', label: 'Cuentas por Cobrar' },
          { id: 'cobro_vendedor', label: 'Cobro por Vendedor' },
          { id: 'cxc_vendedor', label: 'Cuenta por Cobrar por Vendedor' },
        ].map(t => (
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
                  <p className="text-2xl font-bold text-blue-600">{emitidas.length}</p>
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
                  <p className="text-2xl font-bold text-red-600">{vencidas.length}</p>
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
          <div className="flex gap-4 items-end mb-6 flex-wrap">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select id="cob-vendedor"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                <option value="">-- Seleccionar vendedor --</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={() => {
                const vendedorId = document.getElementById('cob-vendedor').value
                if (!vendedorId) return
                const clientesVendedor = clientes.filter(c => c.vendedor_id === vendedorId)
                const idsClientes = clientesVendedor.map(c => c.id)
                const filtradas = todasFacturas.filter(f => {
                  if (!idsClientes.includes(f.customer_id)) return false
                  if (f.estado !== 'pagada') return false
                  const d = new Date(f.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  return true
                })
                const totalCobrado = filtradas.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
                const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
                document.getElementById('cob-resultado').innerHTML = `
                  <p class="text-sm text-gray-600">Facturas pagadas: <span class="font-bold text-gray-800">${filtradas.length}</span></p>
                  <p class="text-sm text-gray-600">Subtotal: <span class="font-medium">RD$${totalSubtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-sm text-gray-600">ITBIS: <span class="font-medium">RD$${totalItbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                  <p class="text-lg font-bold text-green-700 mt-1">Total Cobrado: RD$${totalCobrado.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>`
                const tbody = document.getElementById('cob-tbody')
                tbody.innerHTML = filtradas.length === 0
                  ? '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No hay facturas pagadas</td></tr>'
                  : filtradas.map(f => `
                    <tr class="border-t hover:bg-gray-50">
                      <td class="px-4 py-3 font-mono text-sm">${f.ncf || 'N/A'}</td>
                      <td class="px-4 py-3 text-sm">${f.cliente_nombre || 'Consumidor Final'}</td>
                      <td class="px-4 py-3 text-right text-sm font-medium text-green-700">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td class="px-4 py-3 text-sm">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                    </tr>`).join('')
              }}>
              Buscar
            </button>
          </div>
          <div id="cob-resultado" className="mb-4 text-right bg-green-50 p-3 rounded-lg min-h-8"></div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select id="cxc-vendedor"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                <option value="">-- Seleccionar vendedor --</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
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
            <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
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
    </div>
  )
}