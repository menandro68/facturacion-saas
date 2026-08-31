import { useState, useEffect } from 'react'
import API from '../services/api'

const FORM_VACIO = {
  codigo: '', nombre: '', tipo: 'gasto', naturaleza: 'deudora',
  padre_codigo: '', acepta_movimiento: true, descripcion: ''
}

const TIPOS = [
  { id: 'todos', label: 'Todas' },
  { id: 'activo', label: 'Activos' },
  { id: 'pasivo', label: 'Pasivos' },
  { id: 'capital', label: 'Capital' },
  { id: 'ingreso', label: 'Ingresos' },
  { id: 'costo', label: 'Costos' },
  { id: 'gasto', label: 'Gastos' }
]

export default function ContaCuentas() {
  const [vista, setVista] = useState('catalogo')
  const [cuentas, setCuentas] = useState([])
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    try {
      const [cu, cf] = await Promise.all([
        API.get('/contabilidad/cuentas'),
        API.get('/contabilidad/config')
      ])
      setCuentas(cu.data.data || [])
      setConfig(cf.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    setError(''); setOk('')
  }

  const inicializar = async () => {
    if (!confirm('Crear el catalogo de cuentas base para Republica Dominicana?')) return
    setError(''); setOk('')
    try {
      const res = await API.post('/contabilidad/cuentas/inicializar', {})
      setOk(res.data.mensaje)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al inicializar')
    }
  }

  const guardar = async () => {
    if (!form.codigo.trim()) { setError('El codigo es obligatorio'); return }
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      if (editando) {
        await API.put(`/contabilidad/cuentas/${editando.id}`, form)
        setOk('Cuenta actualizada')
      } else {
        await API.post('/contabilidad/cuentas', form)
        setOk('Cuenta creada')
      }
      setForm(FORM_VACIO)
      setEditando(null)
      setShowForm(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const editar = (c) => {
    setForm({
      codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza,
      padre_codigo: c.padre_codigo || '', acepta_movimiento: c.acepta_movimiento === true,
      descripcion: c.descripcion || ''
    })
    setEditando(c)
    setShowForm(true)
    setError(''); setOk('')
  }

  const toggle = async (c) => {
    const accion = c.estado === 'activo' ? 'inactivar' : 'reactivar'
    setError(''); setOk('')
    try {
      await API.put(`/contabilidad/cuentas/${c.id}/${accion}`, {})
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cambiar el estado')
    }
  }

  const cambiarConfig = async (c) => {
    const cod = prompt(`Cuenta para "${c.descripcion}"\nActual: ${c.cuenta_codigo || 'ninguna'}\n\nEscriba el codigo de la cuenta:`, c.cuenta_codigo || '')
    if (cod === null || !cod.trim()) return
    setError(''); setOk('')
    try {
      await API.put(`/contabilidad/config/${c.clave}`, { cuenta_codigo: cod.trim() })
      setOk('Configuracion actualizada')
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al actualizar')
    }
  }

  const filtradas = cuentas.filter(c => {
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false
    if (!busqueda.trim()) return true
    const b = busqueda.trim().toLowerCase()
    return (c.codigo || '').toLowerCase().includes(b) || (c.nombre || '').toLowerCase().includes(b)
  })

  const colorTipo = (t) => ({
    activo: 'text-blue-700', pasivo: 'text-orange-700', capital: 'text-purple-700',
    ingreso: 'text-green-700', costo: 'text-amber-700', gasto: 'text-red-700'
  }[t] || 'text-gray-700')

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando catalogo...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">
          {vista === 'catalogo' ? 'Catalogo de Cuentas' : 'Cuentas Automaticas'}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { setVista(vista === 'catalogo' ? 'config' : 'catalogo'); setError(''); setOk('') }}
            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">
            {vista === 'catalogo' ? 'Cuentas Automaticas' : 'Ver Catalogo'}
          </button>
          {vista === 'catalogo' && (
            cuentas.length === 0 ? (
              <button onClick={inicializar}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                Inicializar Catalogo Base
              </button>
            ) : (
              <button onClick={() => { setForm(FORM_VACIO); setEditando(null); setShowForm(!showForm); setError(''); setOk('') }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                + Nueva Cuenta
              </button>
            )
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {vista === 'catalogo'
          ? 'Las cuentas de nivel 1 y 2 agrupan; solo las de detalle aceptan movimientos.'
          : 'Defina que cuenta usa cada operacion cuando el sistema genera asientos automaticos.'}
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      {vista === 'catalogo' && showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editando ? `Editar cuenta ${editando.codigo}` : 'Nueva Cuenta'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={etiqueta}>Codigo *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange}
                className={campo + ' font-mono'} disabled={!!editando} autoComplete="off" />
            </div>
            <div className="md:col-span-2">
              <label className={etiqueta}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} className={campo} autoComplete="off" />
            </div>
            <div>
              <label className={etiqueta}>Cuenta padre</label>
              <select name="padre_codigo" value={form.padre_codigo} onChange={handleChange}
                className={campo} disabled={!!editando}>
                <option value="">Ninguna (nivel 1)</option>
                {cuentas.filter(c => !c.acepta_movimiento).map(c => (
                  <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={etiqueta}>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={campo} disabled={!!editando}>
                <option value="activo">Activo</option>
                <option value="pasivo">Pasivo</option>
                <option value="capital">Capital</option>
                <option value="ingreso">Ingreso</option>
                <option value="costo">Costo</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>
            <div>
              <label className={etiqueta}>Naturaleza *</label>
              <select name="naturaleza" value={form.naturaleza} onChange={handleChange} className={campo}>
                <option value="deudora">Deudora (aumenta al debito)</option>
                <option value="acreedora">Acreedora (aumenta al credito)</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="acepta_movimiento" checked={form.acepta_movimiento}
                  onChange={handleChange} className="w-4 h-4" />
                Acepta movimientos
              </label>
            </div>
            <div className="md:col-span-4">
              <label className={etiqueta}>Descripcion</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} className={campo} autoComplete="off" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(FORM_VACIO); setEditando(null); setError('') }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      )}

      {vista === 'catalogo' ? (
        <>
          {cuentas.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <label className={etiqueta}>Buscar</label>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Codigo o nombre de la cuenta" className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Tipo</label>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={campo}>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Cuentas</p>
                <p className="text-lg font-bold text-gray-800">{filtradas.length}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Codigo</th>
                  <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-center text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-center text-gray-600">Naturaleza</th>
                  <th className="px-4 py-3 text-center text-gray-600">Movimiento</th>
                  <th className="px-4 py-3 text-center text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    {cuentas.length === 0
                      ? 'No hay catalogo. Dele a "Inicializar Catalogo Base" para crear las cuentas estandar.'
                      : 'Ninguna cuenta coincide con el filtro'}
                  </td></tr>
                ) : filtradas.map(c => (
                  <tr key={c.id} className={`border-t hover:bg-gray-50 ${!c.acepta_movimiento ? 'bg-gray-50' : ''}`}>
                    <td className={`px-4 py-3 font-mono ${!c.acepta_movimiento ? 'font-bold' : ''}`}
                      style={{ paddingLeft: `${16 + (c.nivel - 1) * 16}px` }}>
                      {c.codigo}
                    </td>
                    <td className={`px-4 py-3 ${!c.acepta_movimiento ? 'font-bold' : ''}`}>{c.nombre}</td>
                    <td className={`px-4 py-3 text-center capitalize font-medium ${colorTipo(c.tipo)}`}>{c.tipo}</td>
                    <td className="px-4 py-3 text-center text-gray-600 capitalize">{c.naturaleza}</td>
                    <td className="px-4 py-3 text-center">{c.acepta_movimiento ? 'Si' : 'Agrupa'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>{c.estado === 'activo' ? 'ACTIVA' : 'INACTIVA'}</span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => editar(c)} className="text-blue-600 hover:underline text-sm mr-3">Editar</button>
                      <button onClick={() => toggle(c)}
                        className={`hover:underline text-sm ${c.estado === 'activo' ? 'text-red-600' : 'text-green-600'}`}>
                        {c.estado === 'activo' ? 'Inactivar' : 'Reactivar'}
                      </button>
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
                <th className="px-4 py-3 text-left text-gray-600">Operacion</th>
                <th className="px-4 py-3 text-left text-gray-600">Cuenta asignada</th>
                <th className="px-4 py-3 text-left text-gray-600">Nombre de la cuenta</th>
                <th className="px-4 py-3 text-center text-gray-600">Accion</th>
              </tr>
            </thead>
            <tbody>
              {config.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                  Sin configuraciones. Inicialice el catalogo primero.
                </td></tr>
              ) : config.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{c.descripcion}</td>
                  <td className="px-4 py-3 font-mono font-bold">{c.cuenta_codigo || '-'}</td>
                  <td className={`px-4 py-3 ${c.cuenta_nombre ? '' : 'text-red-600'}`}>
                    {c.cuenta_nombre || 'CUENTA NO ENCONTRADA'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => cambiarConfig(c)} className="text-blue-600 hover:underline text-sm">Cambiar</button>
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