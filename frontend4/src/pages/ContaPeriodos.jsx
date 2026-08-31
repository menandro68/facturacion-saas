import { useState, useEffect } from 'react'
import API from '../services/api'

export default function ContaPeriodos() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [meses, setMeses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const cargar = async (a) => {
    setLoading(true)
    try {
      const r = await API.get(`/contabilidad/periodos?ano=${a || ano}`)
      setMeses(r.data.data.meses || [])
    } catch (err) {
      setError('Error al cargar los periodos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(ano) }, [ano])

  const cerrar = async (m) => {
    if (!confirm(`Cerrar ${m.nombre} ${m.ano}?\n\nDespues del cierre no se podran registrar ni anular asientos en ese mes.`)) return
    setError(''); setOk('')
    try {
      const r = await API.post('/contabilidad/periodos/cerrar', { ano: m.ano, mes: m.mes })
      setOk(r.data.mensaje)
      await cargar(ano)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cerrar el periodo')
    }
  }

  const reabrir = async (m) => {
    if (!confirm(`Reabrir ${m.nombre} ${m.ano}?\n\nVolvera a admitir asientos.`)) return
    setError(''); setOk('')
    try {
      const r = await API.post('/contabilidad/periodos/reabrir', { ano: m.ano, mes: m.mes })
      setOk(r.data.mensaje)
      await cargar(ano)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al reabrir el periodo')
    }
  }

  const cerrados = meses.filter(m => m.estado === 'cerrado').length
  const totalAsientos = meses.reduce((s, m) => s + m.asientos, 0)
  const totalMovimiento = meses.reduce((s, m) => s + parseFloat(m.movimiento || 0), 0)

  const campo = "border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Cierre de Periodos</h2>
      <p className="text-sm text-gray-500 mb-6">
        Un periodo cerrado no admite asientos nuevos ni anulaciones. Cierre los meses en orden,
        del mas antiguo al mas reciente, y solo despues de revisar que la balanza cuadre.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end flex-wrap">
        <div>
          <label className={etiqueta}>Ano</label>
          <input type="number" min="2000" max="2100" value={ano}
            onChange={(e) => setAno(parseInt(e.target.value) || new Date().getFullYear())}
            className={campo + ' w-32 text-right'} />
        </div>
        <div className="ml-auto flex gap-8 text-sm text-right">
          <div>
            <p className="text-xs text-gray-500">Meses cerrados</p>
            <p className="font-bold text-gray-800">{cerrados} de 12</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Asientos del ano</p>
            <p className="font-bold text-gray-800">{totalAsientos}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Movimiento total</p>
            <p className="font-bold text-blue-700">RD$ {fmt(totalMovimiento)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Cargando periodos...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Mes</th>
                <th className="px-4 py-3 text-center text-gray-600">Asientos</th>
                <th className="px-4 py-3 text-right text-gray-600">Movimiento</th>
                <th className="px-4 py-3 text-center text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center text-gray-600">Cerrado el</th>
                <th className="px-4 py-3 text-center text-gray-600">Accion</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(m => (
                <tr key={m.mes} className={`border-t hover:bg-gray-50 ${
                  m.estado === 'cerrado' ? 'bg-gray-50' : ''
                }`}>
                  <td className="px-4 py-3 font-medium">{m.nombre}</td>
                  <td className="px-4 py-3 text-center">{m.asientos || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {m.movimiento > 0 ? fmt(m.movimiento) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                      m.estado === 'cerrado' ? 'bg-gray-300 text-gray-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {m.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {m.cerrado_en ? String(m.cerrado_en).slice(0, 10) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.estado === 'cerrado' ? (
                      <button onClick={() => reabrir(m)} className="text-blue-600 hover:underline text-sm">
                        Reabrir
                      </button>
                    ) : (
                      <button onClick={() => cerrar(m)} className="text-red-600 hover:underline text-sm">
                        Cerrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t bg-blue-50 text-xs text-blue-800">
            Antes de cerrar un mes, revise la Balanza de Comprobacion de ese periodo.
            El sistema no permite cerrar un periodo descuadrado ni saltar meses con movimiento.
          </div>
        </div>
      )}
    </div>
  )
}