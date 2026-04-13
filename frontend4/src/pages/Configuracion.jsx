import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '', rnc: '', email: '', telefono: '', direccion: ''
  })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await API.get('/tenant/profile')
        const t = res.data.data
        setForm({
          nombre: t.nombre || '',
          rnc: t.rnc || '',
          email: t.email || '',
          telefono: t.telefono || '',
          direccion: t.direccion || ''
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTenant()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')
    setError('')
    try {
      await API.put('/tenant/profile', form)
      setMensaje('✅ Configuración guardada correctamente')
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <p className="text-gray-500 p-6">Cargando configuración...</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Configuración de Empresa</h2>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {mensaje && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{mensaje}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RNC</label>
            <input name="rnc" value={form.rnc} onChange={handleChange}
              placeholder="Ej: 101234567"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange}
              placeholder="Ej: 809-555-1234"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={guardando}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}