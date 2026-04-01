import { useState, useEffect } from 'react'
import API from '../services/api'

export default function CuentasCobrar() {
  const [cuentas, setCuentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [facturas, setFacturas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAbono, setShowAbono] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '', invoice_id: '', descripcion: '', monto_total: '', fecha_vencimiento: '', notas: ''
  })
  const [abonoMonto, setAbonoMonto] = useState('')

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
      setFacturas(fac.data.data.filter(f => f.estado === 'emitida'))
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
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Nueva Cuenta
        </button>
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
            <p className="text-2xl font-bold text-orange-500">RD${parseFloat(resumen.total_pendiente).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Cobrado</p>
            <p className="text-2xl font-bold text-green-600">RD${parseFloat(resumen.total_pagado).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Vencidas</p>
            <p className="text-2xl font-bold text-red-600">{resumen.total_vencidas}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
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

      {/* Modal abono */}
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

      {/* Tabla */}
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
    </div>
  )
}