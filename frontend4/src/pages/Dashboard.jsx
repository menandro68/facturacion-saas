import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/reports/dashboard')
        setData(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <p className="text-gray-500 p-6">Cargando dashboard...</p>
  if (!data) return <p className="text-red-500 p-6">Error cargando datos.</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Resumen del día */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Hoy</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Facturas Hoy</p>
          <p className="text-3xl font-bold text-blue-600">{data.hoy.facturas_hoy}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Ventas Hoy</p>
          <p className="text-3xl font-bold text-green-600">RD${parseFloat(data.hoy.ventas_hoy).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Cobrado Hoy</p>
          <p className="text-3xl font-bold text-purple-600">RD${parseFloat(data.hoy.cobrado_hoy).toLocaleString()}</p>
        </div>
      </div>

      {/* Resumen del mes */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Este Mes</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Facturas</p>
          <p className="text-3xl font-bold text-blue-600">{data.mes.facturas_mes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Ventas</p>
          <p className="text-3xl font-bold text-green-600">RD${parseFloat(data.mes.ventas_mes).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Cobrado</p>
          <p className="text-3xl font-bold text-purple-600">RD${parseFloat(data.mes.cobrado_mes).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Pendiente</p>
          <p className="text-3xl font-bold text-orange-500">RD${parseFloat(data.mes.pendiente_mes).toLocaleString()}</p>
        </div>
      </div>

      {/* Últimas facturas */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Últimas Facturas</h3>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">NCF</th>
              <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-left text-gray-600">Total</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.ultimas_facturas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                <td className="px-4 py-3">RD${parseFloat(f.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    f.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                    f.estado === 'emitida' ? 'bg-blue-100 text-blue-700' :
                    f.estado === 'anulada' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {f.estado.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}