import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    invoice_id: '', monto: '', metodo: 'efectivo', referencia: '', notas: ''
  })

  const fetchData = async () => {
    try {
      const [p, f] = await Promise.all([
        API.get('/payments'),
        API.get('/invoices')
      ])
      setPagos(p.data.data)
      setFacturas(f.data.data.filter(f => f.estado === 'emitida'))
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
      if (factura) setForm(prev => ({ ...prev, invoice_id: e.target.value, monto: factura.total }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await API.post('/payments', form)
      setShowForm(false)
      setForm({ invoice_id: '', monto: '', metodo: 'efectivo', referencia: '', notas: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar pago')
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando pagos...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Pagos</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Registrar Pago
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Registrar Pago</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factura * (NCF)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: B0100000001"
                  id="pago-ncf-input"
                  className="w-full border rounded px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => e.target.value = e.target.value.toUpperCase()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = e.target.value.trim().toUpperCase()
                      const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val)
                      if (!factura) { setError('Factura no encontrada: ' + val); return }
                      setError('')
                      setForm(prev => ({ ...prev, invoice_id: factura.id, monto: factura.total }))
                      document.getElementById('pago-ncf-resultado').innerHTML =
                        `<span class="text-green-600 font-medium">✓ ${factura.ncf} — ${factura.cliente_nombre || 'Consumidor Final'} — RD$${parseFloat(factura.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>`
                    }
                  }}
                />
                <button type="button"
                  onClick={() => {
                    const val = document.getElementById('pago-ncf-input').value.trim().toUpperCase()
                    const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val)
                    if (!factura) { setError('Factura no encontrada: ' + val); return }
                    setError('')
                    setForm(prev => ({ ...prev, invoice_id: factura.id, monto: factura.total }))
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
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <select name="metodo" value={form.metodo} onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
              <input name="referencia" value={form.referencia} onChange={handleChange}
                placeholder="Número de referencia"
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
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Registrar Pago
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