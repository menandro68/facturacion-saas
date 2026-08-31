import { useState } from 'react'
import API from '../services/api'

const primerDia = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const ultimoDia = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export default function ContaBalanza() {
  const [desde, setDesde] = useState(primerDia())
  const [hasta, setHasta] = useState(ultimoDia())
  const [soloMovimiento, setSoloMovimiento] = useState(true)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n) => {
    const v = parseFloat(n || 0)
    return v === 0 ? '' : v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const fmt0 = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const consultar = async () => {
    setError(''); setCargando(true); setData(null)
    try {
      const params = new URLSearchParams({ desde, hasta })
      if (soloMovimiento) params.append('solo_con_movimiento', 'true')
      const r = await API.get(`/contabilidad/balanza?${params.toString()}`)
      setData(r.data.data)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al generar la balanza')
    } finally {
      setCargando(false)
    }
  }

  const colorTipo = (t) => ({
    activo: 'text-blue-700', pasivo: 'text-orange-700', capital: 'text-purple-700',
    ingreso: 'text-green-700', costo: 'text-amber-700', gasto: 'text-red-700'
  }[t] || 'text-gray-700')

  const campo = "border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Balanza de Comprobacion</h2>
      <p className="text-sm text-gray-500 mb-6">
        Lista todas las cuentas con su saldo anterior, los movimientos del periodo y el saldo final.
        Si la contabilidad esta correcta, los totales deudores igualan a los acreedores.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3 items-end flex-wrap">
        <div>
          <label className={etiqueta}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={soloMovimiento}
              onChange={(e) => setSoloMovimiento(e.target.checked)} className="w-4 h-4" />
            Solo cuentas con movimiento
          </label>
        </div>
        <button onClick={consultar} disabled={cargando}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-700">
                Balanza de Comprobacion · {String(data.desde).slice(0, 10)} al {String(data.hasta).slice(0, 10)}
              </h3>
              <p className="text-xs text-gray-500">{data.cantidad_cuentas} cuenta(s)</p>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-bold ${
              data.cuadra ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {data.cuadra ? 'LA BALANZA CUADRA' : `DESCUADRE: ${fmt0(Math.abs(data.diferencia_saldos))}`}
            </span>
          </div>

          {data.lineas.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No hay cuentas con movimiento en ese rango</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-600" rowSpan="2">Codigo</th>
                    <th className="px-3 py-2 text-left text-gray-600" rowSpan="2">Cuenta</th>
                    <th className="px-3 py-2 text-center text-gray-600 border-l" colSpan="2">Saldo anterior</th>
                    <th className="px-3 py-2 text-center text-gray-600 border-l" colSpan="2">Movimientos</th>
                    <th className="px-3 py-2 text-center text-gray-600 border-l" colSpan="2">Saldo final</th>
                  </tr>
                  <tr className="bg-gray-50 text-xs">
                    <th className="px-3 py-2 text-right text-gray-600 border-l">Deudor</th>
                    <th className="px-3 py-2 text-right text-gray-600">Acreedor</th>
                    <th className="px-3 py-2 text-right text-gray-600 border-l">Debito</th>
                    <th className="px-3 py-2 text-right text-gray-600">Credito</th>
                    <th className="px-3 py-2 text-right text-gray-600 border-l">Deudor</th>
                    <th className="px-3 py-2 text-right text-gray-600">Acreedor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineas.map(l => (
                    <tr key={l.codigo} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{l.codigo}</td>
                      <td className={`px-3 py-2 ${colorTipo(l.tipo)}`}>{l.nombre}</td>
                      <td className="px-3 py-2 text-right border-l">{fmt(l.saldo_anterior_deudor)}</td>
                      <td className="px-3 py-2 text-right">{fmt(l.saldo_anterior_acreedor)}</td>
                      <td className="px-3 py-2 text-right border-l">{fmt(l.debito)}</td>
                      <td className="px-3 py-2 text-right">{fmt(l.credito)}</td>
                      <td className="px-3 py-2 text-right border-l font-medium">{fmt(l.saldo_deudor)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(l.saldo_acreedor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr className="border-t-2">
                    <td className="px-3 py-3" colSpan="2">TOTALES</td>
                    <td className="px-3 py-3 text-right border-l">{fmt0(data.totales.saldo_anterior_deudor)}</td>
                    <td className="px-3 py-3 text-right">{fmt0(data.totales.saldo_anterior_acreedor)}</td>
                    <td className="px-3 py-3 text-right border-l">{fmt0(data.totales.debito)}</td>
                    <td className="px-3 py-3 text-right">{fmt0(data.totales.credito)}</td>
                    <td className="px-3 py-3 text-right border-l">{fmt0(data.totales.saldo_deudor)}</td>
                    <td className="px-3 py-3 text-right">{fmt0(data.totales.saldo_acreedor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className={`px-4 py-3 border-t text-xs ${
            data.cuadra ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {data.cuadra
              ? 'Los movimientos y los saldos estan balanceados. La contabilidad del periodo es consistente.'
              : `Hay un descuadre. Diferencia en movimientos: ${fmt0(data.diferencia_movimientos)} · Diferencia en saldos: ${fmt0(data.diferencia_saldos)}. Revise los asientos del periodo.`}
          </div>
        </div>
      )}
    </div>
  )
}