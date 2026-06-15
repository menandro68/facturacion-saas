import { useState, useEffect } from 'react'
import API from '../services/api'

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
  const [reporteDesde, setReporteDesde] = useState('')
  const [reporteHasta, setReporteHasta] = useState('')
  const [reporteData, setReporteData] = useState(null)
  const [reporteLoading, setReporteLoading] = useState(false)

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
  }, [])

  if (loading) return <p className="text-gray-500 p-6">Cargando reportes...</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Reportes</h2>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchReportes}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
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
      </div>

      {/* Reporte de Operador */}
      {showReporteOperador && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Reporte de Operador</h3>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Operador *</label>
                <div className="relative">
                  <input
                    id="rep-operador-input"
                    type="text"
                    placeholder="🔍 Buscar operador..."
                    autoComplete="off"
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
                        if (idx >= 0) opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      }
                    }}
                    onBlur={() => setTimeout(() => { document.getElementById('rep-operador-list').innerHTML = '' }, 200)}
                  />
                  <div id="rep-operador-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input type="date" value={reporteDesde} onChange={e => setReporteDesde(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input type="date" value={reporteHasta} onChange={e => setReporteHasta(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <button onClick={async () => {
                  if (!reporteOpId) {
                    alert('Selecciona un operador primero')
                    return
                  }
                  setReporteLoading(true)
                  try {
                    const params = new URLSearchParams({ operador_id: reporteOpId })
                    if (reporteDesde) params.append('desde', reporteDesde)
                    if (reporteHasta) params.append('hasta', reporteHasta)
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
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 mb-1">🧾 Facturas emitidas</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.facturas.cantidad}</div>
                  <div className="text-sm text-blue-600 font-medium">RD$ {reporteData.kpis.facturas.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="text-xs text-gray-500 mb-1">💰 Pagos recibidos</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.pagos.cantidad}</div>
                  <div className="text-sm text-green-600 font-medium">RD$ {reporteData.kpis.pagos.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                  <div className="text-xs text-gray-500 mb-1">📋 Pedidos creados</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.pedidos.cantidad}</div>
                  <div className="text-sm text-purple-600 font-medium">RD$ {reporteData.kpis.pedidos.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <div className="text-xs text-gray-500 mb-1">📝 Cotizaciones</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.cotizaciones.cantidad}</div>
                  <div className="text-sm text-yellow-600 font-medium">RD$ {reporteData.kpis.cotizaciones.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="text-xs text-gray-500 mb-1">❌ Anulaciones</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.anuladas.cantidad}</div>
                  <div className="text-sm text-red-600 font-medium">RD$ {reporteData.kpis.anuladas.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                  <div className="text-xs text-gray-500 mb-1">💵 Notas de crédito</div>
                  <div className="text-2xl font-bold text-gray-800">{reporteData.kpis.notas_credito.cantidad}</div>
                  <div className="text-sm text-orange-600 font-medium">RD$ {reporteData.kpis.notas_credito.monto.toLocaleString('es-DO', {minimumFractionDigits: 2})}</div>
                </div>
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
            </>
          )}

          {!reporteData && !reporteLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center text-blue-700 text-sm">
              📊 Selecciona un operador y haz clic en <strong>"Generar Reporte"</strong> para ver su actividad
            </div>
          )}
        </div>
      )}

      {/* Resumen de ventas */}
      {ventas && (
        <div className="mb-6">
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
      <div className="mb-6">
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
                    <td className="px-4 py-3">{new Date(row.mes).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</td>
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
      <div>
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