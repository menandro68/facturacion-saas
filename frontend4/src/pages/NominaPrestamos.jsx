import { useState, useEffect } from 'react'
import API from '../services/api'

const FORM_VACIO = {
  empleado_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  monto_original: '',
  cuota: '',
  motivo: '',
  notas: ''
}

export default function NominaPrestamos() {
  const [prestamos, setPrestamos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [recienCreado, setRecienCreado] = useState(null)
  const [buscarEmpleado, setBuscarEmpleado] = useState('')
  const [resumen, setResumen] = useState([])

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fecha = (d) => d ? String(d).slice(0, 10) : '-'

  const cargar = async () => {
    try {
         const [pr, em, rs] = await Promise.all([
        API.get(`/nomina/prestamos?estado=${filtroEstado}`),
        API.get('/nomina/empleados?estado=activo'),
        API.get('/nomina/prestamos/resumen/empleados')
      ])
      setPrestamos(pr.data.data || [])
      setEmpleados(em.data.data || [])
      setResumen(rs.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtroEstado])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(''); setOk('')
  }

  const imprimir = async (p) => {
    setError('')
    try {
      const res = await API.get(`/nomina/prestamos/${p.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el comprobante del prestamo')
    }
  }

    const estadoCuenta = async (r) => {
    setError('')
    try {
      const res = await API.get(`/nomina/prestamos/empleado/${r.empleado_id}/estado`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el estado de cuenta')
    }
  }

  const crear = async () => {
    if (!form.empleado_id) { setError('Seleccione un empleado'); return }
    if (!(parseFloat(form.monto_original) > 0)) { setError('El monto debe ser mayor que cero'); return }
    if (!(parseFloat(form.cuota) > 0)) { setError('La cuota debe ser mayor que cero'); return }
    setGuardando(true)
    try {
      const res = await API.post('/nomina/prestamos', form)
      const nuevo = res.data.data
      setOk(`Prestamo ${nuevo.numero} registrado. Se descontara automaticamente en cada nomina.`)
      setForm(FORM_VACIO)
      setShowForm(false)
      await cargar()
      setRecienCreado(nuevo)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar el prestamo')
    } finally {
      setGuardando(false)
    }
  }

  const abonar = async (p) => {
    const monto = prompt(`Abono manual a ${p.numero} (balance RD$ ${fmt(p.balance)}):`)
    if (monto === null) return
    const val = parseFloat(monto)
    if (!(val > 0)) { setError('El abono debe ser un monto valido'); return }
    setError(''); setOk('')
    try {
      const res = await API.post(`/nomina/prestamos/${p.id}/abono`, { monto: val })
      setOk(`Abono aplicado. Nuevo balance: RD$ ${fmt(res.data.data.balance)}`)
      await cargar()
      if (detalle && detalle.prestamo.id === p.id) await verDetalle(p)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al aplicar el abono')
    }
  }

  const cancelar = async (p) => {
    if (!confirm(`Cancelar ${p.numero}? Se condona el balance de RD$ ${fmt(p.balance)} y dejara de descontarse.`)) return
    setError(''); setOk('')
    try {
      await API.put(`/nomina/prestamos/${p.id}/cancelar`, {})
      setOk(`${p.numero} cancelado`)
      setDetalle(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cancelar')
    }
  }

  const verDetalle = async (p) => {
    try {
      const res = await API.get(`/nomina/prestamos/${p.id}`)
      setDetalle(res.data.data)
    } catch (err) {
      setError('Error al cargar el detalle')
    }
  }

  const badge = (estado) => ({
    activo: 'bg-blue-100 text-blue-700',
    saldado: 'bg-green-100 text-green-700',
    cancelado: 'bg-gray-200 text-gray-600'
  }[estado] || 'bg-gray-200 text-gray-600')

  const totalBalance = prestamos
    .filter(p => p.estado === 'activo')
    .reduce((s, p) => s + parseFloat(p.balance || 0), 0)

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando prestamos...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Prestamos a Empleados</h2>
        <button onClick={() => { setShowForm(!showForm); setError(''); setOk('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Prestamo
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        La cuota se descuenta automaticamente al procesar cada nomina. Si se anula un periodo, el descuento se revierte.
      </p>

           {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      {recienCreado && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-base text-gray-800 mb-1 font-medium">
              Desea imprimir el comprobante del prestamo?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {recienCreado.numero} — RD$ {fmt(recienCreado.monto_original)}. El empleado debe firmarlo como constancia.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRecienCreado(null)}
                className="px-6 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                No
              </button>
              <button autoFocus onClick={() => { imprimir(recienCreado); setRecienCreado(null) }}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                Si
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Nuevo Prestamo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className={etiqueta}>Empleado *</label>
              <select name="empleado_id" value={form.empleado_id} onChange={handleChange} className={campo}>
                <option value="">Seleccione...</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.cedula ? `— ${e.cedula}` : ''} (salario RD$ {fmt(e.salario_base)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={etiqueta}>Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Monto del prestamo *</label>
              <input type="number" step="0.01" min="0" name="monto_original"
                value={form.monto_original} onChange={handleChange} className={campo + ' text-right'} />
            </div>
            <div>
              <label className={etiqueta}>Cuota por periodo *</label>
              <input type="number" step="0.01" min="0" name="cuota"
                value={form.cuota} onChange={handleChange} className={campo + ' text-right'} />
            </div>
            <div className="flex items-end pb-2 text-sm text-gray-500">
              {form.monto_original && form.cuota && parseFloat(form.cuota) > 0 && (
                <span>Se saldaria en {Math.ceil(parseFloat(form.monto_original) / parseFloat(form.cuota))} periodo(s)</span>
              )}
            </div>
            <div className="md:col-span-3">
              <label className={etiqueta}>Motivo</label>
              <input name="motivo" value={form.motivo} onChange={handleChange} className={campo}
                placeholder="Ej: Adelanto por emergencia medica" autoComplete="off" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(FORM_VACIO); setError('') }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={crear} disabled={guardando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Registrar Prestamo'}
            </button>
          </div>
        </div>
      )}

           <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Deuda total por empleado</h3>
        <input
          value={buscarEmpleado}
          onChange={(e) => setBuscarEmpleado(e.target.value)}
          placeholder="Escriba el nombre o la cedula del empleado"
          className={campo + ' mb-3'}
          autoComplete="off"
        />
        {resumen.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Ningun empleado tiene prestamos activos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Empleado</th>
                  <th className="px-3 py-2 text-left text-gray-600">Cedula</th>
                  <th className="px-3 py-2 text-right text-gray-600">Salario</th>
                  <th className="px-3 py-2 text-center text-gray-600">Prestamos</th>
                  <th className="px-3 py-2 text-right text-gray-600">Cuota por periodo</th>
                  <th className="px-3 py-2 text-right text-gray-600">Deuda total</th>
                                <th className="px-3 py-2 text-right text-gray-600">% del salario</th>
                  <th className="px-3 py-2 text-center text-gray-600">Estado de cuenta</th>
                </tr>
              </thead>
              <tbody>
                {resumen
                  .filter(r => {
                    if (!buscarEmpleado.trim()) return true
                    const b = buscarEmpleado.trim().toLowerCase()
                    return (r.nombre || '').toLowerCase().includes(b)
                      || (r.cedula || '').toLowerCase().includes(b)
                  })
                  .map(r => {
                    const sal = parseFloat(r.salario_base) || 0
                    const cuota = parseFloat(r.cuota_periodo) || 0
                    const pct = sal > 0 ? (cuota / sal) * 100 : 0
                    return (
                      <tr key={r.empleado_id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium">{r.nombre}</td>
                        <td className="px-3 py-3">{r.cedula || '-'}</td>
                        <td className="px-3 py-3 text-right">{fmt(r.salario_base)}</td>
                        <td className="px-3 py-3 text-center">{r.prestamos_activos}</td>
                        <td className="px-3 py-3 text-right text-red-600">{fmt(r.cuota_periodo)}</td>
                        <td className="px-3 py-3 text-right font-bold text-orange-700">RD$ {fmt(r.balance_total)}</td>
                                          <td className={`px-3 py-3 text-right font-medium ${pct > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => estadoCuenta(r)}
                            className="text-indigo-600 hover:underline text-sm">Imprimir</button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div>
          <label className={etiqueta}>Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={campo}>
            <option value="activo">Activos</option>
            <option value="saldado">Saldados</option>
            <option value="cancelado">Cancelados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">Prestamos activos: {prestamos.filter(p => p.estado === 'activo').length}</p>
          <p className="text-lg font-bold text-orange-700">Balance total: RD$ {fmt(totalBalance)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Numero</th>
              <th className="px-4 py-3 text-left text-gray-600">Empleado</th>
              <th className="px-4 py-3 text-center text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Motivo</th>
              <th className="px-4 py-3 text-right text-gray-600">Monto</th>
              <th className="px-4 py-3 text-right text-gray-600">Cuota</th>
              <th className="px-4 py-3 text-right text-gray-600">Descontado</th>
              <th className="px-4 py-3 text-right text-gray-600">Balance</th>
              <th className="px-4 py-3 text-center text-gray-600">Estado</th>
              <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 ? (
              <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-400">No hay prestamos registrados</td></tr>
            ) : prestamos.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{p.numero}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{p.empleado_nombre}</span>
                  <span className="block text-xs text-gray-500">{p.empleado_cedula || ''}</span>
                </td>
                <td className="px-4 py-3 text-center">{fecha(p.fecha)}</td>
                <td className="px-4 py-3 text-gray-600">{p.motivo || '-'}</td>
                <td className="px-4 py-3 text-right">{fmt(p.monto_original)}</td>
                <td className="px-4 py-3 text-right">{fmt(p.cuota)}</td>
                <td className="px-4 py-3 text-right text-green-700">{fmt(p.total_descontado)}</td>
                <td className="px-4 py-3 text-right font-bold text-orange-700">{fmt(p.balance)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${badge(p.estado)}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <button onClick={() => verDetalle(p)} className="text-gray-700 hover:underline text-sm mr-3">Ver</button>
                  <button onClick={() => imprimir(p)} className="text-indigo-600 hover:underline text-sm mr-3">Imprimir</button>
                  {p.estado === 'activo' && (
                    <>
                      <button onClick={() => abonar(p)} className="text-green-600 hover:underline text-sm mr-3">Abonar</button>
                      <button onClick={() => cancelar(p)} className="text-red-600 hover:underline text-sm">Cancelar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex justify-between items-center px-4 pt-4 pb-2 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-700">
                Historial de {detalle.prestamo.numero} — {detalle.prestamo.empleado_nombre}
              </h3>
              <p className="text-xs text-gray-500">
                Monto: RD$ {fmt(detalle.prestamo.monto_original)} · Cuota: RD$ {fmt(detalle.prestamo.cuota)} ·
                Balance: RD$ {fmt(detalle.prestamo.balance)}
              </p>
            </div>
            <button onClick={() => setDetalle(null)} className="text-gray-500 hover:text-gray-700 text-sm">Cerrar</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left text-gray-600">Origen</th>
                <th className="px-4 py-3 text-right text-gray-600">Balance anterior</th>
                <th className="px-4 py-3 text-right text-gray-600">Monto</th>
                <th className="px-4 py-3 text-right text-gray-600">Balance nuevo</th>
              </tr>
            </thead>
            <tbody>
              {detalle.cuotas.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                  Aun no se ha descontado ninguna cuota
                </td></tr>
              ) : detalle.cuotas.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{fecha(c.creado_en)}</td>
                  <td className="px-4 py-3">
                    {c.periodo_numero
                      ? <span>Nomina {c.periodo_numero} <span className="text-gray-500">{c.periodo_descripcion || ''}</span></span>
                      : <span className="text-purple-700">Abono manual</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(c.balance_anterior)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(c.monto)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-700">{fmt(c.balance_nuevo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}