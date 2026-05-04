import { useState, useEffect } from 'react'
import API from '../services/api'
import OrdenCompra from '../components/OrdenCompra'
import ValorInventario from '../components/ValorInventario'
import StockMinimo from '../components/StockMinimo'

export default function Inventario({ modulos_permitidos = null }) {
  const [inventario, setInventario] = useState([])
  const [alertas, setAlertas] = useState([])
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inventario')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMovimiento, setShowMovimiento] = useState(null)
  const [showMovimientos, setShowMovimientos] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    product_id: '', stock_actual: '', stock_minimo: '', stock_maximo: '', unidad: 'unidad', ubicacion: ''
  })
  const [movForm, setMovForm] = useState({
    tipo: 'entrada', cantidad: '', motivo: ''
  })

  const fetchData = async () => {
    try {
      const [inv, alt, prod] = await Promise.all([
        API.get('/inventory'),
        API.get('/inventory/alertas'),
        API.get('/products')
      ])
      setInventario(inv.data.data)
      setAlertas(alt.data.data)
      const conInventario = inv.data.data.map(i => i.product_id)
      setProductos(prod.data.data.filter(p => !conInventario.includes(p.id)))
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

  const handleMovChange = (e) => {
    setMovForm({ ...movForm, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/inventory', form)
      setShowForm(false)
      setForm({ product_id: '', stock_actual: '', stock_minimo: '', stock_maximo: '', unidad: 'unidad', ubicacion: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleMovimiento = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.put(`/inventory/${showMovimiento}/movimiento`, movForm)
      setShowMovimiento(null)
      setMovForm({ tipo: 'entrada', cantidad: '', motivo: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar movimiento')
    }
  }

  const fetchMovimientos = async (id) => {
    try {
      const res = await API.get(`/inventory/${id}/movimientos`)
      setMovimientos(res.data.data)
      setShowMovimientos(id)
    } catch (err) {
      console.error(err)
    }
  }

  const stockColor = (item) => {
    if (item.stock_actual <= item.stock_minimo) return 'text-red-600 font-bold'
    if (item.stock_actual <= item.stock_minimo * 1.5) return 'text-orange-500 font-medium'
    return 'text-green-600'
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando inventario...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Inventario</h2>
        <button onClick={async () => {
          const res = await API.get('/products')
          const prods = res.data.data.filter(p => p.precio)
          const printW = window.open('', '_blank')
          const filas = prods.map(p => `
            <tr>
              <td>${p.nombre}</td>
              <td>${p.codigo || '-'}</td>
              <td style="text-align:right">RD$${parseFloat(p.precio).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
            </tr>`).join('')
          printW.document.write(`<!DOCTYPE html><html><head><title>Listado de Precios</title>
            <style>
              body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
              h2{color:#1e40af;margin-bottom:4px}
              p{color:#64748b;font-size:13px;margin-bottom:16px}
              table{width:100%;border-collapse:collapse;font-size:13px}
              th{background:#1e40af;color:white;padding:8px;text-align:left}
              td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
              tr:nth-child(even){background:#f8fafc}
              @media print{button{display:none}}
            </style></head><body>
            <h2>Listado de Precios</h2>
            <p>Fecha: ${new Date().toLocaleDateString('es-DO')} — ${prods.length} producto(s)</p>
            <table>
              <thead><tr><th>Producto</th><th>Código</th><th style="text-align:right">Precio</th></tr></thead>
              <tbody>${filas}</tbody>
            </table>
            <script>window.onload=()=>window.print()</script>
            </body></html>`)
          printW.document.close()
        }} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
          🖨️ Listado de Precios
        </button>
      </div>

      {/* Filtro de fechas - oculto */}

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        {[
          { id: 'inventario', label: 'Inventario' },
          { id: 'valor', label: 'Valor de Inventario' },
          { id: 'stock_minimo', label: 'Stock Mínimo' },
          { id: 'orden_compra', label: 'Crear Orden de Compra' },
          { id: 'mov_producto', label: 'Movimiento de Producto' },
        ].filter(t => !modulos_permitidos || modulos_permitidos.includes(`inventario:${t.id}`)).map(t => (
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

      {tab === 'orden_compra' && (
       <OrdenCompra onInventarioUpdate={fetchData} />
      )}

      {tab === 'valor' && <ValorInventario />}
      {tab === 'stock_minimo' && <StockMinimo />}

      {tab === 'mov_producto' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Movimiento de Producto</h3>
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
              <select id="mov-producto-select" className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64">
                <option value="">-- Seleccionar producto --</option>
                {inventario.map(i => <option key={i.id} value={i.id}>{i.producto_nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
              <input type="date" id="mov-fecha-inicio" className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
              <input type="date" id="mov-fecha-fin" className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={async () => {
              const invId = document.getElementById('mov-producto-select').value
              if (!invId) return alert('Selecciona un producto')
              const fi = document.getElementById('mov-fecha-inicio').value
              const ff = document.getElementById('mov-fecha-fin').value
              let url = `/inventory/${invId}/movimientos`
              const qs = []
              if (fi) qs.push(`fecha_inicio=${fi}`)
              if (ff) qs.push(`fecha_fin=${ff}`)
              if (qs.length) url += '?' + qs.join('&')
              try {
                const res = await API.get(url)
                const movs = res.data.data
                const nombreProd = document.getElementById('mov-producto-select').selectedOptions[0].text
                // Filtrar por fecha en frontend si backend no soporta filtro
                const filtrados = movs.filter(m => {
                  const d = m.creado_en?.slice(0,10)
                  if (fi && d < fi) return false
                  if (ff && d > ff) return false
                  return true
                })
                const printW = window.open('', '_blank')
                const entradas = filtrados.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseFloat(m.cantidad || 0), 0)
                const salidas = filtrados.filter(m => m.tipo === 'salida').reduce((s, m) => s + parseFloat(m.cantidad || 0), 0)
                const filas = filtrados.map(m => `
                  <tr>
                    <td style="text-align:center">
                      <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;background:${m.tipo==='entrada'?'#dcfce7':m.tipo==='salida'?'#fee2e2':'#dbeafe'};color:${m.tipo==='entrada'?'#16a34a':m.tipo==='salida'?'#dc2626':'#2563eb'}">${m.tipo.toUpperCase()}</span>
                    </td>
                    <td style="text-align:right">${parseFloat(m.cantidad).toFixed(2)}</td>
                    <td style="text-align:right">${parseFloat(m.stock_anterior).toFixed(2)}</td>
                    <td style="text-align:right">${parseFloat(m.stock_nuevo).toFixed(2)}</td>
                    <td>${m.motivo || '-'}</td>
                    <td style="text-align:center">${new Date(m.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                printW.document.write(`<!DOCTYPE html><html><head><title>Movimientos - ${nombreProd}</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{display:flex;gap:24px;margin-bottom:16px}
                    .resumen-card{background:#f1f5f9;border-radius:8px;padding:12px 20px;text-align:center}
                    .resumen-card .val{font-size:20px;font-weight:bold}
                    .verde{color:#16a34a} .rojo{color:#dc2626}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Movimientos: ${nombreProd}</h2>
                  <p class="sub">Período: ${fi||'Inicio'} al ${ff||'Hoy'} — ${filtrados.length} movimiento(s)</p>
                  <div class="resumen">
                    <div class="resumen-card"><div class="val verde">+${entradas.toFixed(2)}</div><div>Total Entradas</div></div>
                    <div class="resumen-card"><div class="val rojo">-${salidas.toFixed(2)}</div><div>Total Salidas</div></div>
                    <div class="resumen-card"><div class="val">${(entradas-salidas).toFixed(2)}</div><div>Neto</div></div>
                  </div>
                  <table>
                    <thead><tr><th style="text-align:center">Tipo</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Stock Ant.</th><th style="text-align:right">Stock Nuevo</th><th>Motivo</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin movimientos en el período</td></tr>'}</tbody>
                  </table>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              } catch(e) { alert('Error al cargar movimientos') }
            }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              🔍 Ver e Imprimir
            </button>
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <>
          {/* Alertas de stock mínimo */}
          {alertas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-700 font-semibold mb-2">⚠️ Alertas de Stock Mínimo ({alertas.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {alertas.map(a => (
                  <div key={a.id} className="bg-white border border-red-200 rounded p-3 text-sm">
                    <p className="font-medium text-gray-800">{a.producto_nombre}</p>
                    <p className="text-red-600">Stock actual: <span className="font-bold">{a.stock_actual} {a.unidad}</span></p>
                    <p className="text-gray-500">Stock mínimo: {a.stock_minimo} {a.unidad}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario nuevo inventario */}
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Agregar Producto al Inventario</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                  <select name="product_id" value={form.product_id} onChange={handleFormChange} required
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar producto</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                  <input name="stock_actual" type="number" step="0.01" value={form.stock_actual} onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input name="stock_minimo" type="number" step="0.01" value={form.stock_minimo} onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
                  <input name="stock_maximo" type="number" step="0.01" value={form.stock_maximo} onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select name="unidad" value={form.unidad} onChange={handleFormChange}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                    <option value="metro">Metro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input name="ubicacion" value={form.ubicacion} onChange={handleFormChange}
                    placeholder="Ej: Almacén A, Estante 1"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-3 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar</button>
                </div>
              </form>
            </div>
          )}

          {/* Modal movimiento */}
          {showMovimiento && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Registrar Movimiento</h3>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleMovimiento} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select name="tipo" value={movForm.tipo} onChange={handleMovChange}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                    <input name="cantidad" type="number" step="0.01" value={movForm.cantidad} onChange={handleMovChange} required
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                    <input name="motivo" value={movForm.motivo} onChange={handleMovChange}
                      placeholder="Ej: Compra, Venta, Ajuste"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowMovimiento(null); setError('') }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Registrar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal movimientos historial */}
          {showMovimientos && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-96 overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Historial de Movimientos</h3>
                  <button onClick={() => setShowMovimientos(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                      <th className="px-3 py-2 text-left text-gray-600">Cantidad</th>
                      <th className="px-3 py-2 text-left text-gray-600">Anterior</th>
                      <th className="px-3 py-2 text-left text-gray-600">Nuevo</th>
                      <th className="px-3 py-2 text-left text-gray-600">Motivo</th>
                      <th className="px-3 py-2 text-left text-gray-600">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 ? (
                      <tr><td colSpan="6" className="px-3 py-4 text-center text-gray-400">No hay movimientos</td></tr>
                    ) : (
                      movimientos.map(m => (
                        <tr key={m.id} className="border-t">
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              m.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                              m.tipo === 'salida' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{m.tipo.toUpperCase()}</span>
                          </td>
                          <td className="px-3 py-2">{m.cantidad}</td>
                          <td className="px-3 py-2">{m.stock_anterior}</td>
                          <td className="px-3 py-2">{m.stock_nuevo}</td>
                          <td className="px-3 py-2">{m.motivo || '-'}</td>
                          <td className="px-3 py-2">{new Date(m.creado_en).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla inventario */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left text-gray-600">Stock Actual</th>
                  <th className="px-4 py-3 text-left text-gray-600">Stock Mínimo</th>
                  <th className="px-4 py-3 text-left text-gray-600">Stock Máximo</th>
                  <th className="px-4 py-3 text-left text-gray-600">Unidad</th>
                  <th className="px-4 py-3 text-left text-gray-600">Ubicación</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay productos en inventario</td></tr>
                ) : (
                  inventario.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.producto_nombre}</td>
                      <td className={`px-4 py-3 ${stockColor(item)}`}>{item.stock_actual}</td>
                      <td className="px-4 py-3">{item.stock_minimo}</td>
                      <td className="px-4 py-3">{item.stock_maximo}</td>
                      <td className="px-4 py-3">{item.unidad}</td>
                      <td className="px-4 py-3">{item.ubicacion || '-'}</td>
                      <td className="px-4 py-3">
                        {item.stock_actual <= item.stock_minimo ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">⚠️ Stock Bajo</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">✅ Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                      {/* <button onClick={() => { setShowMovimiento(item.id); setError('') }}
                          className="text-blue-600 hover:underline text-xs">Movimiento</button> */}
                        <button onClick={() => fetchMovimientos(item.id)}
                          className="text-gray-600 hover:underline text-xs">Historial</button>
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