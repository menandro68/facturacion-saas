import { useState, useEffect } from 'react'
import API from '../services/api'

const MOV_VACIO = { empleado_id: '', concepto_id: '', cantidad: 1, monto: '', notas: '' }
const CON_VACIO = { codigo: '', nombre: '', tipo: 'ingreso', cotizable: true, gravable_isr: true }

export default function NominaMovimientos() {
  const [vista, setVista] = useState('movimientos')
  const [movimientos, setMovimientos] = useState([])
  const [conceptos, setConceptos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [showMov, setShowMov] = useState(false)
  const [formMov, setFormMov] = useState(MOV_VACIO)

  const [showCon, setShowCon] = useState(false)
  const [formCon, setFormCon] = useState(CON_VACIO)
  const [editandoCon, setEditandoCon] = useState(null)

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fecha = (d) => d ? String(d).slice(0, 10) : '-'

  const cargar = async () => {
    try {
      const [mv, co, em] = await Promise.all([
        API.get('/nomina/movimientos?aplicado=false'),
        API.get('/nomina/conceptos'),
        API.get('/nomina/empleados?estado=activo')
      ])
      setMovimientos(mv.data.data || [])
      setConceptos(co.data.data || [])
      setEmpleados(em.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const chMov = (e) => { setFormMov({ ...formMov, [e.target.name]: e.target.value }); setError(''); setOk('') }
  const chCon = (e) => {
    const { name, value, type, checked } = e.target
    setFormCon({ ...formCon, [name]: type === 'checkbox' ? checked : value })
    setError(''); setOk('')
  }

  const crearMov = async () => {
    if (!formMov.empleado_id) { setError('Seleccione un empleado'); return }
    if (!formMov.concepto_id) { setError('Seleccione un concepto'); return }
    if (!(parseFloat(formMov.monto) > 0)) { setError('El monto debe ser mayor que cero'); return }
    setGuardando(true)
    try {
      await API.post('/nomina/movimientos', formMov)
      setOk('Movimiento registrado. Se aplicara al procesar la proxima nomina.')
      setFormMov(MOV_VACIO)
      setShowMov(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar el movimiento')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarMov = async (m) => {
    if (!confirm(`Eliminar el movimiento "${m.concepto_nombre}" de ${m.empleado_nombre}?`)) return
    setError(''); setOk('')
    try {
      await API.delete(`/nomina/movimientos/${m.id}`)
      setOk('Movimiento eliminado')
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al eliminar')
    }
  }

  const guardarCon = async () => {
    if (!formCon.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      if (editandoCon) {
        await API.put(`/nomina/conceptos/${editandoCon.id}`, formCon)
        setOk('Concepto actualizado')
      } else {
        await API.post('/nomina/conceptos', formCon)
        setOk('Concepto creado')
      }
      setFormCon(CON_VACIO)
      setEditandoCon(null)
      setShowCon(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar el concepto')
    } finally {
      setGuardando(false)
    }
  }

  const editarCon = (c) => {
    setFormCon({
      codigo: c.codigo || '', nombre: c.nombre, tipo: c.tipo,
      cotizable: c.cotizable === true, gravable_isr: c.gravable_isr === true
    })
    setEditandoCon(c)
    setShowCon(true)
    setError(''); setOk('')
  }

  const toggleCon = async (c) => {
    const accion = c.estado === 'activo' ? 'inactivar' : 'reactivar'
    try {
      await API.put(`/nomina/conceptos/${c.id}/${accion}`, {})
      await cargar()
    } catch (err) {
      setError('Error al cambiar el estado')
    }
  }

  const conceptoSel = conceptos.find(c => c.id === formMov.concepto_id)
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto || 0), 0)
  const totalDeducciones = movimientos.filter(m => m.tipo === 'deduccion').reduce((s, m) => s + parseFloat(m.monto || 0), 0)

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">
          {vista === 'movimientos' ? 'Movimientos del Periodo' : 'Catalogo de Conceptos'}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { setVista(vista === 'movimientos' ? 'conceptos' : 'movimientos'); setError(''); setOk('') }}
            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">
            {vista === 'movimientos' ? 'Ver Conceptos' : 'Ver Movimientos'}
          </button>
          {vista === 'movimientos' ? (
            <button onClick={() => { setShowMov(!showMov); setError(''); setOk('') }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Nuevo Movimiento
            </button>
          ) : (
            <button onClick={() => { setFormCon(CON_VACIO); setEditandoCon(null); setShowCon(!showCon); setError(''); setOk('') }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Nuevo Concepto
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {vista === 'movimientos'
          ? 'Horas extras, comisiones, bonos y descuentos. Se aplican automaticamente al procesar la nomina.'
          : 'Defina cada concepto una sola vez indicando si cotiza a la TSS y si esta gravado con ISR.'}
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      {vista === 'movimientos' && showMov && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Nuevo Movimiento</h3>
          {conceptos.filter(c => c.estado === 'activo').length === 0 && (
            <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
              No hay conceptos activos. Cree uno primero en el catalogo de conceptos.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className={etiqueta}>Empleado *</label>
              <select name="empleado_id" value={formMov.empleado_id} onChange={chMov} className={campo}>
                <option value="">Seleccione...</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.cedula ? `— ${e.cedula}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={etiqueta}>Concepto *</label>
              <select name="concepto_id" value={formMov.concepto_id} onChange={chMov} className={campo}>
                <option value="">Seleccione...</option>
                {conceptos.filter(c => c.estado === 'activo').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo === 'ingreso' ? 'Ingreso' : 'Deduccion'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={etiqueta}>Cantidad</label>
              <input type="number" step="0.01" min="0" name="cantidad" value={formMov.cantidad}
                onChange={chMov} className={campo + ' text-right'} />
            </div>
            <div>
              <label className={etiqueta}>Monto total *</label>
              <input type="number" step="0.01" min="0" name="monto" value={formMov.monto}
                onChange={chMov} className={campo + ' text-right'} />
            </div>
            <div className="md:col-span-2 flex items-end pb-2">
              {conceptoSel && (
                <span className="text-xs text-gray-600">
                  {conceptoSel.tipo === 'ingreso'
                    ? `Ingreso · ${conceptoSel.cotizable ? 'cotiza TSS' : 'no cotiza'} · ${conceptoSel.gravable_isr ? 'gravado ISR' : 'exento ISR'}`
                    : 'Deduccion: se resta del neto'}
                </span>
              )}
            </div>
            <div className="md:col-span-4">
              <label className={etiqueta}>Notas</label>
              <input name="notas" value={formMov.notas} onChange={chMov} className={campo}
                placeholder="Ej: 8 horas extras del sabado" autoComplete="off" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowMov(false); setFormMov(MOV_VACIO); setError('') }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={crearMov} disabled={guardando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {vista === 'conceptos' && showCon && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editandoCon ? 'Editar Concepto' : 'Nuevo Concepto'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={etiqueta}>Codigo</label>
              <input name="codigo" value={formCon.codigo} onChange={chCon} className={campo} autoComplete="off" />
            </div>
            <div className="md:col-span-2">
              <label className={etiqueta}>Nombre *</label>
              <input name="nombre" value={formCon.nombre} onChange={chCon} className={campo}
                placeholder="Ej: Horas extras" autoComplete="off" />
            </div>
            <div>
              <label className={etiqueta}>Tipo *</label>
              <select name="tipo" value={formCon.tipo} onChange={chCon} className={campo}>
                <option value="ingreso">Ingreso</option>
                <option value="deduccion">Deduccion</option>
              </select>
            </div>
            {formCon.tipo === 'ingreso' && (
              <div className="md:col-span-4 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="cotizable" checked={formCon.cotizable} onChange={chCon} className="w-4 h-4" />
                  Cotiza a la TSS (AFP y SFS)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="gravable_isr" checked={formCon.gravable_isr} onChange={chCon} className="w-4 h-4" />
                  Gravado con ISR
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCon(false); setFormCon(CON_VACIO); setEditandoCon(null); setError('') }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={guardarCon} disabled={guardando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : (editandoCon ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      )}

      {vista === 'movimientos' ? (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-end gap-8 text-sm flex-wrap">
            <span>Ingresos pendientes: <strong className="text-green-700">RD$ {fmt(totalIngresos)}</strong></span>
            <span>Deducciones pendientes: <strong className="text-red-700">RD$ {fmt(totalDeducciones)}</strong></span>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Empleado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Concepto</th>
                  <th className="px-4 py-3 text-center text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-center text-gray-600">Cantidad</th>
                  <th className="px-4 py-3 text-right text-gray-600">Monto</th>
                  <th className="px-4 py-3 text-center text-gray-600">TSS</th>
                  <th className="px-4 py-3 text-center text-gray-600">ISR</th>
                  <th className="px-4 py-3 text-left text-gray-600">Notas</th>
                  <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">
                    No hay movimientos pendientes de aplicar
                  </td></tr>
                ) : movimientos.map(m => (
                  <tr key={m.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.empleado_nombre}</td>
                    <td className="px-4 py-3">{m.concepto_nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{m.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{fmt(m.cantidad)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      m.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'
                    }`}>{fmt(m.monto)}</td>
                    <td className="px-4 py-3 text-center">{m.tipo === 'ingreso' ? (m.cotizable ? 'Si' : 'No') : '-'}</td>
                    <td className="px-4 py-3 text-center">{m.tipo === 'ingreso' ? (m.gravable_isr ? 'Si' : 'No') : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.notas || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => eliminarMov(m)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Codigo</th>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-center text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-center text-gray-600">Cotiza TSS</th>
                <th className="px-4 py-3 text-center text-gray-600">Gravado ISR</th>
                <th className="px-4 py-3 text-center text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                  No hay conceptos registrados
                </td></tr>
              ) : conceptos.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{c.codigo || '-'}</td>
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                      c.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{c.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{c.tipo === 'ingreso' ? (c.cotizable ? 'Si' : 'No') : '-'}</td>
                  <td className="px-4 py-3 text-center">{c.tipo === 'ingreso' ? (c.gravable_isr ? 'Si' : 'No') : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>{c.estado === 'activo' ? 'ACTIVO' : 'INACTIVO'}</span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button onClick={() => editarCon(c)} className="text-blue-600 hover:underline text-sm mr-3">Editar</button>
                    <button onClick={() => toggleCon(c)}
                      className={`hover:underline text-sm ${c.estado === 'activo' ? 'text-red-600' : 'text-green-600'}`}>
                      {c.estado === 'activo' ? 'Inactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}