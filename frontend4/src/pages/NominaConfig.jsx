import { useState, useEffect } from 'react'
import API from '../services/api'

const CONFIG_VACIA = {
  vigente_desde: new Date().toISOString().slice(0, 10),
  afp_empleado_pct: '',
  afp_empleador_pct: '',
  sfs_empleado_pct: '',
  sfs_empleador_pct: '',
  srl_empleador_pct: '',
  infotep_empleador_pct: '',
  salario_minimo_cotizable: '',
  tope_afp_salarios: '',
  tope_sfs_salarios: '',
  notas: ''
}

export default function NominaConfig() {
  const [form, setForm] = useState(CONFIG_VACIA)
  const [escala, setEscala] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const cargar = async () => {
    try {
      const [cfg, hist] = await Promise.all([
        API.get('/nomina/config'),
        API.get('/nomina/config/historial')
      ])
      const c = cfg.data.data
      if (c) {
        setForm({
          vigente_desde: c.vigente_desde ? String(c.vigente_desde).slice(0, 10) : CONFIG_VACIA.vigente_desde,
          afp_empleado_pct: c.afp_empleado_pct ?? '',
          afp_empleador_pct: c.afp_empleador_pct ?? '',
          sfs_empleado_pct: c.sfs_empleado_pct ?? '',
          sfs_empleador_pct: c.sfs_empleador_pct ?? '',
          srl_empleador_pct: c.srl_empleador_pct ?? '',
          infotep_empleador_pct: c.infotep_empleador_pct ?? '',
          salario_minimo_cotizable: c.salario_minimo_cotizable ?? '',
          tope_afp_salarios: c.tope_afp_salarios ?? '',
          tope_sfs_salarios: c.tope_sfs_salarios ?? '',
          notas: c.notas ?? ''
        })
        const esc = Array.isArray(c.escala_isr) ? c.escala_isr : []
        setEscala(esc.map(t => ({
          desde: t.desde ?? '',
          hasta: t.hasta ?? '',
          tasa: t.tasa ?? '',
          cuota_fija: t.cuota_fija ?? ''
        })))
      }
      setHistorial(hist.data.data || [])
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

  const cambiarTramo = (i, campo, valor) => {
    const copia = [...escala]
    copia[i] = { ...copia[i], [campo]: valor }
    setEscala(copia)
    setError(''); setOk('')
  }

  const agregarTramo = () => {
    setEscala([...escala, { desde: '', hasta: '', tasa: '', cuota_fija: '' }])
  }

  const quitarTramo = (i) => {
    setEscala(escala.filter((_, idx) => idx !== i))
  }

  const guardar = async () => {
    if (!form.vigente_desde) { setError('La fecha de vigencia es obligatoria'); return }
    for (const t of escala) {
      if (t.desde === '' || t.tasa === '') {
        setError('Cada tramo de ISR necesita al menos "Desde" y "Tasa"')
        return
      }
    }
    setGuardando(true)
    try {
      const payload = {
        ...form,
        escala_isr: escala.map(t => ({
          desde: parseFloat(t.desde) || 0,
          hasta: t.hasta === '' ? null : parseFloat(t.hasta),
          tasa: parseFloat(t.tasa) || 0,
          cuota_fija: parseFloat(t.cuota_fija) || 0
        }))
      }
      await API.post('/nomina/config', payload)
      setOk('Configuracion guardada correctamente')
      await cargar()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const campo = "border rounded px-3 py-2 text-sm w-full text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
  const campoIzq = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  const etiqueta = "block text-sm font-medium text-gray-700 mb-1"

  if (loading) return <div className="p-6 text-gray-500">Cargando configuracion...</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Configuracion de Nomina</h2>
      <p className="text-sm text-gray-500 mb-6">
        Las tasas se guardan con fecha de vigencia. Las nominas ya procesadas conservan las tasas con que se calcularon.
      </p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
      {ok && <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{ok}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={etiqueta}>Vigente desde *</label>
            <input type="date" name="vigente_desde" value={form.vigente_desde} onChange={handleChange} className={campoIzq} />
          </div>
          <div>
            <label className={etiqueta}>Salario minimo cotizable</label>
            <input type="number" step="0.01" min="0" name="salario_minimo_cotizable"
              value={form.salario_minimo_cotizable} onChange={handleChange} className={campo} />
          </div>
          <div></div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Deducciones del empleado (%)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={etiqueta}>AFP empleado</label>
            <input type="number" step="0.001" min="0" max="100" name="afp_empleado_pct"
              value={form.afp_empleado_pct} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>SFS empleado</label>
            <input type="number" step="0.001" min="0" max="100" name="sfs_empleado_pct"
              value={form.sfs_empleado_pct} onChange={handleChange} className={campo} />
          </div>
          <div></div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Aportes del empleador (%)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className={etiqueta}>AFP empleador</label>
            <input type="number" step="0.001" min="0" max="100" name="afp_empleador_pct"
              value={form.afp_empleador_pct} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>SFS empleador</label>
            <input type="number" step="0.001" min="0" max="100" name="sfs_empleador_pct"
              value={form.sfs_empleador_pct} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Riesgos laborales (SRL)</label>
            <input type="number" step="0.001" min="0" max="100" name="srl_empleador_pct"
              value={form.srl_empleador_pct} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>INFOTEP</label>
            <input type="number" step="0.001" min="0" max="100" name="infotep_empleador_pct"
              value={form.infotep_empleador_pct} onChange={handleChange} className={campo} />
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Topes cotizables (en salarios minimos)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={etiqueta}>Tope AFP</label>
            <input type="number" step="1" min="0" name="tope_afp_salarios"
              value={form.tope_afp_salarios} onChange={handleChange} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Tope SFS</label>
            <input type="number" step="1" min="0" name="tope_sfs_salarios"
              value={form.tope_sfs_salarios} onChange={handleChange} className={campo} />
          </div>
          <div></div>
        </div>

        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h3 className="text-sm font-bold text-gray-700">Escala de ISR (anual)</h3>
          <button type="button" onClick={agregarTramo}
            className="bg-gray-100 border px-3 py-1 rounded text-xs hover:bg-gray-200">
            + Agregar tramo
          </button>
        </div>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-gray-600">Desde (RD$)</th>
                <th className="px-3 py-2 text-right text-gray-600">Hasta (RD$)</th>
                <th className="px-3 py-2 text-right text-gray-600">Tasa (%)</th>
                <th className="px-3 py-2 text-right text-gray-600">Cuota fija (RD$)</th>
                <th className="px-3 py-2 text-center text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {escala.length === 0 ? (
                <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400">
                  Sin tramos. Agregue los tramos de la escala anual vigente.
                </td></tr>
              ) : escala.map((t, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" value={t.desde}
                      onChange={(e) => cambiarTramo(i, 'desde', e.target.value)} className={campo} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" value={t.hasta}
                      placeholder="En adelante"
                      onChange={(e) => cambiarTramo(i, 'hasta', e.target.value)} className={campo} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" value={t.tasa}
                      onChange={(e) => cambiarTramo(i, 'tasa', e.target.value)} className={campo} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="0.01" value={t.cuota_fija}
                      onChange={(e) => cambiarTramo(i, 'cuota_fija', e.target.value)} className={campo} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => quitarTramo(i)}
                      className="text-red-600 hover:underline text-sm">Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <label className={etiqueta}>Notas</label>
          <input name="notas" value={form.notas} onChange={handleChange} className={campoIzq}
            placeholder="Referencia de la resolucion o fuente de las tasas" autoComplete="off" />
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={guardar} disabled={guardando}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-700 px-4 pt-4 pb-2">Historial de vigencias</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Vigente desde</th>
              <th className="px-4 py-3 text-right text-gray-600">AFP emp.</th>
              <th className="px-4 py-3 text-right text-gray-600">SFS emp.</th>
              <th className="px-4 py-3 text-right text-gray-600">AFP patr.</th>
              <th className="px-4 py-3 text-right text-gray-600">SFS patr.</th>
              <th className="px-4 py-3 text-right text-gray-600">SRL</th>
              <th className="px-4 py-3 text-right text-gray-600">INFOTEP</th>
              <th className="px-4 py-3 text-right text-gray-600">Sal. min. cot.</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Sin configuraciones guardadas</td></tr>
            ) : historial.map(h => (
              <tr key={h.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{String(h.vigente_desde).slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">{h.afp_empleado_pct}%</td>
                <td className="px-4 py-3 text-right">{h.sfs_empleado_pct}%</td>
                <td className="px-4 py-3 text-right">{h.afp_empleador_pct}%</td>
                <td className="px-4 py-3 text-right">{h.sfs_empleador_pct}%</td>
                <td className="px-4 py-3 text-right">{h.srl_empleador_pct}%</td>
                <td className="px-4 py-3 text-right">{h.infotep_empleador_pct}%</td>
                <td className="px-4 py-3 text-right">RD$ {fmt(h.salario_minimo_cotizable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}