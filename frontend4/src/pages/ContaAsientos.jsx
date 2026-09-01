import { useState, useEffect } from 'react'
import API from '../services/api'

const HOY = new Date().toISOString().slice(0, 10)
const LINEA_VACIA = { cuenta_codigo: '', descripcion: '', debito: '', credito: '' }

export default function ContaAsientos() {
  const [asientos, setAsientos] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [buscar, setBuscar] = useState('')

  const [fecha, setFecha] = useState(HOY)
  const [descripcion, setDescripcion] = useState('')
  const [notas, setNotas] = useState('')
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }, { ...LINEA_VACIA }])

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dia = (d) => d ? String(d).slice(0, 10) : '-'

  const cargar = async () => {
    try {
      const params = new URLSearchParams()
      if (desde) params.append('desde', desde)
      if (hasta) params.append('hasta', hasta)
      if (buscar.trim()) params.append('buscar', buscar.trim())
      const [as, cu] = await Promise.all([
        API.get(`/contabilidad/asientos?${params.toString()}`),
        API.get('/contabilidad/cuentas?solo_movimiento=true&estado=activo')
      ])
      setAsientos(as.data.data || [])
      setCuentas(cu.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const cambiarLinea = (i, campo, valor) => {
    const copia = [...lineas]
    copia[i] = { ...copia[i], [campo]: valor }
    // Una linea es debito o credito, nunca las dos
    if (campo === 'debito' && valor) copia[i].credito = ''
    if (campo === 'credito' && valor) copia[i].debito = ''
    setLineas(copia)
    setError(''); setOk('')
  }

  const agregarLinea = () => setLineas([...lineas, { ...LINEA_VACIA }])
  const quitarLinea = (i) => {
    if (lineas.length <= 2) { setError('Un asiento necesita al menos dos lineas'); return }
    setLineas(lineas.filter((_, idx) => idx !== i))
  }

  const totalDebito = lineas.reduce((s, l) => s + (parseFloat(l.debito) || 0), 0)
  const totalCredito = lineas.reduce((s, l) => s + (parseFloat(l.credito) || 0), 0)
  const diferencia = Math.round((totalDebito - totalCredito) * 100) / 100
  const cuadra = Math.abs(diferencia) < 0.009 && totalDebito > 0

  const limpiar = () => {
    setFecha(HOY); setDescripcion(''); setNotas('')
    setLineas([{ ...LINEA_VACIA }, { ...LINEA_VACIA }])
    setError('')
  }

  const guardar = async () => {
    if (!descripcion.trim()) { setError('La descripcion es obligatoria'); return }
    if (!cuadra) { setError('El asiento no cuadra. El debito debe ser igual al credito.'); return }
    setGuardando(true)
    try {
      const payload = {
        fecha, descripcion, notas,
        lineas: lineas
          .filter(l => l.cuenta_codigo && (parseFloat(l.debito) > 0 || parseFloat(l.credito) > 0))
          .map(l => ({
            cuenta_codigo: l.cuenta_codigo,
            descripcion: l.descripcion || null,
            debito: parseFloat(l.debito) || 0,
            credito: parseFloat(l.credito) || 0
          }))
      }
      const res = await API.post('/contabilidad/asientos', payload)
      setOk(`Asiento ${res.data.data.numero} registrado por RD$ ${fmt(res.data.data.total_debito)}`)
      limpiar()
      setShowForm(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar el asiento')
    } finally {
      setGuardando(false)
    }
  }

  const verDetalle = async (a) => {
    try {
      const res = await API.get(`/contabilidad/asientos/${a.id}`)
      setDetalle(res.data.data)
    } catch (err) {
      setError('Error al cargar el detalle')
    }
  }

  const anular = async (a) => {
    if (!confirm(`Anular el asiento ${a.numero}? Quedara registrado como anulado.`)) return
    setError(''); setOk('')
    try {
      await API.put(`/contabilidad/asientos/${a.id}/anular`, {})
      setOk(`${a.numero} anulado`)
      setDetalle(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al anular')
    }
  }

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando asientos...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Asientos Contables</h2>
        <button onClick={() => { setShowForm(!showForm); limpiar(); setOk('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Asiento
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Todo asiento debe cuadrar: el total del debito tiene que ser igual al total del credito.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Nuevo Asiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={etiqueta}>Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
            </div>
            <div className="md:col-span-3">
              <label className={etiqueta}>Descripcion *</label>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                className={campo} placeholder="Ej: Pago de alquiler del mes" autoComplete="off" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-gray-700">Lineas del asiento</h4>
            <button onClick={agregarLinea}
              className="bg-gray-100 border px-3 py-1 rounded text-xs hover:bg-gray-200">+ Agregar linea</button>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-gray-600" style={{ width: '30%' }}>Cuenta</th>
                  <th className="px-2 py-2 text-left text-gray-600">Concepto</th>
                  <th className="px-2 py-2 text-right text-gray-600" style={{ width: '15%' }}>Debito</th>
                  <th className="px-2 py-2 text-right text-gray-600" style={{ width: '15%' }}>Credito</th>
                  <th className="px-2 py-2" style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-1 py-2">
                      <select value={l.cuenta_codigo} onChange={(e) => cambiarLinea(i, 'cuenta_codigo', e.target.value)}
                        className={campo}>
                        <option value="">Seleccione...</option>
                        {cuentas.map(c => (
                          <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-2">
                      <input value={l.descripcion} onChange={(e) => cambiarLinea(i, 'descripcion', e.target.value)}
                        className={campo} autoComplete="off" />
                    </td>
                    <td className="px-1 py-2">
                      <input type="number" step="0.01" min="0" value={l.debito}
                        onChange={(e) => cambiarLinea(i, 'debito', e.target.value)}
                        className={campo + ' text-right'} />
                    </td>
                    <td className="px-1 py-2">
                      <input type="number" step="0.01" min="0" value={l.credito}
                        onChange={(e) => cambiarLinea(i, 'credito', e.target.value)}
                        className={campo + ' text-right'} />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button onClick={() => quitarLinea(i)} className="text-red-600 hover:underline text-xs">Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr className="border-t-2">
                  <td className="px-2 py-3" colSpan="2">TOTALES</td>
                  <td className="px-2 py-3 text-right">{fmt(totalDebito)}</td>
                  <td className="px-2 py-3 text-right">{fmt(totalCredito)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="px-2 py-2 text-right" colSpan="2">Diferencia</td>
                  <td className={`px-2 py-2 text-right ${cuadra ? 'text-green-700' : 'text-red-600'}`} colSpan="2">
                    {cuadra ? 'CUADRA' : fmt(Math.abs(diferencia))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mb-4">
            <label className={etiqueta}>Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} className={campo} autoComplete="off" />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); limpiar() }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={guardar} disabled={guardando || !cuadra}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Registrar Asiento'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div>
          <label className={etiqueta}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </div>
        <div className="flex-1 min-w-40">
          <label className={etiqueta}>Buscar</label>
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)}
            placeholder="Numero o descripcion" className={campo} autoComplete="off" />
        </div>
        <button onClick={cargar}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          Buscar
        </button>
      </div>

           <div className="bg-white rounded-lg shadow overflow-x-auto mb-6 hidden lg:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Numero</th>
              <th className="px-4 py-3 text-center text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Descripcion</th>
              <th className="px-4 py-3 text-center text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-left text-gray-600">Origen</th>
              <th className="px-4 py-3 text-right text-gray-600">Monto</th>
              <th className="px-4 py-3 text-center text-gray-600">Estado</th>
              <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asientos.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No hay asientos registrados</td></tr>
            ) : asientos.map(a => (
              <tr key={a.id} className={`border-t hover:bg-gray-50 ${a.estado === 'anulado' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono font-medium">{a.numero}</td>
                <td className="px-4 py-3 text-center">{dia(a.fecha)}</td>
                <td className="px-4 py-3">{a.descripcion}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                    a.tipo === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>{a.tipo}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.origen_documento || '-'}</td>
                <td className="px-4 py-3 text-right font-bold">{fmt(a.total_debito)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                    a.estado === 'registrado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{a.estado}</span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => verDetalle(a)} className="text-gray-700 hover:underline text-sm mr-3">Ver</button>
                  {a.estado === 'registrado' && a.tipo === 'manual' && (
                    <button onClick={() => anular(a)} className="text-red-600 hover:underline text-sm">Anular</button>
                  )}
                </td>
              </tr>
            ))}
             </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para pantallas pequenas */}
      <div className="lg:hidden space-y-3 mb-6">
        {asientos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            No hay asientos registrados
          </div>
        ) : asientos.map(a => (
          <div key={a.id} className={`bg-white rounded-lg shadow p-4 ${a.estado === 'anulado' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0">
                <p className="font-mono font-medium text-gray-800">{a.numero}</p>
                <p className="text-sm text-gray-600">{a.descripcion}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  a.tipo === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>{a.tipo}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  a.estado === 'registrado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{a.estado}</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-2 border-t">
              <div className="text-xs text-gray-500">
                <p>{dia(a.fecha)}</p>
                {a.origen_documento && <p className="font-mono">{a.origen_documento}</p>}
              </div>
              <span className="text-lg font-bold text-gray-800">RD$ {fmt(a.total_debito)}</span>
            </div>

            <div className="flex gap-4 mt-3 pt-3 border-t">
              <button onClick={() => verDetalle(a)}
                className="text-gray-700 hover:underline text-sm">Ver</button>
              {a.estado === 'registrado' && a.tipo === 'manual' && (
                <button onClick={() => anular(a)}
                  className="text-red-600 hover:underline text-sm">Anular</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {detalle && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex justify-between items-center px-4 pt-4 pb-2 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-700">
                {detalle.asiento.numero} — {detalle.asiento.descripcion}
              </h3>
              <p className="text-xs text-gray-500">
                {dia(detalle.asiento.fecha)} · {detalle.asiento.tipo}
                {detalle.asiento.notas ? ` · ${detalle.asiento.notas}` : ''}
              </p>
            </div>
            <button onClick={() => setDetalle(null)} className="text-gray-500 hover:text-gray-700 text-sm">Cerrar</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Cuenta</th>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Concepto</th>
                <th className="px-4 py-3 text-right text-gray-600">Debito</th>
                <th className="px-4 py-3 text-right text-gray-600">Credito</th>
              </tr>
            </thead>
            <tbody>
              {detalle.detalle.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{d.cuenta_codigo}</td>
                  <td className="px-4 py-3">{d.cuenta_nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{d.descripcion || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {parseFloat(d.debito) > 0 ? fmt(d.debito) : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {parseFloat(d.credito) > 0 ? fmt(d.credito) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr className="border-t-2">
                <td className="px-4 py-3" colSpan="3">TOTALES</td>
                <td className="px-4 py-3 text-right">{fmt(detalle.asiento.total_debito)}</td>
                <td className="px-4 py-3 text-right">{fmt(detalle.asiento.total_credito)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}