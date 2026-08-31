import { useState, useEffect } from 'react'
import API from '../services/api'

export default function NominaLiquidacion() {
  const [empleados, setEmpleados] = useState([])
  const [form, setForm] = useState({
    empleado_id: '',
    fecha_salida: new Date().toISOString().slice(0, 10),
    causa: 'desahucio',
    vacaciones_tomadas: 0,
    preaviso_cumplido: false
  })
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  useEffect(() => {
    API.get('/nomina/empleados')
      .then(r => setEmpleados(r.data.data || []))
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    setError(''); setData(null)
  }

  const calcular = async () => {
    if (!form.empleado_id) { setError('Seleccione un empleado'); return }
    setCargando(true); setError(''); setData(null)
    try {
      const res = await API.post('/nomina/liquidacion/preview', form)
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al calcular la liquidacion')
    } finally {
      setCargando(false)
    }
  }

    const imprimir = async () => {
    setError('')
    try {
      const res = await API.post('/nomina/liquidacion/pdf', form, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      setError('Error al generar el documento de liquidacion')
    }
  }

  const campo = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Liquidacion Laboral</h2>
      <p className="text-sm text-gray-500 mb-6">
        Calculo de prestaciones y derechos adquiridos segun el Codigo de Trabajo.
        El desahucio genera preaviso y cesantia; la renuncia y el despido justificado solo derechos adquiridos.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className={etiqueta}>Empleado *</label>
            <select name="empleado_id" value={form.empleado_id} onChange={handleChange} className={campo}>
              <option value="">Seleccione...</option>
              {empleados.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre} {e.cedula ? `— ${e.cedula}` : ''} {e.estado !== 'activo' ? '(inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Fecha de salida *</label>
            <input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Causa de terminacion</label>
            <select name="causa" value={form.causa} onChange={handleChange} className={campo}>
              <option value="desahucio">Desahucio (el empleador termina)</option>
              <option value="renuncia">Renuncia del empleado</option>
              <option value="despido_justificado">Despido justificado</option>
            </select>
          </div>
          <div>
            <label className={etiqueta}>Dias de vacaciones ya tomados</label>
            <input type="number" min="0" step="1" name="vacaciones_tomadas"
              value={form.vacaciones_tomadas} onChange={handleChange} className={campo + ' text-right'} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="preaviso_cumplido" checked={form.preaviso_cumplido}
                onChange={handleChange} className="w-4 h-4" />
              El preaviso fue cumplido
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={calcular} disabled={cargando}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {cargando ? 'Calculando...' : 'Calcular Liquidacion'}
          </button>
        </div>
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Empleado</p>
                <p className="font-bold">{data.empleado.nombre}</p>
                <p className="text-gray-600">{data.empleado.cedula || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Tiempo laborado</p>
                <p className="font-bold">{data.tiempo_laborado.texto}</p>
                <p className="text-gray-600">{data.empleado.fecha_ingreso} al {data.fecha_salida}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Salario mensual</p>
                <p className="font-bold">RD$ {fmt(data.empleado.salario_base)}</p>
                <p className="text-gray-600">Diario: RD$ {fmt(data.salario_diario)}</p>
              </div>
                       <div>
                <p className="text-gray-500 text-xs">Causa</p>
                <p className="font-bold capitalize">{String(data.causa).replace('_', ' ')}</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={imprimir}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
                Imprimir Liquidacion
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Concepto</th>
                <th className="px-4 py-3 text-left text-gray-600">Base legal</th>
                <th className="px-4 py-3 text-center text-gray-600">Dias</th>
                <th className="px-4 py-3 text-right text-gray-600">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.conceptos.map((c, i) => (
                <tr key={i} className={`border-t ${!c.aplica ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 font-medium">{c.concepto}</td>
                  <td className="px-4 py-3 text-gray-500">{c.base}</td>
                  <td className="px-4 py-3 text-center">{c.dias}</td>
                  <td className="px-4 py-3 text-right font-bold">RD$ {fmt(c.monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="border-t">
                <td className="px-4 py-2 text-gray-600" colSpan="3">Prestaciones laborales</td>
                <td className="px-4 py-2 text-right font-bold">RD$ {fmt(data.total_prestaciones)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600" colSpan="3">Derechos adquiridos</td>
                <td className="px-4 py-2 text-right font-bold">RD$ {fmt(data.total_derechos_adquiridos)}</td>
              </tr>
              <tr className="border-t-2">
                <td className="px-4 py-4 font-bold text-base" colSpan="3">TOTAL A PAGAR</td>
                <td className="px-4 py-4 text-right font-bold text-xl text-green-700">
                  RD$ {fmt(data.total_general)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="px-4 py-3 border-t bg-blue-50 text-xs text-blue-800">
            {data.nota} Este calculo es referencial; verifique con su asesor laboral antes de firmar el descargo.
          </div>
        </div>
      )}
    </div>
  )
}