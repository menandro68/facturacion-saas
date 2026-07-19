import { useState, useEffect } from 'react'
import API from '../services/api'

export default function Conduces() {
  const [conduces, setConduces] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [idxCliente, setIdxCliente] = useState(-1)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [idxProducto, setIdxProducto] = useState(-1)
  const [form, setForm] = useState({ customer_id: '', cliente_nombre: '', chofer_id: '', notas: '' })
  const [items, setItems] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarConfirmarCd, setMostrarConfirmarCd] = useState(false)
  const [mostrarImprimirCd, setMostrarImprimirCd] = useState(false)
  const [conduceGuardadoId, setConduceGuardadoId] = useState(null)

  const cargar = async () => {
    try {
      const res = await API.get('/conduces')
      setConduces(res.data.data || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    cargar()
    API.get('/customers').then(r => setClientes(r.data.data || [])).catch(() => {})
    API.get('/products').then(r => setProductos(r.data.data || [])).catch(() => {})
    API.get('/mantenimiento/choferes').then(r => setChoferes(r.data.data || [])).catch(() => {})
  }, [])

  const agregarItem = (p) => {
    const existe = items.find(i => i.product_id === p.id)
    if (existe) {
      setItems(items.map(i => i.product_id === p.id ? { ...i, cantidad: parseFloat(i.cantidad) + 1 } : i))
    } else {
      setItems([...items, { product_id: p.id, descripcion: p.nombre, cantidad: 1 }])
    }
    setBusquedaProducto('')
  }

  const guardar = () => {
    setError(''); setMensaje('')
    if (!form.customer_id) { setError('Seleccione un cliente'); return }
    if (items.length === 0) { setError('Agregue al menos un articulo'); return }
    setMostrarConfirmarCd(true)
  }

  const guardarConduceFinal = async () => {
    setMostrarConfirmarCd(false)
    setGuardando(true)
    try {
      const res = await API.post('/conduces', {
        customer_id: form.customer_id,
        chofer_id: form.chofer_id || null,
        notas: form.notas || null,
        items
      })
      setMensaje('Conduce creado correctamente')
      setShowForm(false)
      setForm({ customer_id: '', cliente_nombre: '', chofer_id: '', notas: '' })
      setItems([])
      cargar()
      const id = res.data.data?.id
      if (id) {
        setConduceGuardadoId(id)
        setMostrarImprimirCd(true)
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al crear conduce')
    } finally {
      setGuardando(false)
    }
  }

  const anular = async (id) => {
    if (!confirm('¿Anular este conduce? El inventario sera devuelto.')) return
    try {
      await API.put(`/conduces/${id}/anular`)
      cargar()
    } catch (e) {
      alert(e.response?.data?.mensaje || 'Error al anular')
    }
  }

  const convertirFactura = async (id) => {
    if (!confirm('¿Convertir este conduce en factura? Se generará un comprobante fiscal (NCF) con ITBIS. El inventario NO se rebajará de nuevo.')) return
    try {
      const res = await API.put(`/conduces/${id}/convertir`)
      alert('✅ Factura generada correctamente. NCF: ' + (res.data.data?.ncf || ''))
      cargar()
    } catch (e) {
      alert(e.response?.data?.mensaje || 'Error al convertir en factura')
    }
  }

  const verPDF = (id) => {
    const token = sessionStorage.getItem('token')
    window.open(`/conduces/${id}/pdf?token=${token}`, '_blank')
  }

  const clientesFiltrados = busquedaCliente
    ? clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())).slice(0, 8)
    : []
  const productosFiltrados = busquedaProducto
    ? productos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).slice(0, 8)
    : []

  return (
    <div className="p-6">
      {mostrarConfirmarCd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea Grabar Este Conduce?</p>
            <div className="flex justify-center gap-6">
              <button autoFocus id="btn-si-grabar-conduce" onClick={guardarConduceFinal}
                onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-volver-conduce')?.focus() } }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
              <button id="btn-volver-conduce" onClick={() => setMostrarConfirmarCd(false)}
                onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-grabar-conduce')?.focus() } }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarImprimirCd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir el conduce?</p>
            <div className="flex justify-center gap-6">
              <button autoFocus id="btn-si-imprimir-conduce"
                onClick={() => { setMostrarImprimirCd(false); const token = sessionStorage.getItem('token'); window.open(`/conduces/${conduceGuardadoId}/pdf?token=${token}`, '_blank') }}
                onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-no-imprimir-conduce')?.focus() } }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
              <button id="btn-no-imprimir-conduce" onClick={() => setMostrarImprimirCd(false)}
                onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-imprimir-conduce')?.focus() } }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Conduces</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Nuevo Conduce
        </button>
      </div>

      {mensaje && <div className="bg-green-100 text-green-800 p-3 rounded mb-4">{mensaje}</div>}
      {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold mb-4">Nuevo Conduce</h2>

          {/* Cliente */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            {form.customer_id ? (
              <>
              <div className="flex items-center gap-2">
                <span className="bg-blue-50 text-blue-800 px-3 py-2 rounded border border-blue-200">{form.cliente_nombre}</span>
                <button onClick={() => setForm({ ...form, customer_id: '', cliente_nombre: '' })}
                  className="text-red-600 text-sm hover:underline">Cambiar</button>
              </div>
              {(() => {
                const cli = clientes.find(c => c.id === form.customer_id)
                if (!cli) return null
                return (
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-700">
                    <p><span className="font-semibold">RNC/Cédula:</span> {cli.rnc_cedula || '-'}</p>
                    <p><span className="font-semibold">Teléfono:</span> {cli.telefono || '-'}</p>
                    <p><span className="font-semibold">Negocio:</span> {cli.negocio || '-'}</p>
                    <p><span className="font-semibold">Tipo:</span> {cli.tipo_comprobante || '-'}</p>
                    <p><span className="font-semibold">Condiciones:</span> {cli.condiciones_pago ? cli.condiciones_pago + ' dias' : '-'}</p>
                    <p><span className="font-semibold">Dirección:</span> {cli.direccion || '-'}</p>
                    <p><span className="font-semibold">Vendedor:</span> {cli.vendedor_nombre || '-'}</p>
                    <p><span className="font-semibold">Zona:</span> {cli.zona_nombre || '-'}</p>
                  </div>
                )
              })()}
              </>
            ) : (
              <>
              <input autoFocus value={busquedaCliente} onChange={e => { setBusquedaCliente(e.target.value); setIdxCliente(-1) }}
                  placeholder="Buscar cliente..."
                  onKeyDown={e => {
                    if (clientesFiltrados.length === 0) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setIdxCliente(prev => (prev + 1) % clientesFiltrados.length)
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setIdxCliente(prev => (prev <= 0 ? clientesFiltrados.length - 1 : prev - 1))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                    const c = clientesFiltrados[idxCliente >= 0 ? idxCliente : 0]
                      if (c) { setForm({ ...form, customer_id: c.id, cliente_nombre: c.nombre }); setBusquedaCliente(''); setIdxCliente(-1); setTimeout(() => document.getElementById('conduce-buscar-articulo')?.focus(), 50) }
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2" />
                {clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 bg-white border border-gray-300 rounded shadow w-full max-h-48 overflow-auto">
                {clientesFiltrados.map((c, ci) => (
                     <div key={c.id} onClick={() => { setForm({ ...form, customer_id: c.id, cliente_nombre: c.nombre }); setBusquedaCliente(''); setIdxCliente(-1); setTimeout(() => document.getElementById('conduce-buscar-articulo')?.focus(), 50) }}
                        className={`px-3 py-2 hover:bg-blue-50 cursor-pointer ${ci === idxCliente ? 'bg-blue-100' : ''}`}>
                        {c.nombre} <span className="text-gray-400 text-xs">{c.direccion || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

      {/* Chofer (oculto) */}
          <div className="mb-4 hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chofer (opcional)</label>
            <select value={form.chofer_id} onChange={e => setForm({ ...form, chofer_id: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">-- Sin chofer --</option>
              {choferes.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.nombre} {ch.placa ? `(${ch.placa})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Articulos */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Agregar Articulos *</label>
          <input id="conduce-buscar-articulo" value={busquedaProducto} onChange={e => { setBusquedaProducto(e.target.value); setIdxProducto(-1) }}
              placeholder="Buscar articulo..."
              onKeyDown={e => {
                if (productosFiltrados.length === 0) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setIdxProducto(prev => (prev + 1) % productosFiltrados.length)
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setIdxProducto(prev => (prev <= 0 ? productosFiltrados.length - 1 : prev - 1))
         } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const p = productosFiltrados[idxProducto >= 0 ? idxProducto : 0]
                  if (p) { agregarItem(p); setIdxProducto(-1); setTimeout(() => { const inputs = document.querySelectorAll('.conduce-cantidad-input'); const idxExistente = items.findIndex(i => i.product_id === p.id); const target = idxExistente >= 0 ? inputs[idxExistente] : inputs[inputs.length - 1]; if (target) { target.focus(); target.select() } }, 80) }
                }
              }}
              className="w-full border border-gray-300 rounded px-3 py-2" />
            {productosFiltrados.length > 0 && (
              <div className="absolute z-10 bg-white border border-gray-300 rounded shadow w-full max-h-48 overflow-auto">
              {productosFiltrados.map((p, pi) => (
                  <div key={p.id} onClick={() => { agregarItem(p); setIdxProducto(-1) }}
                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer ${pi === idxProducto ? 'bg-blue-100' : ''}`}>{p.nombre}</div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <table className="w-full mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm">Descripcion</th>
                  <th className="px-3 py-2 text-right text-sm w-32">Cantidad</th>
                  <th className="px-3 py-2 text-right text-sm w-32">Precio</th>
                  <th className="px-3 py-2 text-right text-sm w-36">Importe</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prodIt = productos.find(pp => pp.id === it.product_id)
                  const precioIt = parseFloat(prodIt?.precio || 0)
                  const importeIt = precioIt * parseFloat(it.cantidad || 0)
                  return (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{it.descripcion}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min="0.01" step="any" value={it.cantidad}
                        onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, cantidad: e.target.value } : x))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('conduce-buscar-articulo')?.focus() } }}
                        className="conduce-cantidad-input w-24 border border-gray-300 rounded px-2 py-1 text-right" />
                    </td>
                    <td className="px-3 py-2 text-right">RD${precioIt.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-right font-medium">RD${importeIt.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:underline text-sm">Quitar</button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {items.length > 0 && (
            <div className="flex justify-end mb-4">
              <div className="text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-lg font-bold text-gray-800">Total: RD${items.reduce((s, it) => { const pp = productos.find(x => x.id === it.product_id); return s + parseFloat(pp?.precio || 0) * parseFloat(it.cantidad || 0) }, 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}

      {/* Notas (oculto) */}
          <div className="mb-4 hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2" rows="2" />
          </div>

          <div className="flex gap-3">
            <button onClick={guardar} disabled={guardando}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar Conduce'}
            </button>
            <button onClick={() => { setShowForm(false); setItems([]); setForm({ customer_id: '', cliente_nombre: '', chofer_id: '', notas: '' }) }}
              className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Numero</th>
              <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-left text-gray-600">Chofer</th>
              <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {conduces.map(co => (
              <tr key={co.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{co.numero || 'CD-' + String(co.numero_conduce).padStart(4, '0')}</td>
                <td className="px-4 py-3">{co.cliente_nombre || '-'}</td>
                <td className="px-4 py-3">{co.chofer_nombre || '-'}</td>
                <td className="px-4 py-3">{new Date(co.creado_en).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${co.estado === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {co.estado.toUpperCase()}
                  </span>
                </td>
             <td className="px-4 py-3">
                  <button onClick={() => verPDF(co.id)} className="text-blue-600 hover:underline text-sm mr-3">PDF</button>
                  {co.estado !== 'anulado' && !co.facturado && (
                    <button onClick={() => convertirFactura(co.id)} className="text-green-600 hover:underline text-sm mr-3">Convertir en Factura</button>
                  )}
                  {co.facturado && (
                    <span className="text-gray-400 text-sm mr-3">Facturado</span>
                  )}
                  {co.estado !== 'anulado' && (
                    <button onClick={() => anular(co.id)} className="text-red-600 hover:underline text-sm">Anular</button>
                  )}
                </td>
              </tr>
            ))}
            {conduces.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay conduces registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}