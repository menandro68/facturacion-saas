import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Reportes() {
  const [ventas, setVentas] = useState(null)
  const [itbis, setItbis] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

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

  useEffect(() => { fetchReportes() }, [])

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
      </div>

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