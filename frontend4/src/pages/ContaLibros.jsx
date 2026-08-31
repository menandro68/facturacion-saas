import React, { useState, useEffect } from 'react'
import API from '../services/api'

const primerDia = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const ultimoDia = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export default function ContaLibros() {
  const [libro, setLibro] = useState('diario')
  const [cuentas, setCuentas] = useState([])
  const [desde, setDesde] = useState(primerDia())
  const [hasta, setHasta] = useState(ultimoDia())
  const [cuentaSel, setCuentaSel] = useState('')
  const [incluirAnulados, setIncluirAnulados] = useState(false)
  const [diario, setDiario] = useState(null)
  const [mayor, setMayor] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dia = (d) => d ? String(d).slice(0, 10) : '-'

  useEffect(() => {
    API.get('/contabilidad/cuentas?solo_movimiento=true')
      .then(r => setCuentas(r.data.data || []))
      .catch(() => {})
  }, [])

  const consultar = async () => {
    setError(''); setCargando(true); setDiario(null); setMayor(null)
    try {
      if (libro === 'diario') {
        const params = new URLSearchParams({ desde, hasta })
        if (incluirAnulados) params.append('incluir_anulados', 'true')
        const r = await API.get(`/contabilidad/libro-diario?${params.toString()}`)
        setDiario(r.data.data)
      } else {
        if (!cuentaSel) { setError('Seleccione una cuenta'); setCargando(false); return }
        const params = new URLSearchParams({ cuenta_codigo: cuentaSel, desde, hasta })
        const r = await API.get(`/contabilidad/libro-mayor?${params.toString()}`)
        setMayor(r.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al generar el libro')
    } finally {
      setCargando(false)
    }
  }

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Libros Contables</h2>
      <p className="text-sm text-gray-500 mb-6">
        El Diario muestra los asientos en orden cronologico. El Mayor muestra el movimiento y el saldo de una cuenta.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setLibro('diario'); setError('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              libro === 'diario' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Libro Diario
          </button>
          <button onClick={() => { setLibro('mayor'); setError('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              libro === 'mayor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Libro Mayor
          </button>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          {libro === 'mayor' && (
            <div className="flex-1 min-w-64">
              <label className={etiqueta}>Cuenta *</label>
              <select value={cuentaSel} onChange={(e) => setCuentaSel(e.target.value)} className={campo}>
                <option value="">Seleccione la cuenta...</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={etiqueta}>Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
          </div>
          {libro === 'diario' && (
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={incluirAnulados}
                  onChange={(e) => setIncluirAnulados(e.target.checked)} className="w-4 h-4" />
                Incluir anulados
              </label>
            </div>
          )}
          <button onClick={consultar} disabled={cargando}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {diario && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-sm font-bold text-gray-700">
              Libro Diario · {dia(diario.desde)} al {dia(diario.hasta)}
            </h3>
            <div className="text-sm">
              <span className="text-gray-500 mr-4">{diario.cantidad_asientos} asiento(s)</span>
              <span className="font-bold">
                Debito: RD$ {fmt(diario.total_debito)} · Credito: RD$ {fmt(diario.total_credito)}
              </span>
            </div>
          </div>

          {diario.asientos.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">No hay asientos en ese rango</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600" style={{ width: '110px' }}>Fecha</th>
                    <th className="px-4 py-3 text-left text-gray-600" style={{ width: '110px' }}>Numero</th>
                    <th className="px-4 py-3 text-left text-gray-600">Cuenta / Descripcion</th>
                    <th className="px-4 py-3 text-right text-gray-600" style={{ width: '130px' }}>Debito</th>
                    <th className="px-4 py-3 text-right text-gray-600" style={{ width: '130px' }}>Credito</th>
                  </tr>
                </thead>
                <tbody>
                  {diario.asientos.map(a => (
                    <React.Fragment key={a.id}>
                      <tr className={`border-t-2 bg-gray-50 ${a.estado === 'anulado' ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2 font-medium">{dia(a.fecha)}</td>
                        <td className="px-4 py-2 font-mono font-medium">{a.numero}</td>
                        <td className="px-4 py-2 font-medium" colSpan="3">
                          {a.descripcion}
                          {a.estado === 'anulado' && <span className="ml-2 text-red-600 text-xs">ANULADO</span>}
                          {a.origen_documento && <span className="ml-2 text-gray-500 text-xs">{a.origen_documento}</span>}
                        </td>
                      </tr>
                      {a.lineas.map((l, i) => (
                        <tr key={`${a.id}-${i}`} className={`border-t ${a.estado === 'anulado' ? 'opacity-50' : ''}`}>
                          <td></td>
                          <td className="px-4 py-2 font-mono text-gray-600 text-xs">{l.cuenta_codigo}</td>
                          <td className="px-4 py-2">
                            {l.cuenta_nombre}
                            {l.descripcion && <span className="text-gray-500 text-xs ml-2">{l.descripcion}</span>}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {parseFloat(l.debito) > 0 ? fmt(l.debito) : ''}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {parseFloat(l.credito) > 0 ? fmt(l.credito) : ''}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr className="border-t-2">
                    <td className="px-4 py-3" colSpan="3">TOTALES DEL PERIODO</td>
                    <td className="px-4 py-3 text-right">{fmt(diario.total_debito)}</td>
                    <td className="px-4 py-3 text-right">{fmt(diario.total_credito)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {mayor && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-bold text-gray-700">
              Libro Mayor · {mayor.cuenta.codigo} — {mayor.cuenta.nombre}
            </h3>
            <p className="text-xs text-gray-500 capitalize">
              {mayor.cuenta.tipo} · naturaleza {mayor.cuenta.naturaleza} · {dia(mayor.desde)} al {dia(mayor.hasta)}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 py-4 border-b bg-gray-50 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Saldo anterior</p>
              <p className="font-bold">RD$ {fmt(mayor.saldo_anterior)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Total debito</p>
              <p className="font-bold">RD$ {fmt(mayor.total_debito)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Total credito</p>
              <p className="font-bold">RD$ {fmt(mayor.total_credito)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Saldo final</p>
              <p className={`font-bold text-lg ${parseFloat(mayor.saldo_final) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                RD$ {fmt(mayor.saldo_final)}
              </p>
            </div>
          </div>

          {mayor.movimientos.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">Esta cuenta no tuvo movimientos en ese rango</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-gray-600">Asiento</th>
                    <th className="px-4 py-3 text-left text-gray-600">Concepto</th>
                    <th className="px-4 py-3 text-right text-gray-600">Debito</th>
                    <th className="px-4 py-3 text-right text-gray-600">Credito</th>
                    <th className="px-4 py-3 text-right text-gray-600">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 italic" colSpan="5">Saldo anterior</td>
                    <td className="px-4 py-2 text-right font-bold">{fmt(mayor.saldo_anterior)}</td>
                  </tr>
                  {mayor.movimientos.map((m, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{dia(m.fecha)}</td>
                      <td className="px-4 py-3 font-mono">{m.numero}</td>
                      <td className="px-4 py-3">
                        {m.descripcion || m.asiento_descripcion}
                        {m.origen_documento && <span className="text-gray-500 text-xs ml-2">{m.origen_documento}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">{m.debito > 0 ? fmt(m.debito) : ''}</td>
                      <td className="px-4 py-3 text-right">{m.credito > 0 ? fmt(m.credito) : ''}</td>
                      <td className={`px-4 py-3 text-right font-medium ${m.saldo < 0 ? 'text-red-600' : ''}`}>
                        {fmt(m.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr className="border-t-2">
                    <td className="px-4 py-3" colSpan="3">TOTALES</td>
                    <td className="px-4 py-3 text-right">{fmt(mayor.total_debito)}</td>
                    <td className="px-4 py-3 text-right">{fmt(mayor.total_credito)}</td>
                    <td className={`px-4 py-3 text-right ${parseFloat(mayor.saldo_final) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmt(mayor.saldo_final)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}