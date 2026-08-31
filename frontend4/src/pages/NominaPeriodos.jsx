import { useState, useEffect } from 'react'
import API from '../services/api'

const HOY = new Date().toISOString().slice(0, 10)

const FORM_VACIO = {
  descripcion: '',
  tipo: 'ordinaria',
  frecuencia: 'mensual',
  fecha_inicio: '',
  fecha_fin: '',
  fecha_pago: ''
}

export default function NominaPeriodos() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fecha = (d) => d ? String(d).slice(0, 10) : '-'

  const cargar = async () => {
    try {
      const res = await API.get('/nomina/periodos')
      setPeriodos(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(''); setOk('')
  }

  const crear = async () => {
    if (!form.fecha_inicio || !form.fecha_fin) {
      setError('Las fechas de inicio y fin son obligatorias')
      return
    }
    setGuardando(true)
    try {
      await API.post('/nomina/periodos', form)
      setOk('Periodo creado en borrador')
      setForm(FORM_VACIO)
      setShowForm(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al crear el periodo')
    } finally {
      setGuardando(false)
    }
  }

  const calcular = async (p) => {
    if (!confirm(`Procesar ${p.numero}? Se calcularan los montos y quedaran congelados.`)) return
    setError(''); setOk('')
    try {
      const res = await API.put(`/nomina/periodos/${p.id}/calcular`, {})
      setOk(`${p.numero} procesado. Neto a pagar: RD$ ${fmt(res.data.data.total_neto)}`)
      await cargar()
      await verDetalle({ ...p, estado: 'procesada' })
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al procesar')
    }
  }

  const pagar = async (p) => {
    if (!confirm(`Marcar ${p.numero} como pagada?`)) return
    setError(''); setOk('')
    try {
      await API.put(`/nomina/periodos/${p.id}/pagar`, {})
      setOk(`${p.numero} marcada como pagada`)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al marcar como pagada')
    }
  }

  const anular = async (p) => {
    if (!confirm(`Anular ${p.numero}? Se borrara el detalle calculado y podra recalcularse.`)) return
    setError(''); setOk('')
    try {
      await API.put(`/nomina/periodos/${p.id}/anular`, {})
      setOk(`${p.numero} anulada`)
      setDetalle(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al anular')
    }
  }

   const volante = async (d) => {
    setError('')
    try {
      const res = await API.get(`/nomina/detalle/${d.id}/volante`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el volante')
    }
  }

    const reporte = async (p) => {
    setError('')
    try {
      const res = await API.get(`/nomina/periodos/${p.id}/reporte`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el reporte')
    }
  }

  const archivoTss = async (p) => {
    setError('')
    try {
      const res = await API.get(`/nomina/periodos/${p.id}/tss`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `tss-${p.numero}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setOk(`Archivo TSS de ${p.numero} descargado`)
    } catch (err) {
      setError('Error al generar el archivo TSS')
    }
  }

  const verDetalle = async (p) => {
    setCargandoDetalle(true)
    try {
      const res = await API.get(`/nomina/periodos/${p.id}`)
      setDetalle(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar el detalle')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const badge = (estado) => {
    const m = {
      borrador: 'bg-gray-200 text-gray-700',
      procesada: 'bg-blue-100 text-blue-700',
      pagada: 'bg-green-100 text-green-700',
      anulada: 'bg-red-100 text-red-700'
    }
    return m[estado] || 'bg-gray-200 text-gray-700'
  }

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando periodos...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Periodos de Nomina</h2>
        <button onClick={() => { setShowForm(!showForm); setError(''); setOk('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Periodo
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Nuevo Periodo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-3">
              <label className={etiqueta}>Descripcion</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange}
                className={campo} placeholder="Ej: Nomina Septiembre 2026" autoComplete="off" />
            </div>
            <div>
              <label className={etiqueta}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={campo}>
                <option value="ordinaria">Ordinaria</option>
                <option value="extraordinaria">Extraordinaria</option>
                <option value="regalia">Regalia Pascual</option>
              </select>
            </div>
            <div>
              <label className={etiqueta}>Frecuencia</label>
              <select name="frecuencia" value={form.frecuencia} onChange={handleChange} className={campo}>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
            <div></div>
            <div>
              <label className={etiqueta}>Fecha inicio *</label>
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Fecha fin *</label>
              <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Fecha de pago</label>
              <input type="date" name="fecha_pago" value={form.fecha_pago} onChange={handleChange} className={campo} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(FORM_VACIO); setError('') }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={crear} disabled={guardando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Creando...' : 'Crear Periodo'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Numero</th>
              <th className="px-4 py-3 text-left text-gray-600">Descripcion</th>
              <th className="px-4 py-3 text-center text-gray-600">Periodo</th>
              <th className="px-4 py-3 text-center text-gray-600">Frecuencia</th>
              <th className="px-4 py-3 text-center text-gray-600">Emp.</th>
              <th className="px-4 py-3 text-right text-gray-600">Ingresos</th>
              <th className="px-4 py-3 text-right text-gray-600">Deducciones</th>
              <th className="px-4 py-3 text-right text-gray-600">Neto</th>
              <th className="px-4 py-3 text-center text-gray-600">Estado</th>
              <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {periodos.length === 0 ? (
              <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-400">No hay periodos registrados</td></tr>
            ) : periodos.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{p.numero}</td>
                <td className="px-4 py-3">{p.descripcion || '-'}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">{fecha(p.fecha_inicio)} a {fecha(p.fecha_fin)}</td>
                <td className="px-4 py-3 text-center capitalize">{p.frecuencia}</td>
                <td className="px-4 py-3 text-center">{p.cantidad_empleados}</td>
                <td className="px-4 py-3 text-right">{fmt(p.total_ingresos)}</td>
                <td className="px-4 py-3 text-right text-red-600">{fmt(p.total_deducciones)}</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(p.total_neto)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${badge(p.estado)}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  {p.estado === 'borrador' && (
                    <button onClick={() => calcular(p)} className="text-blue-600 hover:underline text-sm mr-3">Procesar</button>
                  )}
                                {p.estado !== 'anulada' && p.estado !== 'borrador' && (
                    <>
                      <button onClick={() => verDetalle(p)} className="text-gray-700 hover:underline text-sm mr-3">Ver</button>
                      <button onClick={() => reporte(p)} className="text-indigo-600 hover:underline text-sm mr-3">Reporte</button>
                      <button onClick={() => archivoTss(p)} className="text-purple-600 hover:underline text-sm mr-3">TSS</button>
                    </>
                  )}
                  {p.estado === 'procesada' && (
                    <button onClick={() => pagar(p)} className="text-green-600 hover:underline text-sm mr-3">Pagar</button>
                  )}
                  {p.estado !== 'anulada' && (
                    <button onClick={() => anular(p)} className="text-red-600 hover:underline text-sm">Anular</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cargandoDetalle && <div className="text-gray-500 text-sm">Cargando detalle...</div>}

      {detalle && detalle.detalle && detalle.detalle.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex justify-between items-center px-4 pt-4 pb-2 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-gray-700">
              Detalle de {detalle.periodo.numero} — {detalle.periodo.descripcion || ''}
            </h3>
            <button onClick={() => setDetalle(null)}
              className="text-gray-500 hover:text-gray-700 text-sm">Cerrar</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-gray-600">Empleado</th>
                <th className="px-3 py-3 text-left text-gray-600">Cedula</th>
                <th className="px-3 py-3 text-right text-gray-600">Salario</th>
                <th className="px-3 py-3 text-right text-gray-600">Otros ing.</th>
                <th className="px-3 py-3 text-right text-gray-600">Total ing.</th>
                <th className="px-3 py-3 text-right text-gray-600">AFP</th>
                <th className="px-3 py-3 text-right text-gray-600">SFS</th>
                <th className="px-3 py-3 text-right text-gray-600">ISR</th>
                <th className="px-3 py-3 text-right text-gray-600">Otras ded.</th>
                          <th className="px-3 py-3 text-right text-gray-600">Neto</th>
                <th className="px-3 py-3 text-center text-gray-600">Volante</th>
              </tr>
            </thead>
            <tbody>
              {detalle.detalle.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium">{d.empleado_nombre}</td>
                  <td className="px-3 py-3">{d.empleado_cedula || '-'}</td>
                  <td className="px-3 py-3 text-right">{fmt(d.salario_base)}</td>
                  <td className="px-3 py-3 text-right">{fmt(d.otros_ingresos)}</td>
                  <td className="px-3 py-3 text-right">{fmt(d.total_ingresos)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{fmt(d.afp_empleado)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{fmt(d.sfs_empleado)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{fmt(d.isr)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{fmt(d.otras_deducciones)}</td>
                              <td className="px-3 py-3 text-right font-bold text-green-700">{fmt(d.neto_pagar)}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => volante(d)}
                      className="text-blue-600 hover:underline text-sm">Imprimir</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr className="border-t-2">
                <td className="px-3 py-3" colSpan="4">TOTALES</td>
                <td className="px-3 py-3 text-right">{fmt(detalle.periodo.total_ingresos)}</td>
                <td className="px-3 py-3" colSpan="3"></td>
                <td className="px-3 py-3 text-right text-red-600">{fmt(detalle.periodo.total_deducciones)}</td>
                <td className="px-3 py-3 text-right text-green-700">{fmt(detalle.periodo.total_neto)}</td>
                <td className="px-3 py-3"></td>
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600 flex justify-end gap-6 flex-wrap">
            <span>Aportes del empleador: <strong className="text-purple-700">RD$ {fmt(detalle.periodo.total_aportes_empleador)}</strong></span>
            <span>Costo total: <strong>RD$ {fmt(parseFloat(detalle.periodo.total_ingresos || 0) + parseFloat(detalle.periodo.total_aportes_empleador || 0))}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}