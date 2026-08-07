import { useState, useEffect } from 'react'
import API from '../services/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function OrdenCompra({ onInventarioUpdate }) {
  // Feature Flag por tenant: responsive (solo empresas con features.responsive = true)
  const usuarioSesionOC = (() => { try { return JSON.parse(sessionStorage.getItem('usuario')) || {} } catch { return {} } })()
  const esResponsiveOC = usuarioSesionOC?.features?.responsive === true
  const [posLineaAbiertaOC, setPosLineaAbiertaOC] = useState(true)
  const [ordenes, setOrdenes] = useState([])
  const [busquedaOC, setBusquedaOC] = useState('')
  const [ocDesde, setOcDesde] = useState('')
  const [ocHasta, setOcHasta] = useState('')
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ supplier_id: '', fecha_entrega: '', fecha_vencimiento_pago: '', notas: '' })
  const [items, setItems] = useState([{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])

  const fetchData = async () => {
    try {
      const [ord, prov, prod] = await Promise.all([
        API.get('/purchase-orders'),
        API.get('/suppliers'),
        API.get('/products')
      ])
      setOrdenes(ord.data.data)
      setProveedores(prov.data.data)
      setProductos(prod.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchData() }, [])

const handleItemChange = async (idx, field, value) => {
    const updated = items.map((item, i) => i === idx ? {...item, [field]: value} : item)
    if (field === 'product_id' && value) {
      const prod = productos.find(p => p.id === value)
      if (prod) {
        updated[idx] = {
          ...updated[idx],
          product_id: value,
          descripcion: prod.nombre,
          precio_unitario: prod.costo || prod.precio || ''
        }
        setItems([...updated])
        try {
          const res = await API.get(`/purchase-orders/ultimo-precio/${value}`)
          if (res.data.data) {
            const u = updated.map((item, i) => i === idx ? {...item, product_id: value, precio_unitario: res.data.data.precio} : item)
            setItems(u)
          }
        } catch (err) {
          console.error(err)
        }
        return
      }
    }
    setItems(updated)
  }

  const agregarItem = () => {
    setItems([...items, { product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
  }

  const eliminarItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const totalOrden = items.reduce((sum, i) => sum + ((parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_unitario) || 0)), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (items.length === 0 || !items[0].descripcion) {
      setError('Agrega al menos un producto')
      return
    }
    const itemsValidos = items.filter(i => i.descripcion && i.cantidad && i.precio_unitario)
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un producto con descripción, cantidad y precio')
      return
    }
    try {
      await API.post('/purchase-orders', { ...form, items: itemsValidos })
      setShowForm(false)
      setForm({ supplier_id: '', fecha_entrega: '', fecha_vencimiento_pago: '', notas: '' })
      setItems([{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
      setPosLineaAbiertaOC(true)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const [modalRecibir, setModalRecibir] = useState(null)
  const [recibirForm, setRecibirForm] = useState({ factura_proveedor: '', ncf_proveedor: '' })

  const handleConfirmarRecibir = async () => {
    try {
      await API.put(`/purchase-orders/${modalRecibir}/estado`, {
        estado: 'recibida',
        factura_proveedor: recibirForm.factura_proveedor,
        ncf_proveedor: recibirForm.ncf_proveedor
      })
      setModalRecibir(null)
      setRecibirForm({ factura_proveedor: '', ncf_proveedor: '' })
      fetchData()
      if (onInventarioUpdate) {
        onInventarioUpdate()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleEstado = async (id, estado) => {
    try {
      await API.put(`/purchase-orders/${id}/estado`, { estado })
      fetchData()
      if (estado === 'recibida' && onInventarioUpdate) {
        onInventarioUpdate()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta orden?')) return
    try {
      await API.delete(`/purchase-orders/${id}`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const [verOrden, setVerOrden] = useState(null)
  const [editarOrden, setEditarOrden] = useState(null)
  const [formEditar, setFormEditar] = useState({ supplier_id: '', fecha_entrega: '', fecha_vencimiento_pago: '', notas: '' })
  const [itemsEditar, setItemsEditar] = useState([])

  const handleEditar = async (id) => {
    try {
      const res = await API.get(`/purchase-orders/${id}`)
      setEditarOrden(res.data.data)
      setFormEditar({
        supplier_id: res.data.data.supplier_id || '',
        fecha_entrega: res.data.data.fecha_entrega ? res.data.data.fecha_entrega.substring(0, 10) : '',
        fecha_vencimiento_pago: res.data.data.fecha_vencimiento_pago ? res.data.data.fecha_vencimiento_pago.substring(0, 10) : '',
        notas: res.data.data.notas || ''
      })
      setItemsEditar(res.data.data.items?.map(i => ({
        product_id: i.product_id || '',
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario
      })) || [{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
    } catch (err) {
      console.error(err)
    }
  }

  const handleGuardarEdicion = async () => {
    const itemsValidos = itemsEditar.filter(i => i.descripcion && i.cantidad && i.precio_unitario)
    if (itemsValidos.length === 0) return
    try {
      await API.put(`/purchase-orders/${editarOrden.id}/editar`, { ...formEditar, items: itemsValidos })
      setEditarOrden(null)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleVer = async (id) => {
    try {
      const res = await API.get(`/purchase-orders/${id}`)
      setVerOrden(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const estadoColor = (e) => {
    if (e === 'recibida') return 'bg-green-100 text-green-700'
    if (e === 'cancelada') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div>
 <div className={esResponsiveOC ? "flex flex-col gap-3 mb-4 sm:flex-row sm:justify-between sm:items-center" : "flex justify-between items-center mb-4"}>
        <h3 className="text-lg font-semibold text-gray-800">Órdenes de Compra</h3>
   <div className={esResponsiveOC ? "flex flex-wrap items-center gap-2 w-full sm:w-auto" : "flex items-center gap-3"}>
        <input type="date" value={ocDesde} onChange={e => setOcDesde(e.target.value)}
            className={"border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" + (esResponsiveOC ? " flex-1 min-w-[140px]" : "")} />
          <input type="date" value={ocHasta} onChange={e => setOcHasta(e.target.value)}
            className={"border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" + (esResponsiveOC ? " flex-1 min-w-[140px]" : "")} />
          <button onClick={() => {
            const filtradas = ordenes.filter(o => (!busquedaOC || (o.numero || '').toUpperCase().includes(busquedaOC.toUpperCase())) && (!ocDesde || new Date(o.fecha_orden || o.creado_en) >= new Date(ocDesde + 'T00:00:00')) && (!ocHasta || new Date(o.fecha_orden || o.creado_en) <= new Date(ocHasta + 'T23:59:59')))
            if (filtradas.length === 0) { alert('No hay órdenes de compra en el rango seleccionado'); return }
            const doc = new jsPDF()
            const empresa = sessionStorage.getItem('tenant_name') || 'MI EMPRESA'
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text(empresa.toUpperCase(), 105, 18, { align: 'center' })
            doc.setFontSize(13)
            doc.text('REPORTE DE ÓRDENES DE COMPRA', 105, 27, { align: 'center' })
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            const rango = (ocDesde || ocHasta)
              ? `Rango: ${ocDesde ? new Date(ocDesde + 'T00:00:00').toLocaleDateString('es-DO') : 'Inicio'} — ${ocHasta ? new Date(ocHasta + 'T00:00:00').toLocaleDateString('es-DO') : 'Hoy'}`
              : 'Rango: Todas las órdenes'
            doc.text(rango, 105, 34, { align: 'center' })
            const totalGeneral = filtradas.reduce((acc, o) => acc + parseFloat(o.total || 0), 0)
            autoTable(doc, {
              startY: 42,
              head: [['Número', 'Proveedor', 'Fecha', 'Entrega', 'Estado', 'Total']],
              body: filtradas.map(o => [
                o.numero || '-',
                o.proveedor_nombre || '-',
                new Date(o.fecha_orden || o.creado_en).toLocaleDateString('es-DO'),
                o.fecha_entrega ? new Date(o.fecha_entrega.substring(0, 10) + 'T00:00:00').toLocaleDateString('es-DO') : '-',
                (o.estado || '').toUpperCase(),
                `RD$${parseFloat(o.total || 0).toLocaleString('es-DO', {minimumFractionDigits:2})}`
              ]),
              theme: 'grid',
              headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 9, cellPadding: 3 }
            })
            const finalY = doc.lastAutoTable.finalY + 8
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.text(`Órdenes: ${filtradas.length}`, 14, finalY)
            doc.setFontSize(12)
            doc.text(`TOTAL COMPRAS: RD$${totalGeneral.toLocaleString('es-DO', {minimumFractionDigits:2})}`, 196, finalY, { align: 'right' })
           doc.autoPrint()
            const blobUrl = doc.output('bloburl')
            const win = window.open(blobUrl)
            if (!win) alert('Por favor permite las ventanas emergentes para imprimir')
          }}
    className={"px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 whitespace-nowrap" + (esResponsiveOC ? " flex-1 min-w-[120px]" : "")}>
            🖨 Imprimir
          </button>
          <input
            type="text"
            placeholder="🔍 Buscar No. de orden..."
            value={busquedaOC}
            onChange={e => setBusquedaOC(e.target.value)}
            className={"border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" + (esResponsiveOC ? " w-full sm:w-56" : " w-56")}
          />
          <button onClick={() => setShowForm(!showForm)}
            className={"bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm" + (esResponsiveOC ? " w-full sm:w-auto" : "")}>
            + Nueva Orden
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h4 className="text-md font-semibold mb-4">Nueva Orden de Compra</h4>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <div className="relative">
                <input
                  id="oc-proveedor-input"
                  type="text"
                  placeholder="🔍 Buscar proveedor..."
                  autoComplete="off"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => {
                    setForm({...form, supplier_id: ''})
                    const val = e.target.value.toLowerCase()
                    const list = document.getElementById('oc-proveedor-list')
                    list.innerHTML = ''
                    if (val) {
                      const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                      filtrados.forEach(p => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = p.nombre
                        div.onmousedown = () => {
                          document.getElementById('oc-proveedor-input').value = p.nombre
                          setForm(f => ({...f, supplier_id: p.id}))
                          list.innerHTML = ''
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
                  onKeyDown={e => {
                    const ocList = document.getElementById('oc-proveedor-list')
                    if (ocList.querySelectorAll('div').length === 0 && e.key === 'Enter') { e.preventDefault(); document.getElementById('oc-fecha-entrega')?.focus(); return }
                    const list = document.getElementById('oc-proveedor-list')
                    const opciones = list.querySelectorAll('div')
                    if (opciones.length === 0) return
                    let idx = Array.from(opciones).findIndex(o => o.classList.contains('bg-blue-100'))
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                      idx = (idx + 1) % opciones.length
                      opciones[idx].classList.add('bg-blue-100')
                      opciones[idx].scrollIntoView({ block: 'nearest' })
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                      idx = idx <= 0 ? opciones.length - 1 : idx - 1
                      opciones[idx].classList.add('bg-blue-100')
                      opciones[idx].scrollIntoView({ block: 'nearest' })
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (idx >= 0) opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                    }
                  }}
                  onBlur={() => setTimeout(() => { document.getElementById('oc-proveedor-list').innerHTML = '' }, 200)}
                />
                <div id="oc-proveedor-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Entrega</label>
              <input type="date" id="oc-fecha-entrega" value={form.fecha_entrega} onChange={e => setForm({...form, fecha_entrega: e.target.value})}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('oc-fecha-vencimiento')?.focus() } }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento Pago</label>
              <input type="date" id="oc-fecha-vencimiento" value={form.fecha_vencimiento_pago} onChange={e => setForm({...form, fecha_vencimiento_pago: e.target.value})}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('oc-notas')?.focus() } }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input id="oc-notas" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('oc-prod-input-0')?.focus() } }}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Ticket POS en vivo — solo tenants con feature responsive (casa reyes) */}
          {esResponsiveOC && (
            <div className="pos-ticket">
              <div className="pos-ticket-empresa">{usuarioSesionOC.empresa || ''}</div>
              <div className="pos-ticket-cliente">
                Proveedor: {(proveedores.find(p => String(p.id) === String(form.supplier_id))?.nombre) || '-'}
              </div>
              <div className="pos-ticket-divider"></div>
              <div className="pos-ticket-cols"><span>DESCRIPCION</span><span>VALOR</span></div>
              <div className="pos-ticket-divider"></div>
              {items.map((it, i) => (
                (it.descripcion || it.precio_unitario) ? (
                  <div key={i} className="pos-ticket-linea">
                    <div className="pos-ticket-fila">
                      <div className="pos-ticket-desc">{it.descripcion}</div>
                      <button type="button" className="pos-ticket-eliminar"
                        onClick={() => {
                          if (!confirm('¿Eliminar "' + it.descripcion + '" del ticket?')) return
                          if (items.length > 1) {
                            eliminarItem(i)
                          } else {
                            setItems([{ product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])
                            setPosLineaAbiertaOC(true)
                          }
                        }}>✕</button>
                    </div>
                    <div className="pos-ticket-detalle">
                      <span>
                        <input type="number" min="0.01" step="any" value={it.cantidad}
                          onChange={e => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: e.target.value } : x))}
                          className="pos-ticket-cantidad" />
                        {' x '}{parseFloat(it.precio_unitario || 0).toFixed(2)}
                      </span>
                      <span>{(parseFloat(it.cantidad || 0) * parseFloat(it.precio_unitario || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : null
              ))}
              {items.filter(it => it.descripcion || it.precio_unitario).length === 0 && (
                <div className="pos-ticket-vacio">Agregue productos abajo</div>
              )}
              <div className="pos-ticket-divider"></div>
              <div className="pos-ticket-total"><span>TOTAL ORDEN</span><span>RD${totalOrden.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
            </div>
          )}

          <h5 className="font-medium text-gray-700 mb-2">Productos</h5>
          <div className={esResponsiveOC && !posLineaAbiertaOC ? "space-y-2 mb-4 pos-entrada-cerrada" : "space-y-2 mb-4"}>
      {items.map((item, idx) => (
              <div key={idx} className={`grid grid-cols-12 gap-2 items-center ${esResponsiveOC && idx !== items.length - 1 ? 'pos-item-anterior' : ''}`}>
        <div className="col-span-3 relative">
                  <input
                    id={`oc-prod-input-${idx}`}
                    type="text"
                    placeholder="🔍 Buscar..."
                    autoComplete="off"
                    defaultValue={item.descripcion || ''}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={e => {
                      const val = e.target.value.toLowerCase()
                      const list = document.getElementById(`oc-prod-list-${idx}`)
                      list.innerHTML = ''
                      if (val) {
                        const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                        filtrados.forEach(p => {
                          const div = document.createElement('div')
                          div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                          div.textContent = p.nombre
                          div.onmousedown = () => {
                            document.getElementById(`oc-prod-input-${idx}`).value = p.nombre
                            handleItemChange(idx, 'product_id', p.id)
                            list.innerHTML = ''
                          }
                          list.appendChild(div)
                        })
                      }
                    }}
                    onKeyDown={e => {
                      const list = document.getElementById(`oc-prod-list-${idx}`)
                      const opciones = list.querySelectorAll('div')
                      if (opciones.length === 0) {
                        if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`oc-prod-desc-${idx}`)?.focus() }
                        return
                      }
                      let i = Array.from(opciones).findIndex(o => o.classList.contains('bg-blue-100'))
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        if (i >= 0) opciones[i].classList.remove('bg-blue-100')
                        i = (i + 1) % opciones.length
                        opciones[i].classList.add('bg-blue-100')
                        opciones[i].scrollIntoView({ block: 'nearest' })
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (i >= 0) opciones[i].classList.remove('bg-blue-100')
                        i = i <= 0 ? opciones.length - 1 : i - 1
                        opciones[i].classList.add('bg-blue-100')
                        opciones[i].scrollIntoView({ block: 'nearest' })
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (i >= 0) opciones[i].dispatchEvent(new MouseEvent('mousedown'))
                      }
                    }}
                    onBlur={() => setTimeout(() => { document.getElementById(`oc-prod-list-${idx}`).innerHTML = '' }, 200)}
                  />
                  <div id={`oc-prod-list-${idx}`} className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
                </div>
               <div className="col-span-4">
                  <input id={`oc-prod-desc-${idx}`} value={item.descripcion} onChange={e => handleItemChange(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`oc-prod-cant-${idx}`)?.focus() } }}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              <div className="col-span-2">
                  <input type="number" id={`oc-prod-cant-${idx}`} value={item.cantidad} onChange={e => handleItemChange(idx, 'cantidad', e.target.value)}
                    placeholder="Cant."
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`oc-prod-precio-${idx}`)?.focus() } }}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" id={`oc-prod-precio-${idx}`} value={item.precio_unitario} onChange={e => handleItemChange(idx, 'precio_unitario', e.target.value)}
                    placeholder="Precio"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('oc-guardar-orden')?.focus() } }}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => eliminarItem(idx)} className="text-red-500 hover:text-red-700 text-lg">×</button>
                </div>
              </div>
            ))}
      
          </div>

          {esResponsiveOC && (
            <button type="button" className="pos-btn-agregar"
              onClick={() => {
                const nuevoIdx = items.length
                agregarItem()
                setPosLineaAbiertaOC(true)
                setTimeout(() => document.getElementById(`oc-prod-input-${nuevoIdx}`)?.focus(), 100)
              }}>
              + Agregar línea
            </button>
          )}

          <div className="flex justify-between items-center mb-4">
            <button onClick={agregarItem} className={"text-blue-600 hover:underline text-sm" + (esResponsiveOC ? " oc-agregar-original" : "")}>+ Agregar línea</button>
            <p className="font-semibold text-gray-800">Total: RD${totalOrden.toLocaleString('es-DO', {minimumFractionDigits: 2})}</p>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
            <button id="oc-guardar-orden" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar Orden</button>
          </div>
        </div>
      )}

    <div className={"bg-white rounded-lg shadow " + (esResponsiveOC ? "overflow-x-auto" : "overflow-hidden")}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Número</th>
              <th className="px-4 py-3 text-left text-gray-600">Proveedor</th>
              <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left text-gray-600">Entrega</th>
              <th className="px-4 py-3 text-left text-gray-600">Total</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.filter(o => (!busquedaOC || (o.numero || '').toUpperCase().includes(busquedaOC.toUpperCase())) && (!ocDesde || new Date(o.fecha_orden || o.creado_en) >= new Date(ocDesde + 'T00:00:00')) && (!ocHasta || new Date(o.fecha_orden || o.creado_en) <= new Date(ocHasta + 'T23:59:59'))).length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay órdenes de compra</td></tr>
            ) : ordenes.filter(o => (!busquedaOC || (o.numero || '').toUpperCase().includes(busquedaOC.toUpperCase())) && (!ocDesde || new Date(o.fecha_orden || o.creado_en) >= new Date(ocDesde + 'T00:00:00')) && (!ocHasta || new Date(o.fecha_orden || o.creado_en) <= new Date(ocHasta + 'T23:59:59'))).map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{o.numero}</td>
                <td className="px-4 py-3">{o.proveedor_nombre || '-'}</td>
                <td className="px-4 py-3">{new Date(o.creado_en).toLocaleDateString()}</td>
               <td className="px-4 py-3">{o.fecha_entrega ? new Date(o.fecha_entrega.substring(0, 10) + 'T00:00:00').toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3">RD${parseFloat(o.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(o.estado)}`}>
                    {o.estado.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => handleVer(o.id)}
                    className="text-blue-600 hover:underline text-xs">👁️ Ver</button>
                  <button onClick={() => o.estado === 'recibida' ? alert('❌ Esta orden ya fue recibida y no puede editarse.') : handleEditar(o.id)}
                    className={`hover:underline text-xs ${o.estado === 'recibida' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`}>
                    Editar</button>
                  {o.estado === 'pendiente' && (
                    <button onClick={() => { setRecibirForm({ factura_proveedor: '', ncf_proveedor: '' }); setModalRecibir(o.id) }}
                      className="text-green-600 hover:underline text-xs">Recibida</button>
                  )}
                  <button onClick={() => o.estado === 'recibida' ? alert('❌ Esta orden ya fue recibida y no puede eliminarse.') : handleEliminar(o.id)}
                    className={`hover:underline text-xs ${o.estado === 'recibida' ? 'text-gray-400 cursor-not-allowed' : 'text-red-500'}`}>
                    Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editarOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editar Orden — {editarOrden.numero}</h3>
              <button onClick={() => setEditarOrden(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <div className="relative">
                  <input
                    id="oc-edit-proveedor-input"
                    type="text"
                    placeholder="🔍 Buscar proveedor..."
                    autoComplete="off"
                    defaultValue={(proveedores.find(p => p.id === formEditar.supplier_id) || {}).nombre || ''}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={e => {
                      setFormEditar({...formEditar, supplier_id: ''})
                      const val = e.target.value.toLowerCase()
                      const list = document.getElementById('oc-edit-proveedor-list')
                      list.innerHTML = ''
                      if (val) {
                        const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                        filtrados.forEach(p => {
                          const div = document.createElement('div')
                          div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                          div.textContent = p.nombre
                          div.onmousedown = () => {
                            document.getElementById('oc-edit-proveedor-input').value = p.nombre
                            setFormEditar(f => ({...f, supplier_id: p.id}))
                            list.innerHTML = ''
                          }
                          list.appendChild(div)
                        })
                      }
                    }}
                    onKeyDown={e => {
                      const list = document.getElementById('oc-edit-proveedor-list')
                      const opciones = list.querySelectorAll('div')
                      if (opciones.length === 0) return
                      let idx = Array.from(opciones).findIndex(o => o.classList.contains('bg-blue-100'))
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                        idx = (idx + 1) % opciones.length
                        opciones[idx].classList.add('bg-blue-100')
                        opciones[idx].scrollIntoView({ block: 'nearest' })
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (idx >= 0) opciones[idx].classList.remove('bg-blue-100')
                        idx = idx <= 0 ? opciones.length - 1 : idx - 1
                        opciones[idx].classList.add('bg-blue-100')
                        opciones[idx].scrollIntoView({ block: 'nearest' })
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (idx >= 0) opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      }
                    }}
                    onBlur={() => setTimeout(() => { document.getElementById('oc-edit-proveedor-list').innerHTML = '' }, 200)}
                  />
                  <div id="oc-edit-proveedor-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Entrega</label>
                <input type="date" value={formEditar.fecha_entrega} onChange={e => setFormEditar({...formEditar, fecha_entrega: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento Pago</label>
                <input type="date" value={formEditar.fecha_vencimiento_pago} onChange={e => setFormEditar({...formEditar, fecha_vencimiento_pago: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={formEditar.notas} onChange={e => setFormEditar({...formEditar, notas: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <h5 className="font-medium text-gray-700 mb-2">Productos</h5>
            <div className="space-y-2 mb-4">
              {itemsEditar.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <select value={item.product_id} onChange={e => {
                      const updated = [...itemsEditar]
                      updated[idx].product_id = e.target.value
                      const prod = productos.find(p => p.id === e.target.value)
                      if (prod) { updated[idx].descripcion = prod.nombre; updated[idx].precio_unitario = prod.costo || prod.precio || '' }
                      setItemsEditar(updated)
                    }} className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input value={item.descripcion} onChange={e => { const u = [...itemsEditar]; u[idx].descripcion = e.target.value; setItemsEditar(u) }}
                      placeholder="Descripción" className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.cantidad} onChange={e => { const u = [...itemsEditar]; u[idx].cantidad = e.target.value; setItemsEditar(u) }}
                      placeholder="Cant." className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.precio_unitario} onChange={e => { const u = [...itemsEditar]; u[idx].precio_unitario = e.target.value; setItemsEditar(u) }}
                      placeholder="Precio" className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => setItemsEditar(itemsEditar.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-lg">×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setItemsEditar([...itemsEditar, { product_id: '', descripcion: '', cantidad: '', precio_unitario: '' }])}
                className="text-blue-600 hover:underline text-sm">+ Agregar línea</button>
              <p className="font-semibold text-gray-800">Total: RD${itemsEditar.reduce((s, i) => s + ((parseFloat(i.cantidad)||0)*(parseFloat(i.precio_unitario)||0)), 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditarOrden(null)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGuardarEdicion} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {verOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Orden — {verOrden.numero}</h3>
              <button onClick={() => setVerOrden(null)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="font-medium text-gray-600">Proveedor:</span> {verOrden.proveedor_nombre || '-'}</div>
              <div><span className="font-medium text-gray-600">Estado:</span> {verOrden.estado?.toUpperCase()}</div>
              <div><span className="font-medium text-gray-600">Fecha:</span> {new Date(verOrden.creado_en).toLocaleDateString()}</div>
              <div><span className="font-medium text-gray-600">Entrega:</span> {verOrden.fecha_entrega ? new Date(verOrden.fecha_entrega.substring(0, 10) + 'T00:00:00').toLocaleDateString() : '-'}</div>
              <div><span className="font-medium text-gray-600">Vence Pago:</span> {verOrden.fecha_vencimiento_pago ? new Date(verOrden.fecha_vencimiento_pago).toLocaleDateString() : '-'}</div>
              <div><span className="font-medium text-gray-600">No. Factura:</span> {verOrden.factura_proveedor || '-'}</div>
              <div><span className="font-medium text-gray-600">NCF:</span> {verOrden.ncf_proveedor || '-'}</div>
              <div><span className="font-medium text-gray-600">Notas:</span> {verOrden.notas || '-'}</div>
              <div><span className="font-medium text-gray-600">Total:</span> RD${parseFloat(verOrden.total).toLocaleString()}</div>
            </div>
            <h4 className="font-medium text-gray-700 mb-2">Productos</h4>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Descripción</th>
                  <th className="px-3 py-2 text-left text-gray-600">Cantidad</th>
                  <th className="px-3 py-2 text-left text-gray-600">Precio Unit.</th>
                  <th className="px-3 py-2 text-left text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {verOrden.items?.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{item.descripcion}</td>
                    <td className="px-3 py-2">{item.cantidad}</td>
                    <td className="px-3 py-2">RD${parseFloat(item.precio_unitario).toLocaleString()}</td>
                    <td className="px-3 py-2">RD${parseFloat(item.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => {
                const doc = new jsPDF()
                const empresa = sessionStorage.getItem('tenant_name') || 'MI EMPRESA'
                doc.setFontSize(16)
                doc.setFont('helvetica', 'bold')
                doc.text(empresa.toUpperCase(), 105, 18, { align: 'center' })
                doc.setFontSize(13)
                doc.text(`ORDEN DE COMPRA — ${verOrden.numero}`, 105, 27, { align: 'center' })
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                let y = 40
                doc.text(`Proveedor: ${verOrden.proveedor_nombre || '-'}`, 14, y)
                doc.text(`Estado: ${verOrden.estado?.toUpperCase()}`, 130, y)
                y += 7
                doc.text(`Fecha: ${new Date(verOrden.creado_en).toLocaleDateString('es-DO')}`, 14, y)
               doc.text(`Entrega: ${verOrden.fecha_entrega ? new Date(verOrden.fecha_entrega.substring(0, 10) + 'T00:00:00').toLocaleDateString('es-DO') : '-'}`, 130, y)
                y += 7
                doc.text(`Vence Pago: ${verOrden.fecha_vencimiento_pago ? new Date(verOrden.fecha_vencimiento_pago).toLocaleDateString('es-DO') : '-'}`, 14, y)
                doc.text(`Notas: ${verOrden.notas || '-'}`, 130, y)
                y += 10
                autoTable(doc, {
                  startY: y,
                  head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']],
                  body: verOrden.items?.map(it => [
                    it.descripcion,
                    parseFloat(it.cantidad).toLocaleString('es-DO'),
                    `RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO', {minimumFractionDigits:2})}`,
                    `RD$${parseFloat(it.subtotal).toLocaleString('es-DO', {minimumFractionDigits:2})}`
                  ]) || [],
                  theme: 'grid',
                  headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
                  styles: { fontSize: 10, cellPadding: 3 }
                })
         let finalY = doc.lastAutoTable.finalY + 8
                // ESTRUCTURA FISCAL: Total Bruto -> Descuento -> Sub-Total -> ITBIS -> Neto
                const brutoOC = parseFloat(verOrden.total) || 0
                let itbisOC = 0
                ;(verOrden.items || []).forEach(it => {
                  const sub = parseFloat(it.subtotal) || 0
                  const rate = parseFloat(it.itbis_rate) || 0
                  itbisOC += sub * (rate / 100)
                })
                const netoOC = brutoOC + itbisOC
                const fmtOC = (n) => `RD$${parseFloat(n || 0).toLocaleString('es-DO', {minimumFractionDigits:2, maximumFractionDigits:2})}`
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(10)
                const filasOC = [
                  ['TOTAL BRUTO', brutoOC],
                  ['TOTAL DESC.', 0],
                  ['SUB-TOTAL', brutoOC],
                  ['TOTAL ITBIS', itbisOC]
                ]
                filasOC.forEach(([etq, val]) => {
                  doc.text(etq, 150, finalY, { align: 'right' })
                  doc.text(fmtOC(val), 196, finalY, { align: 'right' })
                  finalY += 6
                })
                finalY += 3
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(12)
                doc.text(`NETO RD$: ${fmtOC(netoOC)}`, 196, finalY, { align: 'right' })
          doc.autoPrint()
                const urlOC = doc.output('bloburl')
                const wOC = window.open(urlOC, '_blank')
                if (!wOC) alert('Por favor permite las ventanas emergentes para imprimir')
              }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2">
                Imprimir
              </button>
              <button onClick={() => setVerOrden(null)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibir Orden */}
      {modalRecibir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Recibir Orden de Compra</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura del Proveedor</label>
              <input autoFocus value={recibirForm.factura_proveedor}
                onChange={e => setRecibirForm({ ...recibirForm, factura_proveedor: e.target.value })}
                placeholder="Ej: FACT-00123 (opcional)"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">NCF (Comprobante Fiscal)</label>
              <input value={recibirForm.ncf_proveedor}
                onChange={e => setRecibirForm({ ...recibirForm, ncf_proveedor: e.target.value })}
                placeholder="Ej: B0100000123 (opcional)"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalRecibir(null)}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleConfirmarRecibir}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">✓ Recibir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}