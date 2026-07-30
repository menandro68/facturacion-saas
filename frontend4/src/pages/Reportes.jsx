import { useState, useEffect } from 'react'
import API from '../services/api'
import * as XLSX from 'xlsx'

export default function Reportes() {
  const [ventas, setVentas] = useState(null)
  const [itbis, setItbis] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showReporteOperador, setShowReporteOperador] = useState(false)
  const [operadores, setOperadores] = useState([])
  const [reporteOpId, setReporteOpId] = useState('')
  const [reporteData, setReporteData] = useState(null)
  const [reporteLoading, setReporteLoading] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [actividadVer, setActividadVer] = useState(null)
  const [show606, setShow606] = useState(false)
  const [mes606, setMes606] = useState(new Date().getMonth() + 1)
  const [anio606, setAnio606] = useState(new Date().getFullYear())
  const [data606, setData606] = useState(null)
  const [loading606, setLoading606] = useState(false)
  const [show607, setShow607] = useState(false)
  const [mes607, setMes607] = useState(new Date().getMonth() + 1)
  const [anio607, setAnio607] = useState(new Date().getFullYear())
  const [data607, setData607] = useState(null)
  const [loading607, setLoading607] = useState(false)
  const [showCajas, setShowCajas] = useState(false)
  const [dataCajas, setDataCajas] = useState([])
  const [loadingCajas, setLoadingCajas] = useState(false)
  const [buscarCajero, setBuscarCajero] = useState('')
  const [rncEmpresa, setRncEmpresa] = useState('')

  const fetchReportes = async () => {
    setLoading(true)
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta

      const [v, i, c] = await Promise.all([
        API.get('/reports/ventas', { params }),
        API.get('/reports/itbis', { params }),
        API.get('/reports/clientes')
      ])
      setVentas(v.data.data)
      setItbis(i.data.data)
      setClientes(c.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
    fetchReportes()
    API.get('/operadores').then(r => setOperadores(r.data.data || [])).catch(() => {})
    API.get('/tenant/profile').then(t => setRncEmpresa(((t.data.data?.rnc) || '').replace(/\D/g, ''))).catch(() => {})
  }, [])

  const cargarCajas = async () => {
    setLoadingCajas(true)
    try {
      const res = await API.get('/pos/caja/historial')
      setDataCajas(res.data.data || [])
    } catch (e) {
      console.error('Error cargando historial de cajas:', e)
      setDataCajas([])
    } finally {
      setLoadingCajas(false)
    }
  }

  const fmtFechaCaja = (f) => {
    if (!f) return 'N/D'
    return new Date(f).toLocaleString('es-DO', {
      timeZone: 'America/Santo_Domingo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const fmtCaja = (n) => (parseFloat(n) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const imprimirCajas = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('⚠️ Habilite las ventanas emergentes para imprimir.'); return }
    const filas = cajasFiltradas.map(c => `
      <tr>
        <td>${c.usuario_nombre || 'N/D'}</td>
        <td>${fmtFechaCaja(c.fecha_apertura)}</td>
        <td>${fmtFechaCaja(c.fecha_cierre)}</td>
        <td style="text-align:center">${c.cantidad_facturas || 0}</td>
        <td style="text-align:right">RD$ ${fmtCaja(c.monto_apertura)}</td>
        <td style="text-align:right">RD$ ${fmtCaja(c.total_efectivo)}</td>
        <td style="text-align:right">RD$ ${fmtCaja(c.total_tarjeta)}</td>
        <td style="text-align:right">RD$ ${fmtCaja(c.total_transferencia)}</td>
        <td style="text-align:right"><b>RD$ ${fmtCaja(c.total_ventas)}</b></td>
        <td style="text-align:right; color:green"><b>RD$ ${fmtCaja(c.efectivo_esperado)}</b></td>
      </tr>`).join('')
    const filtros = []
    if (buscarCajero.trim()) filtros.push(`Cajero: ${buscarCajero.trim()}`)
    if (desde) filtros.push(`Desde: ${desde}`)
    if (hasta) filtros.push(`Hasta: ${hasta}`)
    w.document.write(`
      <html><head><title>Historial de Cajas</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; }
        .filtros { color: #555; margin-bottom: 12px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; }
        th { background: #f0f0f0; text-align: left; }
        @media print { body { margin: 8px; } }
      </style></head><body>
      <h2>🗄️ Historial de Cajas — Punto de Venta</h2>
      <div class="filtros">${filtros.length ? filtros.join(' | ') : 'Todos los cierres'} — ${cajasFiltradas.length} cierre(s) — Generado: ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}</div>
      <table>
        <thead><tr>
          <th>Operador</th><th>Apertura</th><th>Cierre</th><th>Facturas</th>
          <th>Monto Apertura</th><th>Efectivo</th><th>Tarjeta</th><th>Transf.</th>
          <th>Total Ventas</th><th>Gaveta</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`)
    w.document.close()
  }

  const cajasFiltradas = dataCajas.filter(c => {
    // Filtro por nombre de operador/cajero
    if (buscarCajero.trim()) {
      const nombre = (c.usuario_nombre || '').toLowerCase()
      if (!nombre.includes(buscarCajero.trim().toLowerCase())) return false
    }
    // Filtro por rango de fechas (usa los campos Desde/Hasta de arriba)
    const fechaCierre = c.fecha_cierre ? new Date(c.fecha_cierre) : null
    if (desde && fechaCierre) {
      const fDesde = new Date(desde + 'T00:00:00')
      if (fechaCierre < fDesde) return false
    }
    if (hasta && fechaCierre) {
      const fHasta = new Date(hasta + 'T23:59:59')
      if (fechaCierre > fHasta) return false
    }
    return true
  })

  if (loading) return <p className="text-gray-500 p-6">Cargando reportes...</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Reportes</h2>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
  <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
          <input type="date" id="rep-desde" value={desde} onChange={e => setDesde(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('rep-hasta')?.focus() } }}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
          <input type="date" id="rep-hasta" value={hasta} onChange={e => setHasta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-filtrar-reporte')?.click() } }}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
       <button id="btn-filtrar-reporte" onClick={fetchReportes}
          className="hidden">
          Filtrar
        </button>
        <button onClick={() => { setDesde(''); setHasta(''); }}
          className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
          Limpiar
        </button>
        <button onClick={() => setShowReporteOperador(!showReporteOperador)}
          className={`px-4 py-2 rounded text-sm ${showReporteOperador ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
          📊 Operador
        </button>
        <button onClick={() => setShow606(!show606)}
          className={`px-4 py-2 rounded text-sm ${show606 ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
          📄 Reporte 606
        </button>
        <button onClick={() => setShow607(!show607)}
          className={`px-4 py-2 rounded text-sm ${show607 ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}>
          📄 Reporte 607
        </button>
        <button onClick={() => { setShowCajas(!showCajas); if (!showCajas && dataCajas.length === 0) cargarCajas() }}
          className={`px-4 py-2 rounded text-sm ${showCajas ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
          🗄️ Cajas
        </button>
      </div>

      {/* Reporte de Operador */}
      {showReporteOperador && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Reporte de Operador</h3>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Operador *</label>
                <div className="relative">
             <input
                    id="rep-operador-input"
                    type="text"
                    placeholder="🔍 Buscar operador..."
                    autoComplete="off"
                    autoFocus
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={e => {
                      setReporteOpId('')
                      const val = e.target.value.toLowerCase()
                      const list = document.getElementById('rep-operador-list')
                      list.innerHTML = ''
                      if (val) {
                        const filtrados = operadores.filter(op => op.nombre.toLowerCase().includes(val) || (op.username || '').toLowerCase().includes(val)).slice(0, 10)
                        filtrados.forEach(op => {
                          const div = document.createElement('div')
                          div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                          div.textContent = `${op.nombre} (${op.username})`
                          div.onmousedown = () => {
                            document.getElementById('rep-operador-input').value = `${op.nombre} (${op.username})`
                            setReporteOpId(op.id)
                            list.innerHTML = ''
                          }
                          list.appendChild(div)
                        })
                      }
                    }}
                    onKeyDown={e => {
                      const list = document.getElementById('rep-operador-list')
                      const opciones = list.querySelectorAll('div')
                      if (opciones.length === 0) return
                      let idx = Array.from(opciones).findIndex(o => o.classList.contains('bg-blue-100'))
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                        idx = (idx + 1) % opciones.length
                        opciones[idx].classList.add('bg-blue-100')
                        opciones[idx].scrollIntoView({ block: 'nearest' })
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                        idx = idx <= 0 ? opciones.length - 1 : idx - 1
                        opciones[idx].classList.add('bg-blue-100')
                        opciones[idx].scrollIntoView({ block: 'nearest' })
                 } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (idx >= 0) {
                          opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                          setTimeout(() => document.getElementById('rep-generar-btn')?.click(), 200)
                        }
                      }
                    }}
                    onBlur={() => setTimeout(() => { document.getElementById('rep-operador-list').innerHTML = '' }, 200)}
                  />
                  <div id="rep-operador-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
                </div>
              </div>
              <div>
            <button id="rep-generar-btn" onClick={async () => {
                  if (!reporteOpId) {
                    alert('Selecciona un operador primero')
                    return
                  }
                  setReporteLoading(true)
                  try {
                    const params = new URLSearchParams({ operador_id: reporteOpId })
                    if (desde) params.append('desde', desde)
                    if (hasta) params.append('hasta', hasta)
                    const res = await API.get(`/operadores/reporte/actividad?${params.toString()}`)
                    setReporteData(res.data.data)
                  } catch (err) {
                    alert('Error al generar reporte: ' + (err.response?.data?.mensaje || err.message))
                  } finally {
                    setReporteLoading(false)
                  }
                }}
                  disabled={reporteLoading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {reporteLoading ? 'Generando...' : '🔍 Generar Reporte'}
                </button>
              </div>
            </div>
            {reporteData && (
              <div className="mt-3 flex justify-end no-print">
                <button onClick={() => window.print()}
                  className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
                  🖨️ Imprimir Reporte
                </button>
              </div>
            )}
          </div>

          {reporteData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {reporteData.kpis.facturas.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 relative">
                  <div className="text-xs text-gray-500 mb-1">🧾 Facturas emitidas</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.facturas.cantidad}</div>
                  <div className="text-sm text-blue-600 font-medium">RD$ {reporteData.kpis.facturas.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('facturas')}
                    className="absolute top-2 right-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                    Ver
                  </button>
                </div>
                )}
                {reporteData.kpis.pagos.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500 relative">
                  <div className="text-xs text-gray-500 mb-1">💰 Pagos recibidos</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.pagos.cantidad}</div>
                  <div className="text-sm text-green-600 font-medium">RD$ {reporteData.kpis.pagos.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('pagos')}
                    className="absolute top-2 right-2 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                    Ver
                  </button>
                </div>
                )}
                {reporteData.kpis.pedidos.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500 relative">
                  <div className="text-xs text-gray-500 mb-1">📋 Pedidos creados</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.pedidos.cantidad}</div>
                  <div className="text-sm text-purple-600 font-medium">RD$ {reporteData.kpis.pedidos.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('pedido')}
                    className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">
                    Ver
                  </button>
                </div>
                )}
                {reporteData.kpis.cotizaciones.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 relative">
                  <div className="text-xs text-gray-500 mb-1">📝 Cotizaciones</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.cotizaciones.cantidad}</div>
                  <div className="text-sm text-yellow-600 font-medium">RD$ {reporteData.kpis.cotizaciones.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('cotizacion')}
                    className="absolute top-2 right-2 text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700">
                    Ver
                  </button>
                </div>
                )}
                {reporteData.kpis.anuladas.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500 relative">
                  <div className="text-xs text-gray-500 mb-1">❌ Anulaciones</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.anuladas.cantidad}</div>
                  <div className="text-sm text-red-600 font-medium">RD$ {reporteData.kpis.anuladas.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('anulada')}
                    className="absolute top-2 right-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                    Ver
                  </button>
                </div>
                )}
          {reporteData.kpis.notas_credito.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500 relative">
                  <div className="text-xs text-gray-500 mb-1">💵 Notas de crédito</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.notas_credito.cantidad}</div>
                  <div className="text-sm text-orange-600 font-medium">RD$ {reporteData.kpis.notas_credito.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                  <button onClick={() => setModalVer('nota_credito')}
                    className="absolute top-2 right-2 text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700">
                    Ver
                  </button>
                </div>
                )}
                {reporteData.kpis.devoluciones && reporteData.kpis.devoluciones.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500 relative">
                  <div className="text-xs text-gray-500 mb-1">🔄 Devoluciones</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.devoluciones.cantidad}</div>
                  <div className="text-sm text-pink-600 font-medium">RD$ {reporteData.kpis.devoluciones.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                )}
                {reporteData.kpis.conduces && reporteData.kpis.conduces.cantidad > 0 && (
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500 relative">
                  <div className="text-xs text-gray-500 mb-1">🚚 Conduces</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.conduces.cantidad}</div>
                  <div className="text-sm text-teal-600 font-medium">RD$ {reporteData.kpis.conduces.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">📋 Detalle de Transacciones ({reporteData.detalle_facturas.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Tipo</th>
                        <th className="px-4 py-2 text-left text-gray-600">NCF</th>
                        <th className="px-4 py-2 text-left text-gray-600">Cliente</th>
                        <th className="px-4 py-2 text-right text-gray-600">Total</th>
                        <th className="px-4 py-2 text-left text-gray-600">Estado</th>
                        <th className="px-4 py-2 text-left text-gray-600">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteData.detalle_facturas.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Sin transacciones en el período</td></tr>
                      ) : reporteData.detalle_facturas.map(f => (
                        <tr key={f.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{f.tipo}</span></td>
                          <td className="px-4 py-2 font-mono text-xs">{f.ncf || '-'}</td>
                          <td className="px-4 py-2">{f.cliente_nombre || 'Consumidor Final'}</td>
                          <td className="px-4 py-2 text-right font-medium">RD$ {parseFloat(f.total).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2"><span className="text-xs">{f.estado}</span></td>
                          <td className="px-4 py-2 text-xs text-gray-500">{new Date(f.creado_en).toLocaleString('es-DO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">💰 Detalle de Pagos ({reporteData.detalle_pagos.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">NCF Factura</th>
                        <th className="px-4 py-2 text-left text-gray-600">Cliente</th>
                        <th className="px-4 py-2 text-right text-gray-600">Monto</th>
                        <th className="px-4 py-2 text-left text-gray-600">Método</th>
                        <th className="px-4 py-2 text-left text-gray-600">Estado</th>
                        <th className="px-4 py-2 text-left text-gray-600">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteData.detalle_pagos.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Sin pagos en el período</td></tr>
                      ) : reporteData.detalle_pagos.map(p => (
                        <tr key={p.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{p.ncf || '-'}</td>
                          <td className="px-4 py-2">{p.cliente_nombre || 'Consumidor Final'}</td>
                          <td className="px-4 py-2 text-right font-medium text-green-600">RD$ {parseFloat(p.monto).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2 text-xs">{p.metodo}</td>
                          <td className="px-4 py-2"><span className="text-xs">{p.estado}</span></td>
                          <td className="px-4 py-2 text-xs text-gray-500">{new Date(p.creado_en).toLocaleString('es-DO')}</td>
                        </tr>
          ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {reporteData.registro_actividad && reporteData.registro_actividad.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">📋 Registro de Actividad ({reporteData.registro_actividad.length})</h3>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Módulo</th>
                        <th className="px-4 py-2 text-left text-gray-600">Acción</th>
             <th className="px-4 py-2 text-left text-gray-600">Descripción</th>
                        <th className="px-4 py-2 text-left text-gray-600">Fecha</th>
                        <th className="px-4 py-2 text-left text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteData.registro_actividad.map((a, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium capitalize">{(a.modulo || '').replace(/_/g, ' ')}</span></td>
                          <td className="px-4 py-2 text-xs capitalize">{(a.accion || '').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-xs">{a.descripcion}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{new Date(a.creado_en).toLocaleString('es-DO')}</td>
                          <td className="px-4 py-2">
                            <button onClick={() => setActividadVer(a)}
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {actividadVer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setActividadVer(null)}>
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                    <h3 className="font-semibold text-gray-800 mb-4">📋 Detalle de Actividad</h3>
                    <div className="space-y-3 text-sm">
                      <div><span className="text-gray-500">Módulo:</span> <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium capitalize">{(actividadVer.modulo || '').replace(/_/g, ' ')}</span></div>
                      <div><span className="text-gray-500">Acción:</span> <span className="capitalize font-medium">{(actividadVer.accion || '').replace(/_/g, ' ')}</span></div>
                      <div><span className="text-gray-500">Descripción:</span><br/><span className="font-medium">{actividadVer.descripcion}</span></div>
                      <div><span className="text-gray-500">Fecha y hora:</span> <span className="font-medium">{new Date(actividadVer.creado_en).toLocaleString('es-DO')}</span></div>
                      {actividadVer.referencia_id && (
                        <div><span className="text-gray-500">Referencia:</span> <span className="font-mono text-xs">{actividadVer.referencia_id}</span></div>
                      )}
                    </div>
                    <div className="mt-6 text-right">
                      <button onClick={() => setActividadVer(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Cerrar</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {modalVer && reporteData && (() => {
            const config = {
              facturas: { titulo: '🧾 Facturas Emitidas', filtro: reporteData.detalle_facturas.filter(f => f.estado === 'emitida'), esPago: false },
              pedido: { titulo: '📋 Pedidos Creados', filtro: reporteData.detalle_facturas.filter(f => f.estado === 'pedido'), esPago: false },
              cotizacion: { titulo: '📝 Cotizaciones', filtro: reporteData.detalle_facturas.filter(f => f.estado === 'cotizacion'), esPago: false },
              anulada: { titulo: '❌ Anulaciones', filtro: reporteData.detalle_facturas.filter(f => f.estado === 'anulada'), esPago: false },
              nota_credito: { titulo: '💵 Notas de Crédito', filtro: reporteData.detalle_facturas.filter(f => f.estado === 'nota_credito'), esPago: false },
              pagos: { titulo: '💰 Pagos Recibidos', filtro: reporteData.detalle_pagos, esPago: true }
            }
            const c = config[modalVer]
            if (!c) return null
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">{c.titulo} ({c.filtro.length})</h3>
                  </div>
                  <div id="modal-print-generico" className="px-6 py-4 overflow-y-auto flex-1">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600">{c.esPago ? 'NCF Factura' : 'NCF'}</th>
                          <th className="px-3 py-2 text-left text-gray-600">Cliente</th>
                          <th className="px-3 py-2 text-right text-gray-600">{c.esPago ? 'Monto' : 'Total'}</th>
                          <th className="px-3 py-2 text-left text-gray-600">{c.esPago ? 'Método' : 'Estado'}</th>
                          <th className="px-3 py-2 text-left text-gray-600">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.filtro.length === 0 ? (
                          <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400">Sin registros en el período</td></tr>
                        ) : c.filtro.map(f => (
                          <tr key={f.id} className="border-t">
                            <td className="px-3 py-2 font-mono">{f.ncf || 'N/A'}</td>
                            <td className="px-3 py-2">{f.cliente_nombre || 'Consumidor Final'}</td>
                            <td className="px-3 py-2 text-right">RD$ {parseFloat(f.total || f.monto || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                            <td className="px-3 py-2">{c.esPago ? f.metodo : f.estado}</td>
                            <td className="px-3 py-2">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t flex gap-3 justify-end">
                    <button onClick={() => {
                      const contenido = document.getElementById('modal-print-generico').innerHTML
                      const w = window.open('', '_blank')
                      w.document.write(`<!DOCTYPE html><html><head><title>${c.titulo}</title>
                        <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1e40af;color:white;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #e2e8f0}</style>
                        </head><body><h2>${c.titulo}</h2>${contenido}<script>window.onload=()=>window.print()</script></body></html>`)
                      w.document.close()
                    }} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">🖨️ Imprimir</button>
                    <button onClick={() => setModalVer(null)}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Volver</button>
                  </div>
                </div>
              </div>
            )
          })()}
          {!reporteData && !reporteLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center text-blue-700 text-sm">
              📊 Selecciona un operador y haz clic en <strong>"Generar Reporte"</strong> para ver su actividad
            </div>
          )}
        </div>
      )}

      {/* Reporte 606 - Compras DGII */}
      {show606 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Reporte 606 — Compras de Bienes y Servicios (DGII)</h3>
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select value={mes606} onChange={e => setMes606(parseInt(e.target.value))}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select value={anio606} onChange={e => setAnio606(parseInt(e.target.value))}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {[0, 1, 2, 3, 4].map(n => {
                  const a = new Date().getFullYear() - n
                  return <option key={a} value={a}>{a}</option>
                })}
              </select>
            </div>
            <button onClick={async () => {
              setLoading606(true)
              try {
                const res = await API.get(`/purchase-orders/reporte-606?mes=${mes606}&anio=${anio606}`)
                setData606(res.data.data)
              } catch (err) {
                alert('Error al generar el 606: ' + (err.response?.data?.mensaje || err.message))
              } finally {
                setLoading606(false)
              }
            }} disabled={loading606}
              className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50">
              {loading606 ? 'Generando...' : '🔍 Generar 606'}
            </button>
            {data606 && data606.incluidas.length > 0 && (
              <button onClick={() => {
                const periodo = `${anio606}${String(mes606).padStart(2, '0')}`
                const rncEmp = rncEmpresa
                const lineas = data606.incluidas.map(o => {
                  const rnc = (o.proveedor_rnc || '').replace(/\D/g, '')
                  const tipoId = rnc.length === 11 ? '2' : '1'
                  const total = parseFloat(o.total || 0)
                  const base = total / 1.18
                  const itbis = total - base
                  const f = new Date(o.creado_en)
                  const fechaAAAAMM = `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}`
                  const fechaDD = String(f.getDate()).padStart(2, '0')
                  const formaPago = o.estado_pago === 'pagada' ? '01' : '04'
                  return `${rnc}|${tipoId}|09|${o.ncf_proveedor}||${fechaAAAAMM}|${fechaDD}|||0.00|${base.toFixed(2)}|${base.toFixed(2)}|${itbis.toFixed(2)}|0.00|0.00|0.00|0.00|0.00||0.00|0.00|0.00|0.00|0.00|${formaPago}`
                })
                const contenido = [`606|${rncEmp}|${periodo}|${data606.incluidas.length}`, ...lineas].join('\r\n')
                const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `DGII_F_606_${rncEmp}_${periodo}.txt`
                a.click()
                URL.revokeObjectURL(url)
              }}
                className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
     💾 Exportar TXT DGII
              </button>
            )}
            {data606 && data606.incluidas.length > 0 && (
              <button onClick={() => {
                const periodo = `${anio606}${String(mes606).padStart(2, '0')}`
                const filas = data606.incluidas.map(o => {
                  const total = parseFloat(o.total || 0)
                  const base = total / 1.18
                  const itbis = total - base
                  return {
                    'Orden': o.numero || '',
                    'Proveedor': o.proveedor_nombre || '',
                    'RNC': o.proveedor_rnc || '',
                    'NCF': o.ncf_proveedor || '',
                    'Fecha': new Date(o.creado_en).toLocaleDateString('es-DO'),
                    'Monto (sin ITBIS)': parseFloat(base.toFixed(2)),
                    'ITBIS': parseFloat(itbis.toFixed(2)),
                    'Total': parseFloat(total.toFixed(2))
                  }
                })
                const totBase = filas.reduce((s, f) => s + f['Monto (sin ITBIS)'], 0)
                const totItbis = filas.reduce((s, f) => s + f['ITBIS'], 0)
                const totGeneral = filas.reduce((s, f) => s + f['Total'], 0)
                filas.push({
                  'Orden': '', 'Proveedor': '', 'RNC': '', 'NCF': '', 'Fecha': 'TOTALES:',
                  'Monto (sin ITBIS)': parseFloat(totBase.toFixed(2)),
                  'ITBIS': parseFloat(totItbis.toFixed(2)),
                  'Total': parseFloat(totGeneral.toFixed(2))
                })
                const ws = XLSX.utils.json_to_sheet(filas)
                ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Reporte 606')
                XLSX.writeFile(wb, `Reporte_606_${periodo}.xlsx`)
              }}
                className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-800">
                📊 Exportar Excel
              </button>
            )}
          </div>

          {data606 && data606.sin_ncf.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-sm text-yellow-800">
              ⚠️ <strong>{data606.sin_ncf.length} orden(es) recibida(s) SIN NCF</strong> — no incluidas en el 606: {data606.sin_ncf.map(o => o.numero).join(', ')}
            </div>
          )}

          {data606 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">📄 Compras incluidas ({data606.incluidas.length})</h3>
                <span className="text-sm text-gray-500">Período: {String(mes606).padStart(2, '0')}/{anio606}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Orden</th>
                      <th className="px-4 py-2 text-left text-gray-600">Proveedor</th>
                      <th className="px-4 py-2 text-left text-gray-600">RNC</th>
                      <th className="px-4 py-2 text-left text-gray-600">NCF</th>
                      <th className="px-4 py-2 text-left text-gray-600">Fecha</th>
                      <th className="px-4 py-2 text-right text-gray-600">Monto (sin ITBIS)</th>
                      <th className="px-4 py-2 text-right text-gray-600">ITBIS</th>
                      <th className="px-4 py-2 text-right text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data606.incluidas.length === 0 ? (
                      <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay compras con NCF en este período</td></tr>
                    ) : data606.incluidas.map(o => {
                      const total = parseFloat(o.total || 0)
                      const base = total / 1.18
                      const itbis = total - base
                      return (
                        <tr key={o.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{o.numero}</td>
                          <td className="px-4 py-2">{o.proveedor_nombre || '-'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{o.proveedor_rnc || '⚠️ Sin RNC'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{o.ncf_proveedor}</td>
                          <td className="px-4 py-2 text-xs">{new Date(o.creado_en).toLocaleDateString('es-DO')}</td>
                          <td className="px-4 py-2 text-right">RD${base.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2 text-right text-orange-600">RD${itbis.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2 text-right font-medium">RD${total.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {data606.incluidas.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-right">TOTALES:</td>
                        <td className="px-4 py-2 text-right">RD${data606.incluidas.reduce((s, o) => s + parseFloat(o.total || 0) / 1.18, 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 text-right text-orange-600">RD${data606.incluidas.reduce((s, o) => s + (parseFloat(o.total || 0) - parseFloat(o.total || 0) / 1.18), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 text-right">RD${data606.incluidas.reduce((s, o) => s + parseFloat(o.total || 0), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial de Cajas POS */}
      {showCajas && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">🗄️ Historial de Cajas — Punto de Venta</h3>
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-center">
            <input
              type="text"
              value={buscarCajero}
              onChange={(e) => setBuscarCajero(e.target.value)}
              placeholder="🔍 Buscar operador o cajero..."
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-72"
            />
           <p className="text-xs text-gray-400">
                {cajasFiltradas.length} cierre(s) — Usa los campos Desde/Hasta de arriba para filtrar por fecha
              </p>
              <button
                onClick={imprimirCajas}
                disabled={cajasFiltradas.length === 0}
                className={`ml-auto px-4 py-2 rounded text-sm font-bold text-white ${
                  cajasFiltradas.length > 0 ? 'bg-gray-700 hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                🖨️ Imprimir
              </button>
          </div>
          {loadingCajas ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Cargando historial...</div>
          ) : cajasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🗄️</p>
              <p className="text-sm">No hay cierres de caja registrados todavía</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Operador</th>
                    <th className="px-3 py-2 text-left">Apertura</th>
                    <th className="px-3 py-2 text-left">Cierre</th>
                    <th className="px-3 py-2 text-center">Facturas</th>
                    <th className="px-3 py-2 text-right">Monto Apertura</th>
                    <th className="px-3 py-2 text-right">💵 Efectivo</th>
                    <th className="px-3 py-2 text-right">💳 Tarjeta</th>
                    <th className="px-3 py-2 text-right">🏦 Transf.</th>
                    <th className="px-3 py-2 text-right">Total Ventas</th>
                    <th className="px-3 py-2 text-right">Gaveta</th>
                  </tr>
                </thead>
                <tbody>
                  {cajasFiltradas.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 font-semibold">{c.usuario_nombre || 'N/D'}</td>
                      <td className="px-3 py-2 text-xs">{fmtFechaCaja(c.fecha_apertura)}</td>
                      <td className="px-3 py-2 text-xs">{fmtFechaCaja(c.fecha_cierre)}</td>
                      <td className="px-3 py-2 text-center">{c.cantidad_facturas || 0}</td>
                      <td className="px-3 py-2 text-right">RD$ {fmtCaja(c.monto_apertura)}</td>
                      <td className="px-3 py-2 text-right">RD$ {fmtCaja(c.total_efectivo)}</td>
                      <td className="px-3 py-2 text-right">RD$ {fmtCaja(c.total_tarjeta)}</td>
                      <td className="px-3 py-2 text-right">RD$ {fmtCaja(c.total_transferencia)}</td>
                      <td className="px-3 py-2 text-right font-bold">RD$ {fmtCaja(c.total_ventas)}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">RD$ {fmtCaja(c.efectivo_esperado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reporte 607 - Ventas DGII */}
      {show607 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Reporte 607 — Ventas de Bienes y Servicios (DGII)</h3>
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select value={mes607} onChange={e => setMes607(parseInt(e.target.value))}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select value={anio607} onChange={e => setAnio607(parseInt(e.target.value))}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {[0, 1, 2, 3, 4].map(n => {
                  const a = new Date().getFullYear() - n
                  return <option key={a} value={a}>{a}</option>
                })}
              </select>
            </div>
            <button onClick={async () => {
              setLoading607(true)
              try {
                const res = await API.get(`/reports/reporte-607?mes=${mes607}&anio=${anio607}`)
                setData607(res.data.data)
              } catch (err) {
                alert('Error al generar el 607: ' + (err.response?.data?.mensaje || err.message))
              } finally {
                setLoading607(false)
              }
            }} disabled={loading607}
              className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700 disabled:opacity-50">
              {loading607 ? 'Generando...' : '🔍 Generar 607'}
            </button>
            {data607 && data607.incluidas.length > 0 && (
              <button onClick={() => {
                const periodo = `${anio607}${String(mes607).padStart(2, '0')}`
                 const rncEmp = rncEmpresa
                const lineas = data607.incluidas.map(f => {
                  const doc = (f.rnc_cedula || '').replace(/\D/g, '')
                  const tipoId = doc.length === 11 ? '2' : (doc ? '1' : '2')
                  const anulada = f.estado === 'anulada'
                  const base = anulada ? 0 : parseFloat(f.subtotal || 0)
                  const itbis = anulada ? 0 : parseFloat(f.itbis || 0)
                  const total = anulada ? 0 : parseFloat(f.total || 0)
                  const fe = new Date(f.fecha_emision || f.creado_en)
                  const fechaAAAAMM = `${fe.getFullYear()}${String(fe.getMonth() + 1).padStart(2, '0')}`
                  const fechaDD = String(fe.getDate()).padStart(2, '0')
                  const efectivo = f.estado === 'pagada' ? total : 0
                  const credito = f.estado === 'pagada' ? 0 : total
                  return `${doc}|${tipoId}|${f.ncf}|${f.ncf_modificado || ''}|01|${fechaAAAAMM}|${fechaDD}|${base.toFixed(2)}|${itbis.toFixed(2)}|0.00|0.00|0.00|0.00|0.00|0.00|0.00|${efectivo.toFixed(2)}|0.00|0.00|${credito.toFixed(2)}|0.00|0.00|0.00`
                })
                const contenido = [`607|${rncEmp}|${periodo}|${data607.incluidas.length}`, ...lineas].join('\r\n')
                const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `DGII_F_607_${rncEmp}_${periodo}.txt`
                a.click()
                URL.revokeObjectURL(url)
              }}
                className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
    💾 Exportar TXT DGII
              </button>
            )}
            {data607 && data607.incluidas.length > 0 && (
              <button onClick={() => {
                const periodo = `${anio607}${String(mes607).padStart(2, '0')}`
                const filas = data607.incluidas.map(f => {
                  const anulada = f.estado === 'anulada'
                  const base = anulada ? 0 : parseFloat(f.subtotal || 0)
                  const itbis = anulada ? 0 : parseFloat(f.itbis || 0)
                  const total = anulada ? 0 : parseFloat(f.total || 0)
                  return {
                    'Cliente': f.cliente_nombre || 'Consumidor Final',
                    'RNC/Cédula': f.rnc_cedula || '',
                    'NCF': f.ncf || '',
                    'NCF Modif.': f.ncf_modificado || '',
                    'Estado': (f.estado || '').replace('_', ' ').toUpperCase(),
                    'Fecha': new Date(f.fecha_emision || f.creado_en).toLocaleDateString('es-DO'),
                    'Monto (sin ITBIS)': parseFloat(base.toFixed(2)),
                    'ITBIS': parseFloat(itbis.toFixed(2)),
                    'Total': parseFloat(total.toFixed(2))
                  }
                })
                const totBase = filas.reduce((s, f) => s + f['Monto (sin ITBIS)'], 0)
                const totItbis = filas.reduce((s, f) => s + f['ITBIS'], 0)
                const totGeneral = filas.reduce((s, f) => s + f['Total'], 0)
                filas.push({
                  'Cliente': '', 'RNC/Cédula': '', 'NCF': '', 'NCF Modif.': '', 'Estado': '', 'Fecha': 'TOTALES:',
                  'Monto (sin ITBIS)': parseFloat(totBase.toFixed(2)),
                  'ITBIS': parseFloat(totItbis.toFixed(2)),
                  'Total': parseFloat(totGeneral.toFixed(2))
                })
                const ws = XLSX.utils.json_to_sheet(filas)
                ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }]
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Reporte 607')
                XLSX.writeFile(wb, `Reporte_607_${periodo}.xlsx`)
              }}
                className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-800">
                📊 Exportar Excel
              </button>
            )}
          </div>

          {data607 && data607.sin_ncf.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-sm text-yellow-800">
              ⚠️ <strong>{data607.sin_ncf.length} venta(s) SIN NCF</strong> — no incluidas en el 607: {data607.sin_ncf.map(f => f.numero_factura ? `FAC-${f.numero_factura}` : (f.cliente_nombre || 'Consumidor Final')).join(', ')}
            </div>
          )}

          {data607 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">📄 Ventas incluidas ({data607.incluidas.length})</h3>
                <span className="text-sm text-gray-500">Período: {String(mes607).padStart(2, '0')}/{anio607}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Cliente</th>
                      <th className="px-4 py-2 text-left text-gray-600">RNC/Cédula</th>
                      <th className="px-4 py-2 text-left text-gray-600">NCF</th>
                      <th className="px-4 py-2 text-left text-gray-600">NCF Modif.</th>
                      <th className="px-4 py-2 text-left text-gray-600">Estado</th>
                      <th className="px-4 py-2 text-left text-gray-600">Fecha</th>
                      <th className="px-4 py-2 text-right text-gray-600">Monto (sin ITBIS)</th>
                      <th className="px-4 py-2 text-right text-gray-600">ITBIS</th>
                      <th className="px-4 py-2 text-right text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data607.incluidas.length === 0 ? (
                      <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">No hay ventas con NCF en este período</td></tr>
                    ) : data607.incluidas.map(f => {
                      const anulada = f.estado === 'anulada'
                      const base = anulada ? 0 : parseFloat(f.subtotal || 0)
                      const itbis = anulada ? 0 : parseFloat(f.itbis || 0)
                      const total = anulada ? 0 : parseFloat(f.total || 0)
                      return (
                        <tr key={f.id} className={`border-t hover:bg-gray-50 ${anulada ? 'text-gray-400' : ''}`}>
                          <td className="px-4 py-2">{f.cliente_nombre || 'Consumidor Final'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{f.rnc_cedula || '-'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{f.ncf}</td>
                          <td className="px-4 py-2 font-mono text-xs">{f.ncf_modificado || '-'}</td>
                          <td className="px-4 py-2 text-xs">{(f.estado || '').replace('_', ' ').toUpperCase()}</td>
                          <td className="px-4 py-2 text-xs">{new Date(f.fecha_emision || f.creado_en).toLocaleDateString('es-DO')}</td>
                          <td className="px-4 py-2 text-right">RD${base.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2 text-right text-orange-600">RD${itbis.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-2 text-right font-medium">RD${total.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {data607.incluidas.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan="6" className="px-4 py-2 text-right">TOTALES:</td>
                        <td className="px-4 py-2 text-right">RD${data607.incluidas.reduce((s, f) => s + (f.estado === 'anulada' ? 0 : parseFloat(f.subtotal || 0)), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 text-right text-orange-600">RD${data607.incluidas.reduce((s, f) => s + (f.estado === 'anulada' ? 0 : parseFloat(f.itbis || 0)), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                        <td className="px-4 py-2 text-right">RD${data607.incluidas.reduce((s, f) => s + (f.estado === 'anulada' ? 0 : parseFloat(f.total || 0)), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumen de ventas */}
      {ventas && (
        <div className="mb-6 hidden">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Resumen de Ventas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Facturas</p>
              <p className="text-2xl font-bold text-blue-600">{ventas.total_facturas}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Ventas</p>
              <p className="text-2xl font-bold text-green-600">RD${parseFloat(ventas.total_ventas).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total ITBIS</p>
              <p className="text-2xl font-bold text-orange-500">RD${parseFloat(ventas.total_itbis).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Anuladas</p>
              <p className="text-2xl font-bold text-red-500">{ventas.anuladas}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reporte ITBIS por mes */}
      <div className="mb-6 hidden">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">ITBIS por Mes</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Mes</th>
                <th className="px-4 py-3 text-left text-gray-600">Facturas</th>
                <th className="px-4 py-3 text-left text-gray-600">Subtotal</th>
                <th className="px-4 py-3 text-left text-gray-600">ITBIS</th>
                <th className="px-4 py-3 text-left text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {itbis.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay datos</td></tr>
              ) : (
                itbis.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(row.mes.slice(0,10) + 'T12:00:00').toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</td>
                    <td className="px-4 py-3">{row.total_facturas}</td>
                    <td className="px-4 py-3">RD${parseFloat(row.total_subtotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-orange-600">RD${parseFloat(row.total_itbis).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">RD${parseFloat(row.total_con_itbis).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporte por cliente */}
      <div className="hidden">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Ventas por Cliente</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left text-gray-600">RNC/Cédula</th>
                <th className="px-4 py-3 text-left text-gray-600">Facturas</th>
                <th className="px-4 py-3 text-left text-gray-600">Facturado</th>
                <th className="px-4 py-3 text-left text-gray-600">Pagado</th>
                <th className="px-4 py-3 text-left text-gray-600">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay datos</td></tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.nombre}</td>
                    <td className="px-4 py-3">{c.rnc_cedula || '-'}</td>
                    <td className="px-4 py-3">{c.total_facturas}</td>
                    <td className="px-4 py-3">RD${parseFloat(c.total_facturado).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">RD${parseFloat(c.total_pagado).toLocaleString()}</td>
                    <td className="px-4 py-3 text-orange-500">RD${parseFloat(c.total_pendiente).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}