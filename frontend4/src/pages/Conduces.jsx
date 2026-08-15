import { useState, useEffect, useRef } from 'react'
import API from '../services/api'

export default function Conduces() {
  const [conduces, setConduces] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [idxCliente, setIdxCliente] = useState(-1)
  const [buscarProducto, setBuscarProducto] = useState({})
  const [mostrarDropdownProducto, setMostrarDropdownProducto] = useState({})
  const [productoIndex, setProductoIndex] = useState({})
  const [form, setForm] = useState({ customer_id: '', cliente_nombre: '', chofer_id: '', notas: '' })
  const [items, setItems] = useState([{ product_id: '', descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18 }])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarConfirmarCd, setMostrarConfirmarCd] = useState(false)
  const [mostrarImprimirCd, setMostrarImprimirCd] = useState(false)
  const [conduceGuardadoId, setConduceGuardadoId] = useState(null)
  const [cdFechaInicio, setCdFechaInicio] = useState('')
  const [cdFechaFin, setCdFechaFin] = useState('')
  const [cdFiltroInicio, setCdFiltroInicio] = useState('')
  const [cdFiltroFin, setCdFiltroFin] = useState('')
  const [busquedaConduce, setBusquedaConduce] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarClaveEditar, setMostrarClaveEditar] = useState(false)
  const [claveEditar, setClaveEditar] = useState('')
  const [errorClaveEditar, setErrorClaveEditar] = useState('')
  const [conducePendienteEditar, setConducePendienteEditar] = useState(null)

  const buscarProductoRefs = useRef([])
  const cantidadRefs = useRef([])
  const agregarLineaRef = useRef(null)
  const guardarRef = useRef(null)

  // Descuento global por porcentaje (mismo patron que Nueva Factura)
  const usuarioSesionCd = (() => { try { return JSON.parse(sessionStorage.getItem('usuario')) || {} } catch { return {} } })()
  const esNoAdminCd = usuarioSesionCd?.rol !== 'admin'
  const [descuentoPctCd, setDescuentoPctCd] = useState('')
  const [mostrarAutorizacionCd, setMostrarAutorizacionCd] = useState(false)
  const [claveAutorizacionCd, setClaveAutorizacionCd] = useState('')
  const [errorAutorizacionCd, setErrorAutorizacionCd] = useState('')

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

  const limpiarFormulario = () => {
    setEditandoId(null)
    setItems([{ product_id: '', descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18 }])
    setBuscarProducto({})
    setMostrarDropdownProducto({})
    setProductoIndex({})
    setDescuentoPctCd('')
    setForm({ customer_id: '', cliente_nombre: '', chofer_id: '', notas: '' })
  }

  const agregarItem = () => {
    setItems(prev => [...prev, { product_id: '', descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18 }])
  }

  const eliminarItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
    setBuscarProducto(prev => { const n = { ...prev }; delete n[index]; return n })
  }

  const handleItemChange = (index, e) => {
    const { name, value } = e.target
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [name]: value } : it))
  }

  const itemsValidos = () => items.filter(it => it.product_id && parseFloat(it.cantidad || 0) > 0)

  const guardar = () => {
    setError(''); setMensaje('')
    if (!form.customer_id) { setError('Seleccione un cliente'); return }
    if (itemsValidos().length === 0) { setError('Agregue al menos un articulo'); return }
    setMostrarConfirmarCd(true)
  }

  const handleConfirmarSiCd = async () => {
    setMostrarConfirmarCd(false)
    const pctCd = Math.min(Math.max(parseFloat(descuentoPctCd) || 0, 0), 100)
    if (pctCd > 0 && esNoAdminCd) {
      setClaveAutorizacionCd('')
      setErrorAutorizacionCd('')
      setMostrarAutorizacionCd(true)
      return
    }
    await guardarConduceFinal()
  }

  const handleValidarClaveCd = async () => {
    if (!claveAutorizacionCd.trim()) {
      setErrorAutorizacionCd('Ingrese la clave de autorización')
      return
    }
    try {
      const res = await API.post('/mantenimiento/validar-clave-descuento', { clave: claveAutorizacionCd })
      if (res.data.valido) {
        setMostrarAutorizacionCd(false)
        setClaveAutorizacionCd('')
        setErrorAutorizacionCd('')
        await guardarConduceFinal()
      } else {
        setErrorAutorizacionCd('❌ Clave incorrecta')
      }
    } catch (e) {
      setErrorAutorizacionCd('❌ Error al validar clave')
    }
  }

  const guardarConduceFinal = async () => {
    setMostrarConfirmarCd(false)
    setGuardando(true)
    try {
      const payloadCd = {
        customer_id: form.customer_id,
        chofer_id: form.chofer_id || null,
        notas: form.notas || null,
        descuento_pct: Math.min(Math.max(parseFloat(descuentoPctCd) || 0, 0), 100),
        items: itemsValidos().map(it => ({
          product_id: it.product_id,
          descripcion: it.descripcion,
          cantidad: parseFloat(it.cantidad || 0)
        }))
      }
      const res = editandoId
        ? await API.put(`/conduces/${editandoId}/editar`, payloadCd)
        : await API.post('/conduces', payloadCd)
      setMensaje(editandoId ? 'Conduce actualizado correctamente' : 'Conduce creado correctamente')
      const eraEdicion = !!editandoId
      setShowForm(false)
      limpiarFormulario()
      cargar()
      const id = res.data.data?.id
      if (id && !eraEdicion) {
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

  const solicitarEdicion = (co) => {
    if (esNoAdminCd) {
      setConducePendienteEditar(co)
      setClaveEditar('')
      setErrorClaveEditar('')
      setMostrarClaveEditar(true)
      return
    }
    editarConduce(co)
  }

  const validarClaveEditar = async () => {
    if (!claveEditar.trim()) {
      setErrorClaveEditar('Ingrese la clave de autorización')
      return
    }
    try {
      const res = await API.post('/mantenimiento/validar-clave-descuento', { clave: claveEditar })
      if (res.data.valido) {
        setMostrarClaveEditar(false)
        setClaveEditar('')
        setErrorClaveEditar('')
        const co = conducePendienteEditar
        setConducePendienteEditar(null)
        if (co) editarConduce(co)
      } else {
        setErrorClaveEditar('❌ Clave incorrecta')
      }
    } catch (e) {
      setErrorClaveEditar('❌ Error al validar clave')
    }
  }

  const editarConduce = async (co) => {
    try {
      const res = await API.get(`/conduces/${co.id}`)
      const d = res.data.data
      setEditandoId(co.id)
      setForm({ customer_id: d.customer_id || '', cliente_nombre: d.cliente_nombre || '', chofer_id: d.chofer_id || '', notas: '' })
      const itemsCargados = (d.items || []).map(i => ({
        product_id: i.product_id || '',
        descripcion: i.descripcion || '',
        cantidad: parseFloat(i.cantidad),
        precio_unitario: parseFloat(i.precio_unitario || 0),
        itbis_rate: parseFloat(i.itbis_rate || 0)
      }))
      setItems(itemsCargados.length > 0 ? itemsCargados : [{ product_id: '', descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18 }])
      const busq = {}
      itemsCargados.forEach((it, i) => { busq[i] = it.descripcion })
      setBuscarProducto(busq)
      setMostrarDropdownProducto({})
      setProductoIndex({})
      setDescuentoPctCd('')
      setShowForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      alert('Error al cargar el conduce: ' + (e.response?.data?.mensaje || e.message))
    }
  }

  const verPDF = (id) => {
    const token = sessionStorage.getItem('token')
    window.open(`/conduces/${id}/pdf?token=${token}`, '_blank')
  }

  const clientesFiltrados = busquedaCliente
    ? clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())).slice(0, 8)
    : []

  // Totales calculados desde los items (precio con ITBIS incluido)
  let brutoCd = 0, itbisBrutoCd = 0
  items.forEach(it => {
    const precio = parseFloat(it.precio_unitario || 0)
    const rate = parseFloat(it.itbis_rate || 0)
    const bruto = precio * parseFloat(it.cantidad || 0)
    brutoCd += bruto
    itbisBrutoCd += bruto - (bruto / (1 + rate / 100))
  })
  const pctCd = Math.min(Math.max(parseFloat(descuentoPctCd) || 0, 0), 100)
  const montoDescCd = brutoCd * (pctCd / 100)
  const netoCd = brutoCd - montoDescCd
  const itbisNetoCd = itbisBrutoCd * (1 - pctCd / 100)
  const subNetoCd = netoCd - itbisNetoCd

  return (
    <div className="p-6">
      {mostrarConfirmarCd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea Grabar Este Conduce?</p>
            <div className="flex justify-center gap-6">
              <button autoFocus id="btn-si-grabar-conduce" onClick={handleConfirmarSiCd}
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
      {mostrarAutorizacionCd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-600">⚠️ Autorización Requerida</h3>
              <p className="text-sm text-gray-600 mt-1">Este conduce tiene un descuento aplicado. Se requiere clave de autorización.</p>
            </div>
            {errorAutorizacionCd && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{errorAutorizacionCd}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">🔐 Clave de Autorización</label>
              <input type="password" autoFocus value={claveAutorizacionCd}
                onChange={e => setClaveAutorizacionCd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleValidarClaveCd() } }}
                placeholder="Ingrese la clave del administrador..."
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setMostrarAutorizacionCd(false); setClaveAutorizacionCd(''); setErrorAutorizacionCd('') }}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleValidarClaveCd}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">✓ Validar y Guardar</button>
            </div>
          </div>
        </div>
      )}
      {mostrarClaveEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-600">🔐 Autorización Requerida</h3>
              <p className="text-sm text-gray-600 mt-1">Editar un conduce requiere clave de autorización del administrador.</p>
            </div>
            {errorClaveEditar && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{errorClaveEditar}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Autorización</label>
              <input type="password" autoFocus value={claveEditar}
                onChange={e => setClaveEditar(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); validarClaveEditar() } }}
                placeholder="Ingrese la clave del administrador..."
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setMostrarClaveEditar(false); setClaveEditar(''); setErrorClaveEditar(''); setConducePendienteEditar(null) }}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={validarClaveEditar}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">✓ Validar</button>
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
        <div className="flex gap-3 items-center">
          <input type="text" value={busquedaConduce}
            onChange={e => setBusquedaConduce(e.target.value.toUpperCase())}
            placeholder="BUSCAR CONDUCE..."
            className="border rounded px-3 py-2 text-sm uppercase w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => { if (!showForm) { limpiarFormulario() } setShowForm(!showForm) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">
            + Nuevo Conduce
          </button>
        </div>
      </div>

      {mensaje && <div className="bg-green-100 text-green-800 p-3 rounded mb-4">{mensaje}</div>}
      {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}

      {/* Buscador por fechas */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
          <input type="date" value={cdFechaInicio} onChange={e => setCdFechaInicio(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
          <input type="date" value={cdFechaFin} onChange={e => setCdFechaFin(e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => { setCdFiltroInicio(cdFechaInicio); setCdFiltroFin(cdFechaFin) }}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Buscar
        </button>
        {(cdFiltroInicio || cdFiltroFin) && (
          <button onClick={() => { setCdFechaInicio(''); setCdFechaFin(''); setCdFiltroInicio(''); setCdFiltroFin('') }}
            className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50 text-gray-700">
            Limpiar
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold mb-4">{editandoId ? 'Editar Conduce' : 'Nuevo Conduce'}</h2>

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
                      if (c) { setForm({ ...form, customer_id: c.id, cliente_nombre: c.nombre }); setBusquedaCliente(''); setIdxCliente(-1); setTimeout(() => { const el = buscarProductoRefs.current[0]; if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } }, 100) }
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2" />
                {clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 bg-white border border-gray-300 rounded shadow w-full max-h-48 overflow-auto">
                {clientesFiltrados.map((c, ci) => (
                     <div key={c.id} onClick={() => { setForm({ ...form, customer_id: c.id, cliente_nombre: c.nombre }); setBusquedaCliente(''); setIdxCliente(-1); setTimeout(() => buscarProductoRefs.current[0]?.focus(), 50) }}
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

          {/* Items en linea (mismo patron que Nueva Factura) */}
          <div className="mb-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-3 relative">
                  <input
                    type="text"
                    placeholder="🔍 Buscar Articulos..."
                    ref={el => { buscarProductoRefs.current[index] = el }}
                    value={buscarProducto[index] || ''}
                    onChange={e => {
                      setBuscarProducto(prev => ({ ...prev, [index]: e.target.value }))
                      setMostrarDropdownProducto(prev => ({ ...prev, [index]: e.target.value.length > 0 }))
                    }}
                    onBlur={() => setTimeout(() => { setMostrarDropdownProducto(prev => ({ ...prev, [index]: false })); setProductoIndex(prev => ({ ...prev, [index]: -1 })) }, 200)}
                    onKeyDown={e => {
                      const filtrados = productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase()))
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setProductoIndex(prev => ({ ...prev, [index]: Math.min((prev[index] ?? -1) + 1, filtrados.length - 1) }))
                        setMostrarDropdownProducto(prev => ({ ...prev, [index]: true }))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setProductoIndex(prev => ({ ...prev, [index]: Math.max((prev[index] ?? 0) - 1, -1) }))
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        const idx = productoIndex[index] ?? -1
                        if (idx >= 0 && filtrados[idx]) {
                          const p = filtrados[idx]
                          const padreP = p.articulo_padre_id ? productos.find(x => x.id === p.articulo_padre_id) : null
                          const factorP = parseFloat(p.factor_empaque || 1) || 1
                          const stockP = padreP ? Math.floor(parseFloat(padreP.stock_actual || 0) / factorP) : parseFloat(p.stock_actual || 0)
                          if (stockP <= 0) {
                            alert(`⚠️ "${p.nombre}" no tiene existencia en inventario.\n\nNo se puede agregar al conduce.`)
                            return
                          }
                          if (parseFloat(p.stock_minimo || 0) > 0 && stockP <= parseFloat(p.stock_minimo || 0)) {
                            alert(`⚠️ STOCK BAJO: "${p.nombre}"\n\nQuedan ${stockP} (mínimo ${parseFloat(p.stock_minimo || 0)}).\n\nSe agregará al conduce, pero considere reabastecer.`)
                          }
                          const yaExisteIdx = items.findIndex((it, i) => i !== index && it.product_id === p.id)
                          if (yaExisteIdx !== -1) {
                            setItems(prev => prev
                              .map((it, i) => i === yaExisteIdx ? { ...it, cantidad: parseFloat(it.cantidad || 0) + 1 } : it)
                              .filter((_, i) => i !== index))
                            setBuscarProducto(prev => { const n = { ...prev }; delete n[index]; return n })
                          } else {
                            setItems(prev => prev.map((it, i) => i === index ? { ...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate } : it))
                            setBuscarProducto(prev => ({ ...prev, [index]: p.nombre }))
                            setTimeout(() => { const c = cantidadRefs.current[index]; if (c) { c.focus(); c.select() } }, 80)
                          }
                          setMostrarDropdownProducto(prev => ({ ...prev, [index]: false }))
                        }
                      }
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                  {mostrarDropdownProducto[index] && (
                    <div className="absolute z-20 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                      {productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).slice(0, 50).map(p => (
                        <div key={p.id}
                          className={`px-3 py-2 text-sm cursor-pointer ${productos.filter(x => x.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p) === (productoIndex[index] ?? -1) ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                          onMouseEnter={() => setProductoIndex(prev => ({ ...prev, [index]: productos.filter(x => x.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p) }))}
                          onMouseDown={() => {
                            const padreP2 = p.articulo_padre_id ? productos.find(x => x.id === p.articulo_padre_id) : null
                            const factorP2 = parseFloat(p.factor_empaque || 1) || 1
                            const stockP2 = padreP2 ? Math.floor(parseFloat(padreP2.stock_actual || 0) / factorP2) : parseFloat(p.stock_actual || 0)
                            if (stockP2 <= 0) {
                              alert(`⚠️ "${p.nombre}" no tiene existencia en inventario.\n\nNo se puede agregar al conduce.`)
                              return
                            }
                            if (parseFloat(p.stock_minimo || 0) > 0 && stockP2 <= parseFloat(p.stock_minimo || 0)) {
                              alert(`⚠️ STOCK BAJO: "${p.nombre}"\n\nQuedan ${stockP2} (mínimo ${parseFloat(p.stock_minimo || 0)}).\n\nSe agregará al conduce, pero considere reabastecer.`)
                            }
                            const yaExisteIdx = items.findIndex((it, i) => i !== index && it.product_id === p.id)
                            if (yaExisteIdx !== -1) {
                              setItems(prev => prev
                                .map((it, i) => i === yaExisteIdx ? { ...it, cantidad: parseFloat(it.cantidad || 0) + 1 } : it)
                                .filter((_, i) => i !== index))
                              setBuscarProducto(prev => { const n = { ...prev }; delete n[index]; return n })
                            } else {
                              setItems(prev => prev.map((it, i) => i === index ? { ...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate } : it))
                              setBuscarProducto(prev => ({ ...prev, [index]: p.nombre }))
                              setTimeout(() => { const c = cantidadRefs.current[index]; if (c) { c.focus(); c.select() } }, 80)
                            }
                            setMostrarDropdownProducto(prev => ({ ...prev, [index]: false }))
                          }}>
                          {p.nombre} — RD${parseFloat(p.precio).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  <input name="descripcion" placeholder="Descripción" value={item.descripcion} onChange={(e) => handleItemChange(index, e)}
                    readOnly={!!item.product_id}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${item.product_id ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`} />
                </div>
                <div className="col-span-2">
                  <input name="cantidad" type="number" placeholder="Cant." step="0.01" value={item.cantidad} onChange={(e) => handleItemChange(index, e)}
                    ref={el => cantidadRefs.current[index] = el}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        agregarLineaRef.current?.focus()
                      }
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right" />
                </div>
                <div className="col-span-1">
                  <input name="precio_unitario" type="number" placeholder="Precio" value={item.precio_unitario} onChange={(e) => handleItemChange(index, e)}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right" />
                </div>
                <div className="col-span-2">
                  <input type="text" readOnly
                    value={item.precio_unitario && item.cantidad ? 'RD$' + (parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 }) : ''}
                    placeholder="Subtotal"
                    className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50 text-right font-medium text-gray-700" />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {items.length > 1 && (
                    <button type="button" onClick={() => eliminarItem(index)}
                      className="text-red-500 hover:text-red-700 text-lg">×</button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-4 mt-1">
              <button type="button" ref={agregarLineaRef} onClick={agregarItem}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); guardarRef.current?.focus() }
                  if (e.key === 'Enter') { e.preventDefault(); agregarItem(); setTimeout(() => { const nextIndex = items.length; buscarProductoRefs.current[nextIndex]?.focus() }, 150) }
                }}
                className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
              <button type="button" ref={guardarRef} onClick={guardar} disabled={guardando}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft') { e.preventDefault(); agregarLineaRef.current?.focus() }
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400">
           {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); limpiarFormulario() }}
                className="px-4 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400">
                Cancelar
              </button>
            </div>
          </div>

          {brutoCd > 0 && (
            <div className="flex justify-end mb-4">
              <div className="text-right bg-gray-50 p-4 rounded-lg text-sm">
                <p className="text-gray-600">TOTAL BRUTO: <span className="font-medium">RD${brutoCd.toFixed(2)}</span></p>
                <div className="flex items-center justify-end gap-2 my-1">
                  <label className="text-gray-600">Descuento</label>
                  <input type="number" min="0" max="100" step="any" value={descuentoPctCd}
                    onChange={e => setDescuentoPctCd(e.target.value)}
                    placeholder="0"
                    className="w-16 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <span className="text-gray-600">%</span>
                  <span className="font-medium text-red-600 w-24">-RD${montoDescCd.toFixed(2)}</span>
                </div>
                <p className="text-gray-600">SUB-TOTAL: <span className="font-medium">RD${subNetoCd.toFixed(2)}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${itbisNetoCd.toFixed(2)}</span></p>
                <p className="text-lg font-bold text-gray-800">Total: RD${netoCd.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Notas (oculto) */}
          <div className="mb-4 hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2" rows="2" />
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
              <th className="px-4 py-3 text-left text-gray-600">Total</th>
              <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {conduces.filter(co => {
              if (busquedaConduce) {
                const numCd = (co.numero || '').toUpperCase()
                const cliCd = (co.cliente_nombre || '').toUpperCase()
                if (!numCd.includes(busquedaConduce) && !cliCd.includes(busquedaConduce)) return false
              }
              if (!cdFiltroInicio && !cdFiltroFin) return true
              const d = new Date(co.creado_en)
              const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
              if (cdFiltroInicio && fcd < cdFiltroInicio) return false
              if (cdFiltroFin && fcd > cdFiltroFin) return false
              return true
            }).map(co => (
              <tr key={co.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{co.numero || 'CD-' + String(co.numero_conduce).padStart(4, '0')}</td>
                <td className="px-4 py-3">{co.cliente_nombre || '-'}</td>
                <td className="px-4 py-3">RD${parseFloat(co.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                <td className="px-4 py-3">{new Date(co.creado_en).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${co.estado === 'anulado' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {co.estado.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => verPDF(co.id)} className="text-blue-600 hover:underline text-sm mr-3">PDF</button>
                  {co.estado !== 'anulado' && !co.facturado && (
                    <button onClick={() => solicitarEdicion(co)} className="text-orange-600 hover:underline text-sm mr-3">Editar</button>
                  )}
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