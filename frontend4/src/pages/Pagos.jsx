import { useState, useEffect } from 'react'
import API from '../services/api'
import { listarDispositivos, imprimirEnDispositivo } from '../utils/bluetoothPrint'

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMetodo, setShowMetodo] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    invoice_id: '', monto: '', metodo: 'efectivo', referencia: '', notas: ''
  })
  const [mostrarImprimirPago, setMostrarImprimirPago] = useState(false)
  const [pagoGuardadoId, setPagoGuardadoId] = useState(null)
  const [metodos, setMetodos] = useState({
    efectivo: '', transferencia: '', tarjeta: '',
    cheque_valor: '', cheque_banco: '', cheque_numero: '',
  })
  const [btModal, setBtModal] = useState(false)
  const [btDevices, setBtDevices] = useState([])
  const [btLineas, setBtLineas] = useState([])
  const [pagoData, setPagoData] = useState(null)
  const [showPendientes, setShowPendientes] = useState(false)
  const [pendientes, setPendientes] = useState([])
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [vendedoresList, setVendedoresList] = useState([])

  const fetchData = async () => {
    try {
      const [p, f, t] = await Promise.all([
        API.get('/payments'),
        API.get('/invoices'),
        API.get('/tenant/profile')
      ])
      setPagos(p.data.data)
      setFacturas(f.data.data.filter(f => f.estado === 'emitida'))
      if (t.data.data?.nombre) {
        sessionStorage.setItem('tenant_name', t.data.data.nombre)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    API.get('/mantenimiento/vendedores').then(r => setVendedoresList(r.data.data || [])).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleEnviarMetodo = () => {
    const efectivo = parseFloat(metodos.efectivo || 0)
    const transferencia = parseFloat(metodos.transferencia || 0)
    const tarjeta = parseFloat(metodos.tarjeta || 0)
    const cheque = parseFloat(metodos.cheque_valor || 0)
    const total = efectivo + transferencia + tarjeta + cheque
    let metodoLabel = 'efectivo'
    let maxVal = efectivo
    if (transferencia > maxVal) { metodoLabel = 'transferencia'; maxVal = transferencia }
    if (tarjeta > maxVal) { metodoLabel = 'tarjeta'; maxVal = tarjeta }
    if (cheque > maxVal) { metodoLabel = 'cheque'; maxVal = cheque }
    let ref = ''
    if (metodos.cheque_banco) ref += metodos.cheque_banco
    if (metodos.cheque_numero) ref += (ref ? ' #' : '#') + metodos.cheque_numero
    setForm(prev => ({
      ...prev, metodo: metodoLabel,
      monto: total > 0 ? total : prev.monto,
      referencia: ref || prev.referencia
    }))
    setShowMetodo(false)
  }

  const getMetodoLabel = () => {
    const partes = []
    if (parseFloat(metodos.efectivo || 0) > 0) partes.push(`Efectivo: RD$${parseFloat(metodos.efectivo).toLocaleString('es-DO', {minimumFractionDigits:2})}`)
    if (parseFloat(metodos.transferencia || 0) > 0) partes.push(`Transf: RD$${parseFloat(metodos.transferencia).toLocaleString('es-DO', {minimumFractionDigits:2})}`)
    if (parseFloat(metodos.tarjeta || 0) > 0) partes.push(`Tarjeta: RD$${parseFloat(metodos.tarjeta).toLocaleString('es-DO', {minimumFractionDigits:2})}`)
    if (parseFloat(metodos.cheque_valor || 0) > 0) partes.push(`Cheque: RD$${parseFloat(metodos.cheque_valor).toLocaleString('es-DO', {minimumFractionDigits:2})}`)
    return partes.length > 0 ? partes.join(' | ') : 'Seleccionar método...'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await API.post('/payments', form)
      setShowForm(false)
      setForm({ invoice_id: '', monto: '', metodo: 'efectivo', referencia: '', notas: '' })
      setMetodos({ efectivo: '', transferencia: '', tarjeta: '', cheque_valor: '', cheque_banco: '', cheque_numero: '' })
      fetchData()
      const id = res.data.data?.id
      if (id) {
        setPagoGuardadoId(id)
        const facturaSeleccionada = facturas.find(f => f.id === form.invoice_id)
        const pagosAnteriores = pagos
            .filter(p => p.invoice_id === form.invoice_id)
            .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0)
          const totalOriginal = parseFloat(facturaSeleccionada?.total || form.monto)
          const saldoRestante = totalOriginal - pagosAnteriores
          setPagoData({
            monto: form.monto,
            metodo: form.metodo,
            referencia: form.referencia,
            ncf: facturaSeleccionada?.ncf || '',
            cliente: facturaSeleccionada?.cliente_nombre || 'Consumidor Final',
            totalFactura: saldoRestante > 0 ? saldoRestante : totalOriginal
          })
        setMostrarImprimirPago(true)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar pago')
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando pagos...</p>

  return (
    <div className="p-6">
      {mostrarImprimirPago && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir el recibo de pago?</p>
            <div className="flex justify-center gap-6">
              <button autoFocus
                onClick={async () => {
                  if (window.bluetoothSerial && pagoData) {
                    setMostrarImprimirPago(false)
                    const W = 48
                    const pad = (t, l, a='left') => { t=String(t||''); if(t.length>l) return t.substring(0,l); if(a==='right') return ' '.repeat(l-t.length)+t; if(a==='center'){ const s=Math.floor((l-t.length)/2); return ' '.repeat(s)+t+' '.repeat(l-t.length-s); } return t+' '.repeat(l-t.length) }
                    const sep = '='.repeat(W)
                    const sep2 = '-'.repeat(W)
                    const empresa = sessionStorage.getItem('tenant_name') || 'MI EMPRESA'
                    const vendedor = (() => { try { return JSON.parse(sessionStorage.getItem('usuario'))?.nombre || '-' } catch(e) { return '-' } })()
                    const fecha = new Date().toLocaleDateString('es-DO')
                    const hora = new Date().toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'})
                    const montoFmt = parseFloat(pagoData.monto).toLocaleString('es-DO', {minimumFractionDigits:2})
                    const lineas = [
                      sep,
                      pad(empresa.toUpperCase(), W, 'center'),
                      pad('RECIBO DE PAGO', W, 'center'),
                      sep,
                      '',
                      `FECHA    : ${fecha}   ${hora}`,
                      `VENDEDOR : ${vendedor}`,
                      '',
                      sep2,
                      '',
                      `CLIENTE  : ${pagoData.cliente}`,
                      pagoData.ncf ? `FACTURA  : ${pagoData.ncf}` : '',
                      '',
                      sep2,
                      '',
                      `CONCEPTO : ${parseFloat(pagoData.monto) >= parseFloat(pagoData.totalFactura || pagoData.monto) ? 'SALDO' : 'ABONO'}`,
                      '',
                      sep2,
                      '',
                      pad(`RD$ ${montoFmt}`, W, 'center'),
                      '',
                      parseFloat(pagoData.monto) < parseFloat(pagoData.totalFactura || pagoData.monto) ? sep2 : '',
                      parseFloat(pagoData.monto) < parseFloat(pagoData.totalFactura || pagoData.monto) ? `PENDIENTE: RD$ ${(parseFloat(pagoData.totalFactura) - parseFloat(pagoData.monto)).toLocaleString('es-DO', {minimumFractionDigits:2})}` : '',
                      '',
                      sep2,
                      '',
                      `METODO   : ${pagoData.metodo.toUpperCase()}`,
                      pagoData.referencia ? `REF      : ${pagoData.referencia}` : '',
                      '',
                      sep2,
                      '',
                      pad('GRACIAS POR SU PAGO', W, 'center'),
                      sep,
                      '', '', ''
                    ]
                    const savedAddress = localStorage.getItem('bt_printer_address')
                    if (savedAddress) {
                      try {
                        await imprimirEnDispositivo(savedAddress, lineas)
                        alert('✅ Impreso')
                      } catch (err) {
                        alert('❌ ' + err)
                      }
                      return
                    }
                    const devices = await listarDispositivos()
                    setBtDevices(devices)
                    setBtLineas(lineas)
                    setBtModal(true)
                    return
                  }
                  const token = sessionStorage.getItem('token')
                  window.open(`https://facturacion-saas-production.up.railway.app/payments/${pagoGuardadoId}/recibo?token=${token}`, '_blank')
                  setMostrarImprimirPago(false)
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                Sí
              </button>
              <button onClick={() => setMostrarImprimirPago(false)}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Pagos</h2>
        <div className="flex gap-2">
       <button onClick={() => {
              const u = JSON.parse(sessionStorage.getItem('usuario') || '{}')
              if (u.rol === 'vendedor') { alert('Usted no tiene permiso para este módulo'); return }
              setShowPendientes(true)
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm">
            ⏳ Pagos por Confirmar
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + Registrar Pago
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Registrar Pago</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factura * (NCF)</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Ej: B0100000001" id="pago-ncf-input"
                  className="w-full border rounded px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => e.target.value = e.target.value.toUpperCase()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = e.target.value.trim().toUpperCase()
                      const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val)
                      if (!factura) { setError('Factura no encontrada: ' + val); return }
                      setError('')
                      setForm(prev => ({ ...prev, invoice_id: factura.id, monto: '' }))
                      document.getElementById('pago-ncf-resultado').innerHTML =
                        `<span class="text-green-600 font-medium">✓ ${factura.ncf} — ${factura.cliente_nombre || 'Consumidor Final'} — RD$${parseFloat(factura.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>`
                    }
                  }} />
                <button type="button"
                  onClick={() => {
                    const val = document.getElementById('pago-ncf-input').value.trim().toUpperCase()
                    const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val)
                    if (!factura) { setError('Factura no encontrada: ' + val); return }
                    setError('')
                    setForm(prev => ({ ...prev, invoice_id: factura.id, monto: '' }))
                    document.getElementById('pago-ncf-resultado').innerHTML =
                      `<span class="text-green-600 font-medium">✓ ${factura.ncf} — ${factura.cliente_nombre || 'Consumidor Final'} — RD$${parseFloat(factura.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>`
                  }}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 whitespace-nowrap">
                  Buscar
                </button>
              </div>
              <div id="pago-ncf-resultado" className="mt-1 text-sm"></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input name="monto" type="number" step="0.01" value={form.monto} onChange={handleChange} required
                placeholder="DIGITAR MONTO"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setShowMetodo(true) } }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <button type="button" onClick={() => setShowMetodo(true)}
                className="w-full border rounded px-3 py-2 text-sm text-left bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
                💳 {getMetodoLabel()}
              </button>
            </div>
            <div className="hidden">
              <input name="referencia" value={form.referencia} onChange={handleChange} />
            </div>
            <div className="hidden">
              <input name="notas" value={form.notas} onChange={handleChange} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Registrar Pago
              </button>
            </div>
          </form>
        </div>
      )}

      {showMetodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-center text-gray-800 mb-5">MÉTODOS DE PAGO</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">💵 Efectivo</label>
                <input type="number" step="0.01" placeholder="0.00" value={metodos.efectivo}
                  onChange={e => setMetodos(prev => ({...prev, efectivo: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">🏦 Transferencia</label>
                <input type="number" step="0.01" placeholder="0.00" value={metodos.transferencia}
                  onChange={e => setMetodos(prev => ({...prev, transferencia: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">💳 Tarjeta</label>
                <input type="number" step="0.01" placeholder="0.00" value={metodos.tarjeta}
                  onChange={e => setMetodos(prev => ({...prev, tarjeta: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">📝 Cheque - Valor</label>
                <input type="number" step="0.01" placeholder="0.00" value={metodos.cheque_valor}
                  onChange={e => setMetodos(prev => ({...prev, cheque_valor: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">📝 Cheque - Banco</label>
                <input type="text" placeholder="Nombre del banco" value={metodos.cheque_banco}
                  onChange={e => setMetodos(prev => ({...prev, cheque_banco: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">📝 Cheque - Número</label>
                <input type="text" placeholder="# cheque" value={metodos.cheque_numero}
                  onChange={e => setMetodos(prev => ({...prev, cheque_numero: e.target.value}))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowMetodo(false)}
                className="px-6 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700 font-medium">VOLVER</button>
              <button onClick={handleEnviarMetodo}
                className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">ENVIAR</button>
            </div>
          </div>
        </div>
      )}

      {btModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Seleccionar Impresora</h3>
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

      {showPendientes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">⏳ Pagos por Confirmar</h3>
              <button onClick={() => setShowPendientes(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio</label>
                <input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin</label>
                <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendedor</label>
                <input type="text" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                  placeholder="Buscar vendedor..." list="vendedores-list"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <datalist id="vendedores-list">
                  {vendedoresList.map(v => <option key={v.id} value={v.nombre} />)}
                </datalist>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button onClick={async () => {
                  try {
                    const params = new URLSearchParams()
                    if (filtroFechaInicio) params.append('fecha_inicio', filtroFechaInicio)
                    if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin)
                    if (filtroVendedor) params.append('vendedor', filtroVendedor)
                    const res = await API.get(`/payments/pendientes?${params.toString()}`)
                    setPendientes(res.data.data)
                  } catch (err) {
                    console.error(err)
                  }
                }}
                  className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                  🔍 Buscar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                    <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-left text-gray-600">Método</th>
                    <th className="px-4 py-3 text-left text-gray-600">Vendedor</th>
                    <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay pagos pendientes</td></tr>
                  ) : pendientes.map(p => (
                    <tr key={p.id} className="border-t hover:bg-orange-50">
                      <td className="px-4 py-3 font-mono">{p.ncf || '-'}</td>
                      <td className="px-4 py-3">{p.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3 font-medium text-green-600">RD${parseFloat(p.monto).toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize">{p.metodo}</td>
                      <td className="px-4 py-3">{p.vendedor_nombre || '-'}</td>
                      <td className="px-4 py-3">{new Date(p.creado_en).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={async () => {
                          try {
                            await API.put(`/payments/${p.id}/confirmar`)
                            setPendientes(prev => prev.filter(x => x.id !== p.id))
                            fetchData()
                            alert('✅ Pago confirmado')
                          } catch (err) {
                            alert('❌ Error al confirmar')
                          }
                        }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                          ✓ Confirmar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 flex justify-end border-t">
              <button onClick={() => setShowPendientes(false)} className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">NCF</th>
              <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-left text-gray-600">Monto</th>
              <th className="px-4 py-3 text-left text-gray-600">Método</th>
              <th className="px-4 py-3 text-left text-gray-600">Referencia</th>
              <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay pagos registrados</td></tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{p.ncf || '-'}</td>
                  <td className="px-4 py-3">{p.cliente_nombre || 'Consumidor Final'}</td>
                  <td className="px-4 py-3 font-medium text-green-600">RD${parseFloat(p.monto).toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize">{p.metodo}</td>
                  <td className="px-4 py-3">{p.referencia || '-'}</td>
                  <td className="px-4 py-3">{new Date(p.creado_en).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}