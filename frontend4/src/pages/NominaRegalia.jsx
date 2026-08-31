import { useState } from 'react'
import API from '../services/api'

export default function NominaRegalia() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const calcular = async () => {
    setCargando(true); setError(''); setData(null)
    try {
      const res = await API.post('/nomina/regalia/preview', { ano: parseInt(ano) })
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al calcular la regalia')
    } finally {
      setCargando(false)
    }
  }

    const imprimir = async () => {
    setError('')
    try {
      const res = await API.post('/nomina/regalia/pdf', { ano: parseInt(ano) }, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el reporte de regalia')
    }
  }

  const campo = "border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Regalia Pascual</h2>
      <p className="text-sm text-gray-500 mb-6">
        Se calcula sumando los salarios ordinarios del ano y dividiendo entre 12 (Art. 219).
        El tope legal es de 5 salarios minimos. Esta exenta de AFP, SFS e ISR.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3 items-end flex-wrap">
        <div>
          <label className={etiqueta}>Ano</label>
          <input type="number" min="2000" max="2100" value={ano}
            onChange={(e) => setAno(e.target.value)} className={campo + ' w-32 text-right'} />
        </div>
              <button onClick={calcular} disabled={cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          {cargando ? 'Calculando...' : 'Calcular'}
        </button>
        {data && data.lineas.length > 0 && (
          <button onClick={imprimir}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
            Imprimir
          </button>
        )}
        {data && (
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">
              Tope legal: {data.tope_legal ? `RD$ ${fmt(data.tope_legal)}` : 'no configurado'}
            </p>
            <p className="text-lg font-bold text-green-700">Total a pagar: RD$ {fmt(data.total)}</p>
          </div>
        )}
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Empleado</th>
                <th className="px-4 py-3 text-left text-gray-600">Cedula</th>
                <th className="px-4 py-3 text-left text-gray-600">Cargo</th>
                <th className="px-4 py-3 text-right text-gray-600">Salarios del ano</th>
                <th className="px-4 py-3 text-center text-gray-600">Periodos</th>
                <th className="px-4 py-3 text-right text-gray-600">Regalia bruta</th>
                <th className="px-4 py-3 text-right text-gray-600">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {data.lineas.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                  No hay empleados con regalia que pagar en {data.ano}
                </td></tr>
              ) : data.lineas.map(l => (
                <tr key={l.empleado_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {l.empleado_nombre}
                    {l.estimado && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">estimado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{l.empleado_cedula || '-'}</td>
                  <td className="px-4 py-3">{l.cargo || '-'}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.suma_salarios_ano)}</td>
                  <td className="px-4 py-3 text-center">{l.periodos_pagados}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.regalia_bruta)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {fmt(l.regalia_pagar)}
                    {l.tope_aplicado && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">tope</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.lineas.length > 0 && (
              <tfoot className="bg-gray-50 font-bold">
                <tr className="border-t-2">
                  <td className="px-4 py-3" colSpan="6">TOTAL ({data.lineas.length} empleados)</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(data.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <div className="px-4 py-3 border-t bg-blue-50 text-xs text-blue-800">
            {data.nota} La marca "estimado" indica que no hay nominas procesadas de ese ano
            y el monto se calculo con el salario base actual.
          </div>
        </div>
      )}
    </div>
  )
}