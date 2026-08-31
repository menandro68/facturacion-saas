import { useState, useEffect } from 'react'
import API from '../services/api'

const FORM_VACIO = {
  codigo: '', nombre: '', cedula: '', nss: '', cargo: '', departamento: '',
  fecha_ingreso: '', tipo_contrato: 'indefinido', salario_base: '',
  frecuencia_pago: 'mensual', forma_pago: 'transferencia', banco: '',
  cuenta_bancaria: '', afp_id: '', ars_id: '', telefono: '', email: '',
  direccion: '', exento_isr: false
}

export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fetchEmpleados = async () => {
    try {
      const res = await API.get('/nomina/empleados')
      setEmpleados(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmpleados() }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    setError('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault()
        const formEl = target.form
        if (!formEl) return
        const campos = Array.from(formEl.querySelectorAll('input, select'))
        const idx = campos.indexOf(target)
        if (idx >= 0 && idx < campos.length - 1) campos[idx + 1].focus()
      }
    }
  }

  const abrirNuevo = () => {
    setForm(FORM_VACIO)
    setEditando(null)
    setError('')
    setShowForm(true)
  }

  const abrirEditar = (emp) => {
    setForm({
      codigo: emp.codigo || '',
      nombre: emp.nombre || '',
      cedula: emp.cedula || '',
      nss: emp.nss || '',
      cargo: emp.cargo || '',
      departamento: emp.departamento || '',
      fecha_ingreso: emp.fecha_ingreso ? String(emp.fecha_ingreso).slice(0, 10) : '',
      tipo_contrato: emp.tipo_contrato || 'indefinido',
      salario_base: emp.salario_base != null ? String(emp.salario_base) : '',
      frecuencia_pago: emp.frecuencia_pago || 'mensual',
      forma_pago: emp.forma_pago || 'transferencia',
      banco: emp.banco || '',
      cuenta_bancaria: emp.cuenta_bancaria || '',
      afp_id: emp.afp_id || '',
      ars_id: emp.ars_id || '',
      telefono: emp.telefono || '',
      email: emp.email || '',
      direccion: emp.direccion || '',
      exento_isr: emp.exento_isr === true
    })
    setEditando(emp)
    setError('')
    setShowForm(true)
  }

  const cancelar = () => {
    setShowForm(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setError('')
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (form.salario_base && parseFloat(form.salario_base) < 0) { setError('El salario no puede ser negativo'); return }
    setGuardando(true)
    try {
      const payload = { ...form, salario_base: parseFloat(form.salario_base) || 0 }
      if (editando) {
        await API.put(`/nomina/empleados/${editando.id}`, payload)
      } else {
        await API.post('/nomina/empleados', payload)
      }
      await fetchEmpleados()
      cancelar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const inactivar = async (emp) => {
    if (!confirm(`Inactivar a ${emp.nombre}? El historico de nomina se conserva.`)) return
    try {
      await API.put(`/nomina/empleados/${emp.id}/inactivar`, {})
      await fetchEmpleados()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al inactivar')
    }
  }

  const reactivar = async (emp) => {
    try {
      await API.put(`/nomina/empleados/${emp.id}/reactivar`, {})
      await fetchEmpleados()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al reactivar')
    }
  }

    const imprimir = async () => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (filtroEstado) params.append('estado', filtroEstado)
      if (busqueda.trim()) params.append('buscar', busqueda.trim())
      const res = await API.get(`/nomina/empleados-pdf?${params.toString()}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el listado')
    }
  }

  const filtrados = empleados.filter(e => {
    if (filtroEstado !== 'todos' && e.estado !== filtroEstado) return false
    if (!busqueda.trim()) return true
    const b = busqueda.toLowerCase()
    return (e.nombre || '').toLowerCase().includes(b)
      || (e.cedula || '').toLowerCase().includes(b)
      || (e.cargo || '').toLowerCase().includes(b)
      || (e.departamento || '').toLowerCase().includes(b)
      || (e.codigo || '').toLowerCase().includes(b)
  })

  const totalNomina = filtrados
    .filter(e => e.estado === 'activo')
    .reduce((s, e) => s + parseFloat(e.salario_base || 0), 0)

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando empleados...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Empleados</h2>
              <div className="flex gap-2">
          <button onClick={imprimir}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
            Imprimir Listado
          </button>
          <button onClick={abrirNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Nuevo Empleado
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {editando ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h3>
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
          <form onKeyDown={handleKeyDown} onSubmit={(e) => { e.preventDefault(); guardar() }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={etiqueta}>Codigo</label>
                <input name="codigo" value={form.codigo} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div className="md:col-span-2">
                <label className={etiqueta}>Nombre completo *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Cedula</label>
                <input name="cedula" value={form.cedula} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>NSS</label>
                <input name="nss" value={form.nss} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Telefono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Cargo</label>
                <input name="cargo" value={form.cargo} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Departamento</label>
                <input name="departamento" value={form.departamento} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Fecha de ingreso</label>
                <input type="date" name="fecha_ingreso" value={form.fecha_ingreso} onChange={handleChange} className={campo} />
              </div>
              <div>
                <label className={etiqueta}>Tipo de contrato</label>
                <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange} className={campo}>
                  <option value="indefinido">Indefinido</option>
                  <option value="temporal">Temporal</option>
                  <option value="por_obra">Por obra</option>
                  <option value="pasantia">Pasantia</option>
                </select>
              </div>
              <div>
                <label className={etiqueta}>Salario base</label>
                <input type="number" step="0.01" min="0" name="salario_base" value={form.salario_base}
                  onChange={handleChange} className={campo + ' text-right'} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Frecuencia de pago</label>
                <select name="frecuencia_pago" value={form.frecuencia_pago} onChange={handleChange} className={campo}>
                  <option value="mensual">Mensual</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>
              <div>
                <label className={etiqueta}>Forma de pago</label>
                <select name="forma_pago" value={form.forma_pago} onChange={handleChange} className={campo}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className={etiqueta}>Banco</label>
                <input name="banco" value={form.banco} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Cuenta bancaria</label>
                <input name="cuenta_bancaria" value={form.cuenta_bancaria} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>AFP</label>
                <input name="afp_id" value={form.afp_id} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>ARS</label>
                <input name="ars_id" value={form.ars_id} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div>
                <label className={etiqueta}>Email</label>
                <input name="email" value={form.email} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div className="md:col-span-2">
                <label className={etiqueta}>Direccion</label>
                <input name="direccion" value={form.direccion} onChange={handleChange} className={campo} autoComplete="off" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="exento_isr" checked={form.exento_isr} onChange={handleChange} className="w-4 h-4" />
                  Exento de ISR
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={cancelar}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className={etiqueta}>Buscar</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, cedula, cargo o departamento" className={campo} autoComplete="off" />
        </div>
        <div>
          <label className={etiqueta}>Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={campo}>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Empleados activos: {filtrados.filter(e => e.estado === 'activo').length}</p>
          <p className="text-sm font-bold text-green-700">Nomina base: RD$ {fmt(totalNomina)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Codigo</th>
              <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left text-gray-600">Cedula</th>
              <th className="px-4 py-3 text-left text-gray-600">Cargo</th>
              <th className="px-4 py-3 text-left text-gray-600">Departamento</th>
              <th className="px-4 py-3 text-right text-gray-600">Salario</th>
              <th className="px-4 py-3 text-center text-gray-600">Frecuencia</th>
              <th className="px-4 py-3 text-center text-gray-600">Estado</th>
              <th className="px-4 py-3 text-center text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">No hay empleados registrados</td></tr>
            ) : filtrados.map(e => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{e.codigo || '-'}</td>
                <td className="px-4 py-3 font-medium">{e.nombre}</td>
                <td className="px-4 py-3">{e.cedula || '-'}</td>
                <td className="px-4 py-3">{e.cargo || '-'}</td>
                <td className="px-4 py-3">{e.departamento || '-'}</td>
                <td className="px-4 py-3 text-right">RD$ {fmt(e.salario_base)}</td>
                <td className="px-4 py-3 text-center capitalize">{e.frecuencia_pago}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    e.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {e.estado === 'activo' ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => abrirEditar(e)} className="text-blue-600 hover:underline text-sm mr-3">Editar</button>
                  {e.estado === 'activo' ? (
                    <button onClick={() => inactivar(e)} className="text-red-600 hover:underline text-sm">Inactivar</button>
                  ) : (
                    <button onClick={() => reactivar(e)} className="text-green-600 hover:underline text-sm">Reactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}