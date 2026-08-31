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

export default function ContaEstados() {
  const [estado, setEstado] = useState('resultados')
  const [desde, setDesde] = useState(primerDia())
  const [hasta, setHasta] = useState(ultimoDia())
  const [er, setEr] = useState(null)
  const [bg, setBg] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dia = (d) => d ? String(d).slice(0, 10) : '-'

  const consultar = async () => {
    setError(''); setCargando(true); setEr(null); setBg(null)
    try {
      if (estado === 'resultados') {
        const r = await API.get(`/contabilidad/estado-resultados?desde=${desde}&hasta=${hasta}`)
        setEr(r.data.data)
      } else {
        const r = await API.get(`/contabilidad/balance-general?hasta=${hasta}`)
        setBg(r.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al generar el estado')
    } finally {
      setCargando(false)
    }
  }

  const seccion = (titulo, filas, total, colorTotal) => (
    <>
      <tr className="bg-gray-100">
        <td className="px-4 py-2 font-bold text-gray-700" colSpan="2">{titulo}</td>
      </tr>
      {filas.length === 0 ? (
        <tr className="border-t">
          <td className="px-8 py-2 text-gray-400 italic" colSpan="2">Sin movimientos</td>
        </tr>
      ) : filas.map(f => (
        <tr key={f.codigo} className="border-t hover:bg-gray-50">
          <td className="px-8 py-2">
            <span className="font-mono text-xs text-gray-500 mr-3">{f.codigo}</span>
            {f.nombre}
          </td>
          <td className="px-4 py-2 text-right">{fmt(f.saldo)}</td>
        </tr>
      ))}
      <tr className="border-t bg-gray-50">
        <td className="px-4 py-2 font-bold text-right">Total {titulo.toLowerCase()}</td>
        <td className={`px-4 py-2 text-right font-bold ${colorTotal || ''}`}>{fmt(total)}</td>
      </tr>
    </>
  )

  const campo = "border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Estados Financieros</h2>
      <p className="text-sm text-gray-500 mb-6">
        El Estado de Resultados mide la utilidad de un periodo. El Balance General muestra la posicion a una fecha de corte.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setEstado('resultados'); setError('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              estado === 'resultados' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Estado de Resultados
          </button>
          <button onClick={() => { setEstado('balance'); setError('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              estado === 'balance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Balance General
          </button>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          {estado === 'resultados' && (
            <div>
              <label className={etiqueta}>Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
            </div>
          )}
          <div>
            <label className={etiqueta}>{estado === 'resultados' ? 'Hasta' : 'Fecha de corte'}</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
          </div>
          <button onClick={consultar} disabled={cargando}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {er && (
        <div className="bg-white rounded-lg shadow max-w-3xl">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-bold text-gray-700">Estado de Resultados</h3>
            <p className="text-xs text-gray-500">Del {dia(er.desde)} al {dia(er.hasta)}</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {seccion('INGRESOS', er.ingresos, er.total_ingresos, 'text-green-700')}
              {seccion('COSTOS', er.costos, er.total_costos, 'text-amber-700')}
              <tr className="border-t-2 bg-blue-50">
                <td className="px-4 py-3 font-bold text-right text-blue-900">UTILIDAD BRUTA</td>
                <td className="px-4 py-3 text-right font-bold text-blue-900">{fmt(er.utilidad_bruta)}</td>
              </tr>
              {seccion('GASTOS', er.gastos, er.total_gastos, 'text-red-700')}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${er.utilidad_operacional >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                <td className="px-4 py-4 font-bold text-right text-white text-base">
                  {er.utilidad_operacional >= 0 ? 'UTILIDAD DEL PERIODO' : 'PERDIDA DEL PERIODO'}
                </td>
                <td className="px-4 py-4 text-right font-bold text-white text-lg">
                  RD$ {fmt(Math.abs(er.utilidad_operacional))}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-8 text-sm">
            <span>Margen bruto: <strong>{fmt(er.margen_bruto)}%</strong></span>
            <span>Margen neto: <strong>{fmt(er.margen_neto)}%</strong></span>
          </div>
        </div>
      )}

      {bg && (
        <div className="bg-white rounded-lg shadow max-w-3xl">
          <div className="px-4 py-3 border-b flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-700">Balance General</h3>
              <p className="text-xs text-gray-500">Al {dia(bg.hasta)}</p>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-bold ${
              bg.cuadra ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {bg.cuadra ? 'EL BALANCE CUADRA' : `DESCUADRE: ${fmt(Math.abs(bg.diferencia))}`}
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {seccion('ACTIVOS', bg.activos, bg.total_activos, 'text-blue-700')}
              <tr className="border-t-2 bg-blue-50">
                <td className="px-4 py-3 font-bold text-right text-blue-900">TOTAL ACTIVOS</td>
                <td className="px-4 py-3 text-right font-bold text-blue-900">RD$ {fmt(bg.total_activos)}</td>
              </tr>

              {seccion('PASIVOS', bg.pasivos, bg.total_pasivos, 'text-orange-700')}
              {seccion('CAPITAL', bg.capital, bg.total_capital_cuentas, 'text-purple-700')}
              <tr className="border-t hover:bg-gray-50">
                <td className="px-8 py-2 italic">Resultado del ejercicio</td>
                <td className={`px-4 py-2 text-right font-medium ${
                  bg.resultado_ejercicio >= 0 ? 'text-green-700' : 'text-red-600'
                }`}>{fmt(bg.resultado_ejercicio)}</td>
              </tr>
              <tr className="border-t bg-gray-50">
                <td className="px-4 py-2 font-bold text-right">Total capital</td>
                <td className="px-4 py-2 text-right font-bold text-purple-700">{fmt(bg.total_capital)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-gray-800">
                <td className="px-4 py-4 font-bold text-right text-white text-base">TOTAL PASIVO + CAPITAL</td>
                <td className="px-4 py-4 text-right font-bold text-white text-lg">
                  RD$ {fmt(bg.total_pasivo_capital)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className={`px-4 py-3 border-t text-xs ${
            bg.cuadra ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {bg.cuadra
              ? 'Los activos igualan a la suma de pasivos y capital. La ecuacion contable se cumple.'
              : `La ecuacion contable no se cumple. Diferencia de ${fmt(bg.diferencia)}. Revise los asientos.`}
          </div>
        </div>
      )}
    </div>
  )
}