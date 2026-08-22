import { useState, useEffect, useRef, useMemo } from 'react'
import API from '../services/api'

export default function Facturas({ vendedor_id = null, modulos_permitidos = null }) {
  // Feature Flag por tenant: modo POS responsive (solo empresas con features.responsive = true)
  const usuarioSesion = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('usuario')) || {} } catch { return {} } }, [])
  const modoPOS = usuarioSesion?.features?.responsive === true
    const [posLineaAbierta, setPosLineaAbierta] = useState(true)
  const [condicionPago, setCondicionPago] = useState('credito')
  const [montoAbono, setMontoAbono] = useState('')
  const [tab, setTab] = useState(() => {
    const tabGuardado = sessionStorage.getItem('facturas_tab_regreso')
    if (tabGuardado) {
      sessionStorage.removeItem('facturas_tab_regreso')
      return tabGuardado
    }
    return vendedor_id ? 'pedidos' : 'fecha'
  })
  const [formatoImpresion, setFormatoImpresion] = useState(localStorage.getItem('formato_impresion') || 'media')
  const [showFormatoMenu, setShowFormatoMenu] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [facturas, setFacturas] = useState([])
  const [facturasFiltradas, setFacturasFiltradas] = useState([])
  const [conducesVenta, setConducesVenta] = useState([])
  const [busquedaNcf, setBusquedaNcf] = useState('')
  const [busquedaNc, setBusquedaNc] = useState('')
  const [resumen, setResumen] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState('')
  const [facturasZona, setFacturasZona] = useState([])
  const [resumenZona, setResumenZona] = useState(null)
  const [conducesZona, setConducesZona] = useState([])
  const [pagosCd, setPagosCd] = useState([])
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('')
  const [facturasVendedor, setFacturasVendedor] = useState([])
  const [resumenVendedor, setResumenVendedor] = useState(null)
  const [conducesVendedor, setConducesVendedor] = useState([])
  const [productosReporte, setProductosReporte] = useState([])
  const [facturasCliente, setFacturasCliente] = useState([])
  const [resumenCliente, setResumenCliente] = useState(null)
  const [conducesCliente, setConducesCliente] = useState([])
  const [facturasChofer, setFacturasChofer] = useState([])
  const [choferesLista, setChoferesLista] = useState([])
  const [choferSeleccionado, setChoferSeleccionado] = useState('')
  const [relacionVendedor, setRelacionVendedor] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [filtroClienteCot, setFiltroClienteCot] = useState('')
  const [cotFechaInicio, setCotFechaInicio] = useState('')
  const [cotFechaFin, setCotFechaFin] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [showPedido, setShowPedido] = useState(false)
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null)
  const [tipoEntregaPed, setTipoEntregaPed] = useState('factura')
  const [mostrarTipoEntrega, setMostrarTipoEntrega] = useState(false)

  const guardarPedidoFinal = async (tipoEnt) => {
    setMostrarTipoEntrega(false)
    const customer_id = pedClienteSeleccionadoId
    const itemsValidos = itemsPed.filter(i => i.descripcion && i.precio_unitario)
    try {
      if (pedidoEditandoId) {
        await API.put(`/invoices/pedido/${pedidoEditandoId}/editar`, { customer_id: customer_id || null, items: itemsValidos })
        setPedidoEditandoId(null)
      } else {
        await API.post('/invoices/pedido', { customer_id: customer_id || null, items: itemsValidos, tipo_entrega: tipoEnt })
      }
      setShowPedido(false)
      setItemsPed([{descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
      setBuscarProductoPed({})
      const inp = document.getElementById('ped-cliente-input')
      if (inp) inp.value = ''
      const hid = document.getElementById('ped-cliente')
      if (hid) hid.value = ''
      setPedClienteSeleccionadoId('')
      const res = await API.get('/invoices/pedidos/lista')
      setPedidos(res.data.data)
    } catch(e) { alert('Error al guardar pedido') }
  }
  const [itemsPed, setItemsPed] = useState([{descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
  const [buscarProductoPed, setBuscarProductoPed] = useState({})
  const [dropdownPed, setDropdownPed] = useState({})
  const [pedClienteIndex, setPedClienteIndex] = useState(-1)
  const [pedClienteFiltrados, setPedClienteFiltrados] = useState([])
  const [pedClienteSeleccionadoId, setPedClienteSeleccionadoId] = useState('')
  const [pedProductoIndex, setPedProductoIndex] = useState({})
  const pedClienteInputRef = useRef(null)
  const pedProductoRefs = useRef({})
  const pedCantidadRefs = useRef({})
  const pedPrecioRefs = useRef({})
  const pedAgregarRef = useRef(null)
  const pedGuardarRef = useRef(null)
  const [notasCredito, setNotasCredito] = useState([])
  const [showNotaCredito, setShowNotaCredito] = useState(false)
  const [ncFacturaBuscar, setNcFacturaBuscar] = useState('')
  const [ncFacturaEncontrada, setNcFacturaEncontrada] = useState(null)
  const [ncItemsSeleccionados, setNcItemsSeleccionados] = useState([])
  const [ncMotivo, setNcMotivo] = useState('')
  // Estados para Devoluciones
  const [devoluciones, setDevoluciones] = useState([])
  const [showDevolucion, setShowDevolucion] = useState(false)
  const [devFacturaBuscar, setDevFacturaBuscar] = useState('')
  const [mostrarImprimirNcc, setMostrarImprimirNcc] = useState(false)
  const [nccGuardadaId, setNccGuardadaId] = useState(null)
  const [devFacturaEncontrada, setDevFacturaEncontrada] = useState(null)
  const [devItemsSeleccionados, setDevItemsSeleccionados] = useState([])
  const [devMotivo, setDevMotivo] = useState('')
  const [devDetalle, setDevDetalle] = useState(null)
  const [filtroEstadoDev, setFiltroEstadoDev] = useState('todos')
  const [mostrarImprimirNC, setMostrarImprimirNC] = useState(false)
  const [ncGuardadaId, setNcGuardadaId] = useState(null)
  const [showCotizacion, setShowCotizacion] = useState(false)
  const [itemsCot, setItemsCot] = useState([{descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
  const [descuentoPctCot, setDescuentoPctCot] = useState('')
  const [editandoCotId, setEditandoCotId] = useState(null)
  const [buscarProductoCot, setBuscarProductoCot] = useState({})
  const [dropdownCot, setDropdownCot] = useState({})
  const [cotClienteIndex, setCotClienteIndex] = useState(-1)
  const [cotClienteId, setCotClienteId] = useState('')
  const [cotClienteFiltrados, setCotClienteFiltrados] = useState([])
  const [cotProductoIndex, setCotProductoIndex] = useState({})
  const cotClienteInputRef = useRef(null)
  const cotProductoRefs = useRef({})
  const cotCantidadRefs = useRef({})
  const cotPrecioRefs = useRef({})
  const cotAgregarRef = useRef(null)
  const cotGuardarRef = useRef(null)
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [buscarCliente, setBuscarCliente] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [clienteIndex, setClienteIndex] = useState(-1)
const buscarClienteRef = useRef(null)

  // Modo POS (casa reyes): abrir Nueva Factura automáticamente al entrar
  useEffect(() => {
    if (modoPOS && !vendedor_id) {
      setShowForm(true)
      setTimeout(() => buscarClienteRef.current?.focus(), 300)
    }
  }, [])

  const buscarProductoRef = useRef(null)
  const buscarProductoRefs = useRef({})
  const cantidadRefs = useRef({})
  const agregarLineaRef = useRef(null)
  const guardarRef = useRef(null)
  const [buscarProducto, setBuscarProducto] = useState({})
  const [mostrarDropdownProducto, setMostrarDropdownProducto] = useState({})
  const [productoIndex, setProductoIndex] = useState({})
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [mostrarImprimir, setMostrarImprimir] = useState(false)
  const [facturaGuardadaId, setFacturaGuardadaId] = useState(null)
  // Impresión térmica vía RawBT (solo modo POS / casa reyes)
  const imprimirTicketRawBT = async (facturaId) => {
    try {
      const res = await API.get(`/invoices/${facturaId}`)
      const f = res.data.data || res.data
      const anchoLinea = 32
      const linea = (izq, der) => {
        izq = String(izq); der = String(der)
        const espacios = Math.max(1, anchoLinea - izq.length - der.length)
        return izq + ' '.repeat(espacios) + der + '\n'
      }
      const centrar = (t) => {
        t = String(t)
        const pad = Math.max(0, Math.floor((anchoLinea - t.length) / 2))
        return ' '.repeat(pad) + t + '\n'
      }
      const divisor = '-'.repeat(anchoLinea) + '\n'
      let t = ''
      t += '\x1b\x61\x01' // centrar
      t += '\x1b\x21\x30' // texto grande
   t += (f.empresa_nombre || usuarioSesion.empresa || '') + '\n'
      t += '\x1b\x21\x00' // texto normal
      t += '\x1b\x61\x00' // alinear izquierda
      if (f.empresa_rnc) t += 'RNC: ' + f.empresa_rnc + '\n'
      if (f.empresa_telefono) t += 'Tel: ' + f.empresa_telefono + '\n'
      if (f.empresa_direccion) t += f.empresa_direccion + '\n'
      t += divisor
      t += centrar(f.ncf_tipo === 'B01' ? 'FACTURA CREDITO FISCAL' : 'FACTURA CONSUMIDOR FINAL')
      t += (f.ncf ? 'NCF: ' + f.ncf + '\n' : '')
      t += 'Fecha: ' + new Date(f.creado_en || Date.now()).toLocaleString('es-DO') + '\n'
      t += 'Cliente: ' + (f.cliente_nombre || 'Consumidor Final') + '\n'
      t += divisor
      t += linea('DESCRIPCION', 'VALOR')
      t += divisor
      ;(f.items || []).forEach(it => {
        t += it.descripcion + '\n'
        t += linea(parseFloat(it.cantidad).toFixed(2) + ' x ' + parseFloat(it.precio_unitario).toFixed(2),
                   (parseFloat(it.cantidad) * parseFloat(it.precio_unitario)).toFixed(2))
      })
      t += divisor
  let descTicket = parseFloat(f.descuento_monto || 0)
      if (!descTicket && f.notas) {
        const mD = String(f.notas).match(/Descuento:\s*RD\$\s*([\d.,]+)/i)
        if (mD) descTicket = parseFloat(String(mD[1]).replace(/,/g, '')) || 0
      }
      const subNetoTk = parseFloat(f.subtotal || 0)
      t += linea('TOTAL BRUTO', (subNetoTk + descTicket).toFixed(2))
      t += linea('TOTAL DESC.', descTicket.toFixed(2))
      t += linea('SUB-TOTAL', subNetoTk.toFixed(2))
      t += linea('TOTAL ITBIS', parseFloat(f.itbis || 0).toFixed(2))
      t += '\x1b\x21\x10' // doble alto
      t += linea('TOTAL', 'RD$' + parseFloat(f.total || 0).toFixed(2))
      t += '\x1b\x21\x00'
      t += divisor
      t += centrar('Factura No.: ' + (f.numero_factura || f.id))
      t += centrar('GRACIAS POR SU COMPRA')
      t += '\n\n\n'
      const b64 = btoa(unescape(encodeURIComponent(t)))
      window.location.href = 'rawbt:base64,' + b64
    } catch (e) {
      alert('Error al imprimir: ' + e.message)
    }
  }

  // Hoja completa con diálogo de impresión nativo (solo modo POS / casa reyes)
  const imprimirHojaCompleta = async (facturaId) => {
    try {
      const res = await API.get(`/invoices/${facturaId}`)
      const f = res.data.data || res.data
      const filas = (f.items || []).map(it => `
        <tr>
          <td>${it.descripcion}</td>
          <td style="text-align:right">${parseFloat(it.cantidad).toFixed(2)}</td>
          <td style="text-align:right">RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
          <td style="text-align:right">RD$${(parseFloat(it.cantidad)*parseFloat(it.precio_unitario)).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
        </tr>`).join('')
      const w = window.open('', '_blank')
      if (!w) { alert('⚠️ Habilite las ventanas emergentes para imprimir.'); return }
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Factura ${f.ncf || ''}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;max-width:700px;margin:0 auto}
          .header{text-align:center;border-bottom:2px solid #1e40af;padding-bottom:12px;margin-bottom:16px}
          .empresa{font-size:22px;font-weight:bold;color:#1e40af}
          .titulo{font-size:13px;color:#64748b;margin-top:4px}
          .info{background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;line-height:1.7}
          table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
          th{background:#1e40af;color:white;padding:8px;text-align:left}
          td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
          .totales{text-align:right;font-size:14px;line-height:1.8}
          .totales .total{font-size:18px;font-weight:bold;color:#1e40af}
        </style></head><body>
        <div class="header">
          <div class="empresa">${usuarioSesion.empresa || ''}</div>
          <div class="titulo">FACTURA ${f.ncf ? 'NCF: ' + f.ncf : ''}</div>
          <div class="titulo">Factura No.: ${f.numero_factura || f.id} — ${new Date(f.creado_en || Date.now()).toLocaleString('es-DO')}</div>
        </div>
        <div class="info">
          <div><b>Cliente:</b> ${f.cliente_nombre || 'Consumidor Final'}</div>
          ${f.cliente_rnc ? `<div><b>RNC/Cédula:</b> ${f.cliente_rnc}</div>` : ''}
        </div>
        <table>
          <thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="totales">
          <div>Subtotal: RD$${parseFloat(f.subtotal || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
          <div>ITBIS: RD$${parseFloat(f.itbis || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
          <div class="total">TOTAL: RD$${parseFloat(f.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
        </div>
        <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
        </body></html>`)
      w.document.close()
    } catch (e) {
      alert('Error al imprimir: ' + e.message)
    }
  }

  const [mostrarAutorizacion, setMostrarAutorizacion] = useState(false)
  const [claveAutorizacion, setClaveAutorizacion] = useState('')
  const [productosConDescuento, setProductosConDescuento] = useState([])
  // Descuento global por porcentaje en Nueva Factura (no aplica a POS)
  const [descuentoPct, setDescuentoPct] = useState('')
  const [errorAutorizacion, setErrorAutorizacion] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: ''
  })
  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }
  ])

  const [vendedores, setVendedores] = useState([])
  const [zonas, setZonas] = useState([])

  const fetchData = async () => {
    try {
      const [f, c, p] = await Promise.all([
        API.get('/invoices'),
        API.get('/customers'),
        API.get('/products')
      ])
      setFacturas(f.data.data)
      setFacturasFiltradas(f.data.data)
      setClientes(c.data.data)
      setProductos(p.data.data)
      API.get('/mantenimiento/vendedores').then(r => setVendedores(r.data.data)).catch(() => {})
      API.get('/conduces').then(r => setConducesVenta(r.data.data || [])).catch(() => {})
      API.get('/payments').then(r => setPagosCd(r.data.data || [])).catch(() => {})
      API.get('/mantenimiento/zonas').then(r => setZonas(r.data.data)).catch(() => {})
      API.get('/invoices/cotizaciones/lista').then(r => setCotizaciones(r.data.data)).catch(() => {})
      API.get('/invoices/pedidos/lista').then(r => setPedidos(r.data.data)).catch(() => {})
      Promise.all([
        API.get('/invoices/nota-credito/lista').then(r => r.data.data).catch(() => []),
        API.get('/conduces/nc/lista').then(r => (r.data.data || []).map(n => ({ ...n, ncf: n.numero, es_conduce_nc: true }))).catch(() => [])
      ]).then(([ncFac, ncCond]) => setNotasCredito([...ncFac, ...ncCond].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))))
      API.get('/devoluciones').then(r => setDevoluciones(r.data.data)).catch(() => {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (tab === 'nota_credito') {
     Promise.all([
        API.get('/invoices/nota-credito/lista').then(r => r.data.data).catch(() => []),
        API.get('/conduces/nc/lista').then(r => (r.data.data || []).map(n => ({ ...n, ncf: n.numero, es_conduce_nc: true }))).catch(() => [])
      ]).then(([ncFac, ncCond]) => setNotasCredito([...ncFac, ...ncCond].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))))
    }
  }, [tab])

  useEffect(() => {
    API.get('/mantenimiento/choferes')
      .then(r => setChoferesLista(r.data.data || []))
      .catch(() => {})
  }, [])

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Detectar automaticamente el tipo de NCF segun el tipo de cliente
  const detectarNCFPorCliente = (tipoCliente) => {
    const mapa = {
      'consumidor_final': 'B02',
      'credito_fiscal': 'B01',
      'gubernamental': 'B15',
      'e31_credito_fiscal_electronico': 'E31',
      'e32_consumo_electronico': 'E32'
    }
    return mapa[tipoCliente] || 'B01'
  }

const handleItemChange = (index, e) => {
    // Si selecciona un producto que YA existe en otra linea: sumar cantidad y eliminar linea actual
    if (e.target.name === 'product_id' && e.target.value) {
      const yaExisteIndex = items.findIndex((it, i) => i !== index && it.product_id === e.target.value)
      if (yaExisteIndex !== -1) {
        const newItems = items
          .map((it, i) => i === yaExisteIndex ? { ...it, cantidad: parseFloat(it.cantidad || 0) + 1 } : it)
          .filter((_, i) => i !== index)
        setItems(newItems)
        return
      }
    }
    // Comportamiento normal
    const newItems = items.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [e.target.name]: e.target.value }
      if (e.target.name === 'product_id' && e.target.value) {
        const prod = productos.find(p => p.id === e.target.value)
        if (prod) {
          updated.descripcion = prod.nombre
          updated.precio_unitario = prod.precio
          updated.itbis_rate = prod.itbis_rate
        }
      }
      return updated
    })
    setItems(newItems)
  }

  const agregarItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
  }

 const eliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
    // Reindexar los textos de los buscadores para que sigan alineados con sus lineas
    const reindexar = (obj) => {
      const nuevo = {}
      Object.keys(obj).forEach(k => {
        const i = parseInt(k)
        if (i < index) nuevo[i] = obj[k]
        else if (i > index) nuevo[i - 1] = obj[k]
      })
      return nuevo
    }
    setBuscarProducto(prev => reindexar(prev))
    setMostrarDropdownProducto(prev => reindexar(prev))
    setProductoIndex(prev => reindexar(prev))
  }

const calcularTotales = () => {
    let subtotal = 0, itbis = 0
    items.forEach(item => {
      const bruto = parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0)
      const base = bruto / (1 + (parseFloat(item.itbis_rate || 0) / 100))
      subtotal += base
      itbis += bruto - base
    })
    return { subtotal, itbis, total: subtotal + itbis }
  }
const handleSubmit = async (e) => {
    e.preventDefault()
  // Validar que la factura tenga un cliente registrado seleccionado
    if (!form.customer_id) {
      alert('⚠️ Debe seleccionar un cliente registrado de la lista para crear la factura.')
      return
    }
    // Validar que haya al menos un articulo con cantidad y precio
    const itemsValidos = items.filter(it => it.descripcion && parseFloat(it.cantidad) > 0 && parseFloat(it.precio_unitario) > 0)
    if (itemsValidos.length === 0) {
      alert('⚠️ Debe agregar al menos un artículo con cantidad y precio.')
      return
    }
// Validar stock disponible por producto (suma cantidades de líneas repetidas)
    // Feature Flag stock_negativo: permite facturar sin stock (ej: casa reyes)
    const permiteStockNegativo = usuarioSesion?.features?.stock_negativo === true
    if (!permiteStockNegativo) {
    const cantidadesPorProducto = {}
    items.forEach(item => {
      if (item.product_id) {
        cantidadesPorProducto[item.product_id] = (cantidadesPorProducto[item.product_id] || 0) + parseFloat(item.cantidad || 0)
      }
    })
    for (const [productId, cantidadTotal] of Object.entries(cantidadesPorProducto)) {
      const prod = productos.find(p => p.id === productId)
      if (prod) {
       const padreProd = prod.articulo_padre_id ? productos.find(x => x.id === prod.articulo_padre_id) : null
        const factorProd = parseFloat(prod.factor_empaque || 1) || 1
        const stockDisponible = padreProd ? Math.floor(parseFloat(padreProd.stock_actual || 0) / factorProd) : parseFloat(prod.stock_actual || 0)
        if (cantidadTotal > stockDisponible) {
          alert(`⚠️ Stock insuficiente para "${prod.nombre}".\n\nDisponible: ${stockDisponible}\nSolicitado: ${cantidadTotal}\n\nSolo puede facturar hasta ${stockDisponible}.`)
          return
        }
      }
    }
    }
    setMostrarConfirmar(true)
  }

 const guardarFacturaFinal = async () => {
    setError('')
    try {
// Descuento global por porcentaje: lo aplica el backend
      const pctFinal = Math.min(Math.max(parseFloat(descuentoPct) || 0, 0), 100)
      // Solo enviar lineas completas (el flujo POS deja una linea vacia al final)
      // Los precios van ORIGINALES: el backend calcula el descuento
      const itemsEnviar = items.filter(it => it.descripcion && parseFloat(it.cantidad) > 0 && parseFloat(it.precio_unitario) > 0)
           const res = await API.post('/invoices', { ...form, items: itemsEnviar, descuento_pct: pctFinal, estado: 'emitida' })
      if (modoPOS && condicionPago !== 'credito') {
        const facCreada = res.data.data || res.data
        const totalFac = parseFloat(facCreada.total || 0)
        const montoPago = condicionPago === 'contado' ? totalFac : (parseFloat(montoAbono) || 0)
        if (montoPago > 0 && facCreada.id) {
          try {
            await API.post('/payments', {
              invoice_id: facCreada.id,
              monto: montoPago > totalFac ? totalFac : montoPago,
              metodo: 'efectivo',
              notas: condicionPago === 'contado' ? 'Pago de contado' : 'Abono inicial'
            })
          } catch (ePago) {
            alert('La factura se guardo, pero no se pudo registrar el pago. Registrelo desde el modulo Pagos.')
          }
        }
      }
      setCondicionPago('credito')
      setMontoAbono('')
      setShowForm(false)
      setDescuentoPct('')
      setForm({ customer_id: '', ncf_tipo: 'B01', notas: '', fecha_vencimiento: '' })
      setItems([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
      setBuscarCliente('')
      setClienteSeleccionado(null)
      setBuscarProducto({})
      fetchData()
      const id = res.data.data?.id || res.data.id
      console.log('Factura guardada ID:', id, 'Response:', res.data)
      if (id) {
        setFacturaGuardadaId(id)
        setMostrarImprimir(true)
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const handleConfirmarSi = async () => {
    setMostrarConfirmar(false)
    // Detectar productos con precio menor al oficial
    const productosBajos = []
    items.forEach(item => {
      if (item.product_id && item.precio_unitario) {
        const prodOficial = productos.find(p => p.id === item.product_id)
        if (prodOficial && parseFloat(item.precio_unitario) < parseFloat(prodOficial.precio)) {
          productosBajos.push({
            nombre: prodOficial.nombre,
            precio_oficial: parseFloat(prodOficial.precio),
            precio_ingresado: parseFloat(item.precio_unitario),
            diferencia: parseFloat(prodOficial.precio) - parseFloat(item.precio_unitario)
          })
        }
      }
    })

  // Si hay productos bajos O descuento global Y NO es admin (vendedor u operador) → pedir autorización
    const esNoAdmin = vendedor_id || modulos_permitidos !== null
    const pctDesc = Math.min(Math.max(parseFloat(descuentoPct) || 0, 0), 100)
    if ((productosBajos.length > 0 || pctDesc > 0) && esNoAdmin) {
      setProductosConDescuento(productosBajos)
      setClaveAutorizacion('')
      setErrorAutorizacion('')
      setMostrarAutorizacion(true)
      return
    }

    // Si es admin o no hay precios bajos → guardar directo
    await guardarFacturaFinal()
  }

  const handleValidarClave = async () => {
    if (!claveAutorizacion.trim()) {
      setErrorAutorizacion('Ingrese la clave de autorización')
      return
    }
    try {
      const res = await API.post('/mantenimiento/validar-clave-descuento', { clave: claveAutorizacion })
      if (res.data.valido) {
        setMostrarAutorizacion(false)
        setClaveAutorizacion('')
        setProductosConDescuento([])
        setErrorAutorizacion('')
        await guardarFacturaFinal()
      } else {
        setErrorAutorizacion('❌ Clave incorrecta. Intente de nuevo.')
      }
    } catch(e) {
      setErrorAutorizacion('❌ Error al validar clave')
    }
  }

  const handleConfirmarVolver = () => {
    setMostrarConfirmar(false)
    setTimeout(() => agregarLineaRef.current?.focus(), 100)
  }

  const handleEmitir = async (id) => {
    if (!confirm('¿Emitir esta factura? Se asignará un NCF.')) return
    try {
      await API.put(`/invoices/${id}/emitir`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al emitir')
    }
  }

  const handleAnular = async (id) => {
    if (!confirm('¿Anular esta factura?')) return
    try {
      await API.put(`/invoices/${id}/anular`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al anular')
    }
  }

const handlePDF = (id) => {
    const token = sessionStorage.getItem('token')
    let endpoint = '/pdf'
    if (formatoImpresion === 'pos') endpoint = '/pdf-pos'
    else if (formatoImpresion === 'carta') endpoint = '/pdf-carta'
    window.open(`/invoices/${id}${endpoint}?token=${token}`, '_blank')
  }

const handleImprimir = (id) => {
    const token = sessionStorage.getItem('token')
    let endpoint = '/pdf'
    if (formatoImpresion === 'pos') endpoint = '/pdf-pos'
    else if (formatoImpresion === 'carta') endpoint = '/pdf-carta'
    const url = `/invoices/${id}${endpoint}?token=${token}`

    // Abrir PDF en nueva pestaña y disparar impresion automatica
    const ventana = window.open(url, '_blank')
    if (ventana) {
      ventana.addEventListener('load', () => {
        setTimeout(() => {
          ventana.focus()
          ventana.print()
        }, 1000)
      })
    } else {
      // Fallback si bloquea ventanas emergentes
      alert('Por favor permite las ventanas emergentes para imprimir')
    }
  }

  const cambiarFormato = (formato) => {
    setFormatoImpresion(formato)
    localStorage.setItem('formato_impresion', formato)
    setShowFormatoMenu(false)
  }

const { subtotal, itbis, total } = useMemo(() => {
    let subtotal = 0, itbis = 0
    items.forEach(item => {
      const bruto = parseFloat(item.cantidad || 0) * parseFloat(item.precio_unitario || 0)
      const base = bruto / (1 + (parseFloat(item.itbis_rate || 0) / 100))
      subtotal += base
      itbis += bruto - base
    })
    return { subtotal, itbis, total: subtotal + itbis }
  }, [items])

  const estadoColor = (estado) => {
    if (estado === 'pagada') return 'bg-green-100 text-green-700'
    if (estado === 'emitida') return 'bg-blue-100 text-blue-700'
    if (estado === 'anulada') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const tabsFila1Todos = [
    { id: 'fecha', label: 'Venta por Fecha' },
    { id: 'zona', label: 'Venta por Zona' },
    { id: 'vendedor', label: 'Venta por Vendedor' },
    { id: 'producto', label: 'Venta por Articulo' },
    { id: 'cliente', label: 'Venta por Cliente' },
    { id: 'chofer', label: 'Entregada Chofer' },
    { id: 'relacion_vendedor', label: 'Relacion Vendedor' },
  ]

  const tabsFila2Todos = [
    // { id: 'cobro_vendedor', label: 'Cobro por Vendedor' },
    // { id: 'cxc_vendedor', label: 'Cuenta por Cobrar por Vendedor' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'cotizacion', label: 'Cotización' },
    { id: 'nota_credito', label: 'Nota de Crédito' },
    { id: 'devoluciones', label: '🔄 Devoluciones' },
  ]

  // Filtrar sub-tabs segun permisos del operador
const puedeVerSubTab = (subTabId) => {
    // Vendedor: solo Pedidos (mas imprimir/pdf de sus propios documentos)
    if (vendedor_id) return subTabId === 'pedidos' || subTabId === 'imprimir' || subTabId === 'pdf'
    if (!modulos_permitidos) return true // admin: ve todo
    return modulos_permitidos.includes(`facturas:${subTabId}`)
  }
  const tabsFila1 = tabsFila1Todos.filter(t => puedeVerSubTab(t.id))
  const tabsFila2 = tabsFila2Todos.filter(t => puedeVerSubTab(t.id))

  if (loading) return <p className="text-gray-500 p-6">Cargando facturas...</p>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Facturas</h2>
      {tab === 'fecha' && (
        <button onClick={() => { setShowForm(true); setTimeout(() => buscarClienteRef.current?.focus(), 100) }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
      + Nueva Factura
        </button>
        )}
 {tab === 'fecha' && (
          <input
            type="text"
            placeholder="Buscar NCF..."
            value={busquedaNcf}
            onChange={e => setBusquedaNcf(e.target.value.toUpperCase())}
            className="border rounded px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
          />
        )}
        {tab === 'nota_credito' && (
          <input
            type="text"
            placeholder="Buscar NC..."
            value={busquedaNc}
            onChange={e => setBusquedaNc(e.target.value.toUpperCase())}
            className="border rounded px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
          />
        )}
      </div>

      {/* Filtro de fechas */}
<div className="flex flex-wrap gap-3 sm:gap-4 items-end mb-4 bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
          <input type="date" id="filtro-fecha-inicio" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
          <input type="date" id="filtro-fecha-fin" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
  <button id="btn-buscar-reporte" className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          onClick={async () => {
            // Leer fechas directamente del DOM para evitar valores obsoletos (stale) por timing
            const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value || ''
            const fechaFin = document.getElementById('filtro-fecha-fin')?.value || ''
            setFechaInicio(fechaInicio)
            setFechaFin(fechaFin)
            const filtradas = facturas.filter(f => {
              const d = new Date(f.creado_en)
              const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
              if (fechaInicio && fecha < fechaInicio) return false
              if (fechaFin && fecha > fechaFin) return false
              return true
            })
            setFacturasFiltradas(filtradas)
            // Cargar resumen
            try {
              const params = []
              let url = '/invoices/reporte/resumen'
              const qs = []
              if (fechaInicio) qs.push(`fecha_inicio=${fechaInicio}`)
              if (fechaFin) qs.push(`fecha_fin=${fechaFin}`)
              if (qs.length) url += '?' + qs.join('&')
      const res = await API.get(url)
              setResumen(res.data.data)
            } catch (e) { console.error(e) }
            // Si estamos en el tab chofer, cargar las entregas del chofer seleccionado
            if (tab === 'chofer') {
              if (!choferSeleccionado) { alert('Seleccione un chofer'); return }
              try {
                const qsCh = []
                if (fechaInicio) qsCh.push(`fecha_inicio=${fechaInicio}`)
                if (fechaFin) qsCh.push(`fecha_fin=${fechaFin}`)
                const urlCh = `/invoices/chofer/${choferSeleccionado}/entregas${qsCh.length ? '?' + qsCh.join('&') : ''}`
                const resCh = await API.get(urlCh)
                setFacturasChofer(resCh.data.data || [])
     } catch (err) {
                alert('Error al cargar las entregas del chofer')
                setFacturasChofer([])
              }
            }
            // Si estamos en el tab producto, cargar el reporte por producto
            if (tab === 'producto') {
              try {
        let vendedorId = document.getElementById('prod-vendedor')?.value
                let clienteId = document.getElementById('prod-cliente')?.value
                const productoNombre = document.getElementById('prod-producto-input')?.value.trim()
                // Si no hay ID, resolver por el nombre escrito (robusto)
                if (!vendedorId) {
                  const vNombre = (document.getElementById('prod-vendedor-input')?.value || '').trim().toLowerCase()
                  if (vNombre) {
                    const vEnc = vendedores.find(v => v.nombre.toLowerCase() === vNombre)
                    if (vEnc) vendedorId = vEnc.id
                  }
                }
                if (!clienteId) {
                  const cNombre = (document.getElementById('prod-cliente-input')?.value || '').trim().toLowerCase()
                  if (cNombre) {
                    const cEnc = clientes.find(c => c.nombre.toLowerCase() === cNombre)
                    if (cEnc) clienteId = cEnc.id
                  }
                }
               
                const qsP = []
                if (fechaInicio) qsP.push(`fecha_inicio=${fechaInicio}`)
                if (fechaFin) qsP.push(`fecha_fin=${fechaFin}`)
                if (vendedorId) qsP.push(`vendedor_id=${vendedorId}`)
                if (clienteId) qsP.push(`customer_id=${clienteId}`)
                if (productoNombre) qsP.push(`producto=${encodeURIComponent(productoNombre)}`)
                let urlP = '/invoices/reporte/productos'
                if (qsP.length) urlP += '?' + qsP.join('&')
     const resP = await API.get(urlP)
                setProductosReporte(resP.data.data)
 } catch (err) {
                console.error(err)
              }
            }
            // Si estamos en el tab pedidos, filtrar pedidos por fecha + vendedor
            if (tab === 'pedidos') {
              try {
                const vendedorId = document.getElementById('ped-vendedor-filtro')?.value
                const qsPed = []
                if (vendedorId) qsPed.push(`vendedor_id=${vendedorId}`)
                if (fechaInicio) qsPed.push(`fecha_inicio=${fechaInicio}`)
                if (fechaFin) qsPed.push(`fecha_fin=${fechaFin}`)
                let urlPed = '/invoices/pedidos/lista'
                if (qsPed.length) urlPed += '?' + qsPed.join('&')
                const resPed = await API.get(urlPed)
                setPedidos(resPed.data.data)
              } catch (err) {
                console.error(err)
              }
            }
     // Si estamos en el tab cliente, buscar las facturas del cliente
            if (tab === 'cliente') {
              let clienteId = document.getElementById('cli-cliente')?.value
              // Si no hay ID guardado, intentar resolverlo por el nombre escrito
              if (!clienteId) {
                const nombreEscrito = (document.getElementById('cli-cliente-input')?.value || '').trim().toLowerCase()
                const encontrado = clientes.find(c => c.nombre.toLowerCase() === nombreEscrito)
                if (encontrado) clienteId = encontrado.id
              }
              if (!clienteId) { alert('Seleccione un cliente de la lista'); return }
 const filtradas = facturas.filter(f => {
                if (f.customer_id !== clienteId) return false
                if (f.estado !== 'emitida' && f.estado !== 'pagada') return false
                const d = new Date(f.creado_en)
                const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fecha < fechaInicio) return false
                if (fechaFin && fecha > fechaFin) return false
                return true
              })
        setFacturasCliente(filtradas)
              const cdCliente = conducesVenta.filter(cd => {
                if (cd.customer_id !== clienteId) return false
                if (cd.estado !== 'emitido' || cd.facturado) return false
                const d = new Date(cd.creado_en)
                const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fcd < fechaInicio) return false
                if (fechaFin && fcd > fechaFin) return false
                return true
              })
              setConducesCliente(cdCliente)
              const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total_neto != null ? f.total_neto : f.total || 0), 0)
              const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
              const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
              const totalConducesCliente = cdCliente.reduce((s, cd) => s + parseFloat(cd.total || 0), 0)
      setResumenCliente({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal, total_conduces: totalConducesCliente })
            }
            // Si estamos en el tab zona, buscar las facturas de la zona
            if (tab === 'zona') {
              if (!zonaSeleccionada) { alert('Seleccione una zona'); return }
              const clientesZona = clientes.filter(c => c.zona_id === zonaSeleccionada)
              const idsClientes = clientesZona.map(c => c.id)
   const filtradas = facturas.filter(f => {
                if (!idsClientes.includes(f.customer_id)) return false
                if (f.estado !== 'emitida' && f.estado !== 'pagada') return false
                const d = new Date(f.creado_en)
                const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fecha < fechaInicio) return false
                if (fechaFin && fecha > fechaFin) return false
                return true
              })
       setFacturasZona(filtradas)
              const cdZona = conducesVenta.filter(cd => {
                if (!idsClientes.includes(cd.customer_id)) return false
                if (cd.estado !== 'emitido' || cd.facturado) return false
                const d = new Date(cd.creado_en)
                const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fcd < fechaInicio) return false
                if (fechaFin && fcd > fechaFin) return false
                return true
              })
              setConducesZona(cdZona)
              const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total_neto != null ? f.total_neto : f.total || 0), 0)
              const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
              const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
              const totalConducesZona = cdZona.reduce((s, cd) => s + parseFloat(cd.total || 0), 0)
       setResumenZona({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal, total_conduces: totalConducesZona })
            }
            // Si estamos en el tab vendedor, buscar las facturas del vendedor
            if (tab === 'vendedor') {
              if (!vendedorSeleccionado) { alert('Seleccione un vendedor'); return }
        const clientesVendedor = clientes.filter(c => c.vendedor_id === vendedorSeleccionado)
              const idsClientes = clientesVendedor.map(c => c.id)
              const filtradas = facturas.filter(f => {
                if (!idsClientes.includes(f.customer_id)) return false
                if (f.estado !== 'emitida' && f.estado !== 'pagada') return false
                const d = new Date(f.creado_en)
                const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fecha < fechaInicio) return false
                if (fechaFin && fecha > fechaFin) return false
                return true
              })
    setFacturasVendedor(filtradas)
              const cdVendedor = conducesVenta.filter(cd => {
                if (!idsClientes.includes(cd.customer_id)) return false
                if (cd.estado !== 'emitido' || cd.facturado) return false
                const d = new Date(cd.creado_en)
                const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fcd < fechaInicio) return false
                if (fechaFin && fcd > fechaFin) return false
                return true
              })
              setConducesVendedor(cdVendedor)
              const totalVentas = filtradas.reduce((s, f) => s + parseFloat(f.total_neto != null ? f.total_neto : f.total || 0), 0)
              const totalItbis = filtradas.reduce((s, f) => s + parseFloat(f.itbis || 0), 0)
              const totalSubtotal = filtradas.reduce((s, f) => s + parseFloat(f.subtotal || 0), 0)
              const totalConducesVendedor = cdVendedor.reduce((s, cd) => s + parseFloat(cd.total || 0), 0)
        setResumenVendedor({ total_ventas: totalVentas, total_itbis: totalItbis, total_subtotal: totalSubtotal, total_conduces: totalConducesVendedor })
            }
     // Si estamos en el tab cotizacion, aplicar el filtro de fechas
            if (tab === 'cotizacion') {
              setCotFechaInicio(fechaInicio)
              setCotFechaFin(fechaFin)
            }
        // Si estamos en el tab relacion_vendedor, buscar la relación del vendedor
            if (tab === 'relacion_vendedor') {
              let vendedorId = document.getElementById('rel-vendedor')?.value
              // Si no hay ID guardado, resolverlo por el nombre escrito
              if (!vendedorId) {
                const nombreEscrito = (document.getElementById('rel-vendedor-input')?.value || '').trim().toLowerCase()
                const encontrado = vendedores.find(v => v.nombre.toLowerCase() === nombreEscrito)
                if (encontrado) {
                  vendedorId = encontrado.id
                  document.getElementById('rel-vendedor').value = encontrado.id
                }
              }
              if (!vendedorId) { alert('Seleccione un vendedor'); return }
         const clientesVendedor = clientes.filter(c => c.vendedor_id === vendedorId)
              const idsClientes = clientesVendedor.map(c => c.id)
              const filtradas = facturas.filter(f => {
                if (!idsClientes.includes(f.customer_id)) return false
                if (f.estado !== 'emitida') return false
                const d = new Date(f.creado_en)
                const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fecha < fechaInicio) return false
                if (fechaFin && fecha > fechaFin) return false
                return true
              })
              const conducesRel = conducesVenta.filter(cd => {
                if (!idsClientes.includes(cd.customer_id)) return false
                if (cd.estado !== 'emitido' || cd.facturado) return false
                const d = new Date(cd.creado_en)
                const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fcd < fechaInicio) return false
                if (fechaFin && fcd > fechaFin) return false
                return true
              }).map(cd => ({ ...cd, ncf: cd.numero, estado: 'emitida', es_conduce: true }))
              setRelacionVendedor([...filtradas, ...conducesRel].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)))
            }
}}>
          Buscar
        </button>
{((tab === 'fecha' && resumen) || (tab === 'cliente' && resumenCliente) || (tab === 'zona' && resumenZona) || (tab === 'vendedor' && resumenVendedor) || (tab === 'relacion_vendedor' && relacionVendedor.length > 0)) && (
          <button
            onClick={() => {
              // Si estamos en el tab relacion_vendedor, imprimir la relación del vendedor
              if (tab === 'relacion_vendedor' && relacionVendedor.length > 0) {
                const vendedorId = document.getElementById('rel-vendedor')?.value
                const vendedor = vendedores.find(v => v.id === vendedorId)
                const printW = window.open('', '_blank')
                const filas = relacionVendedor.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                const totalGeneral = relacionVendedor.reduce((s, f) => s + parseFloat(f.total_neto != null ? f.total_neto : f.total || 0), 0)
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Relación Vendedor</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .total-row{font-weight:bold;background:#f1f5f9}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Relación de Facturas — Vendedor: ${vendedor?.nombre || ''}</h2>
                  <p class="sub">Período: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} — Total facturas: ${relacionVendedor.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>
                      ${filas}
                      <tr class="total-row">
                        <td colspan="2">TOTAL GENERAL</td>
                        <td style="text-align:right">RD$${totalGeneral.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td colspan="2"></td>
                      </tr>
                    </tbody>
                  </table>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
                return
              }
              // Si estamos en el tab vendedor, imprimir el reporte del vendedor
              if (tab === 'vendedor' && resumenVendedor) {
                const vendedor = vendedores.find(v => v.id === vendedorSeleccionado)
                const pwv = window.open('', '_blank')
      const filasVend = facturasVendedor.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}${parseFloat(f.nc_aplicada) > 0 ? ' (NC)' : ''}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('') + conducesVendedor.map(cd => `
                  <tr>
                    <td>${cd.numero || 'CD'} <span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 4px;border-radius:3px;font-weight:bold">CONDUCE</span></td>
                    <td>${cd.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(cd.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">CONDUCE</td>
                    <td style="text-align:center">${new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                pwv.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Vendedor</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas por Vendedor: ${vendedor ? vendedor.nombre : ''}</h2>
                  <p class="periodo">Periodo: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} - Total facturas: ${facturasVendedor.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filasVend}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenVendedor.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenVendedor.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                   <div class="resumen-fila total"><span>Ventas con NCF:</span><span>RD$${resumenVendedor.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>Ventas por Conduce:</span><span>RD$${parseFloat(resumenVendedor.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>TOTAL GENERAL:</span><span>RD$${(parseFloat(resumenVendedor.total_ventas) + parseFloat(resumenVendedor.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                pwv.document.close()
                return
              }
              // Si estamos en el tab zona, imprimir el reporte de la zona
              if (tab === 'zona' && resumenZona) {
                const zona = zonas.find(z => z.id === zonaSeleccionada)
                const pw = window.open('', '_blank')
       const filasZona = facturasZona.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}${parseFloat(f.nc_aplicada) > 0 ? ' (NC)' : ''}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('') + conducesZona.map(cd => `
                  <tr>
                    <td>${cd.numero || 'CD'} <span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 4px;border-radius:3px;font-weight:bold">CONDUCE</span></td>
                    <td>${cd.cliente_nombre || 'Consumidor Final'}</td>
                    <td style="text-align:right">RD$${parseFloat(cd.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">CONDUCE</td>
                    <td style="text-align:center">${new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                pw.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Zona</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas por Zona: ${zona ? zona.nombre : ''}</h2>
                  <p class="periodo">Periodo: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} - Total facturas: ${facturasZona.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filasZona}</tbody>
                  </table>
                  <div class="resumen">
                  <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenZona.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenZona.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>Ventas con NCF:</span><span>RD$${resumenZona.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>Ventas por Conduce:</span><span>RD$${parseFloat(resumenZona.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>TOTAL GENERAL:</span><span>RD$${(parseFloat(resumenZona.total_ventas) + parseFloat(resumenZona.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                pw.document.close()
                return
              }
              // Si estamos en el tab cliente, imprimir el reporte especifico del cliente
              if (tab === 'cliente' && resumenCliente) {
                const clienteNombre = document.getElementById('cli-cliente-input').value
                const printW = window.open('', '_blank')
        const filas = facturasCliente.map(f => `
                  <tr>
                    <td>${f.ncf || 'BORRADOR'}</td>
                    <td style="text-align:right">RD$${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}${parseFloat(f.nc_aplicada) > 0 ? ' (NC)' : ''}</td>
                    <td style="text-align:center">${f.estado.toUpperCase()}</td>
                    <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('') + conducesCliente.map(cd => `
                  <tr>
                    <td>${cd.numero || 'CD'} <span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 4px;border-radius:3px;font-weight:bold">CONDUCE</span></td>
                    <td style="text-align:right">RD$${parseFloat(cd.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:center">CONDUCE</td>
                    <td style="text-align:center">${new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>`).join('')
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Cliente</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Ventas: ${clienteNombre}</h2>
                  <p class="periodo">Periodo: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} - Total facturas: ${facturasCliente.length}</p>
                  <table>
                    <thead><tr><th>NCF</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumenCliente.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumenCliente.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                   <div class="resumen-fila total"><span>Ventas con NCF:</span><span>RD$${resumenCliente.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>Ventas por Conduce:</span><span>RD$${parseFloat(resumenCliente.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila total"><span>TOTAL GENERAL:</span><span>RD$${(parseFloat(resumenCliente.total_ventas) + parseFloat(resumenCliente.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
                return
              }
            const printW = window.open('', '_blank')
         const filas = facturasFiltradas.filter(f => f.estado === 'emitida' || f.estado === 'pagada').map(f => `
                <tr>
                  <td>${f.ncf || 'BORRADOR'}</td>
                  <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                  <td style="text-align:right">RD$${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}${parseFloat(f.nc_aplicada) > 0 ? ' (NC)' : ''}</td>
                  <td style="text-align:center">${f.estado.toUpperCase()}</td>
                  <td style="text-align:center">${new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                </tr>`).join('')
              const conducesRango = conducesVenta.filter(cd => {
                if (cd.estado !== 'emitido' || cd.facturado) return false
                const d = new Date(cd.creado_en)
                const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                if (fechaInicio && fcd < fechaInicio) return false
                if (fechaFin && fcd > fechaFin) return false
                return true
              })
              const filasConduces = conducesRango.map(cd => `
                <tr>
                  <td>${cd.numero || 'CD'} <span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 4px;border-radius:3px;font-weight:bold">CONDUCE</span></td>
                  <td>${cd.cliente_nombre || 'Consumidor Final'}</td>
                  <td style="text-align:right">RD$${parseFloat(cd.total || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  <td style="text-align:center">CONDUCE</td>
                  <td style="text-align:center">${new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                </tr>`).join('')
              const totalConduces = conducesRango.reduce((s, cd) => s + parseFloat(cd.total || 0), 0)
              const totalGeneralVentas = parseFloat(resumen.total_ventas) + totalConduces
              printW.document.write(`
                <!DOCTYPE html><html><head><title>Reporte de Ventas</title>
                <style>
                  body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                  h2{color:#1e40af;margin-bottom:4px}
                  p.periodo{color:#64748b;font-size:13px;margin-bottom:16px}
                  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                  th{background:#1e40af;color:white;padding:8px;text-align:left}
                  td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                  tr:nth-child(even){background:#f8fafc}
                  .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                  .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                  .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                  .resumen-fila.beneficio{font-weight:bold;font-size:14px;color:#16a34a;border-bottom:none}
                  @media print{button{display:none}}
                </style></head><body>
                <h2>Reporte de Ventas</h2>
                <p class="periodo">Período: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Hoy'}</p>
                <table>
                  <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th><th style="text-align:center">Estado</th><th style="text-align:center">Fecha</th></tr></thead>
                  <tbody>${filas}${filasConduces}</tbody>
                </table>
                <div class="resumen">
                  <div class="resumen-fila"><span>Subtotal (sin ITBIS):</span><span>RD$${resumen.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila"><span>ITBIS:</span><span>RD$${resumen.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
<div class="resumen-fila total"><span>Ventas con NCF:</span><span>RD$${resumen.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila"><span>Ventas por Conduce:</span><span>RD$${totalConduces.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  <div class="resumen-fila total"><span>TOTAL GENERAL:</span><span>RD$${totalGeneralVentas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                </div>
                <script>window.onload=()=>window.print()</script>
                </body></html>`)
              printW.document.close()
            }}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
            🖨️ Imprimir Reporte
          </button>
        )}
      </div>

      {/* Tabs fila 1 */}
      <div className="flex gap-2 border-b mb-0">
        {tabsFila1.map(t => (
          <button key={t.id} onClick={() => { if (vendedor_id) { alert('Usted no tiene permiso para este módulo'); return }; setTab(t.id) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

{/* Tabs fila 2 */}
      <div className="flex gap-2 border-b mb-6 items-center">
        {tabsFila2.map(t => (
          <button key={t.id} onClick={() => { if (vendedor_id && t.id !== 'pedidos') { alert('Usted no tiene permiso para este módulo'); return }; setTab(t.id); if (t.id === 'nota_credito') { API.get('/invoices/nota-credito/lista').then(r => setNotasCredito(r.data.data)).catch(() => {}) } }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
        
      {/* Botón Tipo de Impresión — oculto para vendedores */}
        {!vendedor_id && (
        <div className="relative ml-auto mb-2">
          <button onClick={() => setShowFormatoMenu(!showFormatoMenu)}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 flex items-center gap-2 font-medium shadow">
            🖨️ Tipo de Impresión
            <span className="text-xs bg-white text-purple-700 px-2 py-0.5 rounded font-bold">
              {formatoImpresion === 'pos' ? 'POS' : formatoImpresion === 'carta' ? 'CARTA' : 'MEDIA'}
            </span>
            <span className="text-xs">▼</span>
          </button>
          
          {showFormatoMenu && (
            <>
              {/* Overlay para cerrar al hacer clic afuera */}
              <div className="fixed inset-0 z-40" onClick={() => setShowFormatoMenu(false)}></div>
              
              {/* Menú dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-50 w-64 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <p className="text-xs font-semibold text-gray-700">Selecciona el formato de impresión</p>
                </div>
                
                <button onClick={() => cambiarFormato('carta')}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b text-sm flex items-start gap-3 ${formatoImpresion === 'carta' ? 'bg-blue-100' : ''}`}>
                  <span className="text-2xl">📄</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Carta Entera</p>
                    <p className="text-xs text-gray-500">8.5 × 11 pulgadas</p>
                  </div>
                  {formatoImpresion === 'carta' && <span className="text-blue-600 font-bold">✓</span>}
                </button>
                
                <button onClick={() => cambiarFormato('media')}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b text-sm flex items-start gap-3 ${formatoImpresion === 'media' ? 'bg-blue-100' : ''}`}>
                  <span className="text-2xl">📋</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Media Carta</p>
                    <p className="text-xs text-gray-500">5.5 × 8.5 pulgadas</p>
                  </div>
                  {formatoImpresion === 'media' && <span className="text-blue-600 font-bold">✓</span>}
                </button>
                
                <button onClick={() => cambiarFormato('pos')}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 text-sm flex items-start gap-3 ${formatoImpresion === 'pos' ? 'bg-blue-100' : ''}`}>
                  <span className="text-2xl">🧾</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Punto de Venta</p>
                    <p className="text-xs text-gray-500">Térmica 80mm</p>
                  </div>
                  {formatoImpresion === 'pos' && <span className="text-blue-600 font-bold">✓</span>}
                </button>
              </div>
            </>
      )}
        </div>
        )}
      </div>

      {/* Contenido por tab */}
      {tab === 'zona' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Zona</h3>
          <div className="flex gap-4 items-end mb-6">
            <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <div className="relative">
                <input
                  id="zona-buscar-input"
                  type="text"
                  placeholder="🔍 Buscar zona..."
                  autoComplete="off"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                  onChange={e => {
                    setZonaSeleccionada('')
                    const val = e.target.value.toLowerCase()
                    const list = document.getElementById('zona-buscar-list')
                    list.innerHTML = ''
                    if (val) {
                      const filtrados = zonas.filter(z => z.nombre.toLowerCase().includes(val)).slice(0, 10)
                      filtrados.forEach(z => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = z.nombre
                        div.onmousedown = () => {
                          document.getElementById('zona-buscar-input').value = z.nombre
                          setZonaSeleccionada(z.id)
                          list.innerHTML = ''
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
  onKeyDown={e => {
                    const list = document.getElementById('zona-buscar-list')
                    const opciones = list.querySelectorAll('div')
                    if (opciones.length === 0) {
                      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-reporte')?.click() }
                      return
                    }
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
                      if (idx >= 0) {
                        opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                        setTimeout(() => document.getElementById('btn-buscar-reporte')?.click(), 100)
                      } else {
                        document.getElementById('btn-buscar-reporte')?.click()
                      }
                    }
                  }}
                  onBlur={() => setTimeout(() => { const el = document.getElementById('zona-buscar-list'); if (el) el.innerHTML = '' }, 200)}
                />
                <div id="zona-buscar-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
            </div>
 
  </div>
         {(facturasZona.length > 0 || conducesZona.length > 0) && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
         {[...facturasZona.map(x => ({ ...x, _tipo: 'fac' })), ...conducesZona.map(x => ({ ...x, _tipo: 'cd' }))]
                  .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                  .map(item => item._tipo === 'fac' ? (f => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
<td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString()}{parseFloat(f.nc_aplicada) > 0 && <span className="text-xs text-red-500 ml-1">(NC)</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
          ))(item) : (cd => {
                  const abonadoCdz = pagosCd.filter(p => p.conduce_id === cd.id && (p.estado === 'confirmado' || !p.estado)).reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const totalCdz = parseFloat(cd.total || 0)
                  const pagadoCdz = abonadoCdz >= totalCdz - 0.01 && totalCdz > 0
                  return (
                  <tr key={'cdz-' + cd.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{cd.numero || 'CD'} <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold">CONDUCE</span></td>
                    <td className="px-4 py-3">{cd.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${totalCdz.toLocaleString()}{abonadoCdz > 0 && !pagadoCdz && <span className="text-xs text-green-600 ml-1">(Abonado: RD${abonadoCdz.toLocaleString('es-DO',{minimumFractionDigits:2})})</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${pagadoCdz ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{pagadoCdz ? 'PAGADA' : 'CONDUCE'}</span></td>
                    <td className="px-4 py-3">{new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
     </tr>
                  )
                })(item))}
              </tbody>
            </table>
          )}
     {resumenZona && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenZona.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenZona.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas con NCF: <span className="font-medium">RD${resumenZona.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas por Conduce: <span className="font-medium">RD${parseFloat(resumenZona.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">TOTAL GENERAL: RD${(parseFloat(resumenZona.total_ventas) + parseFloat(resumenZona.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'producto' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Producto</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <div className="relative">
                <input
                  id="prod-vendedor-input"
                  type="text"
                  placeholder="🔍 Buscar vendedor..."
                  autoComplete="off"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                  onChange={e => {
                    document.getElementById('prod-vendedor').value = ''
                    const val = e.target.value.toLowerCase()
                    const list = document.getElementById('prod-vendedor-list')
                    list.innerHTML = ''
                    if (val) {
                      const filtrados = vendedores.filter(v => v.nombre.toLowerCase().includes(val)).slice(0, 10)
                      filtrados.forEach(v => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = v.nombre
                        div.onmousedown = () => {
                          document.getElementById('prod-vendedor-input').value = v.nombre
                          document.getElementById('prod-vendedor').value = v.id
                          list.innerHTML = ''
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
       onKeyDown={e => {
                    const list = document.getElementById('prod-vendedor-list')
                    const opciones = list.querySelectorAll('div')
                    if (opciones.length === 0) {
                      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('prod-cliente-input')?.focus() }
                      return
                    }
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
                      if (idx >= 0) {
                        opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                        setTimeout(() => document.getElementById('prod-cliente-input')?.focus(), 100)
                      } else {
                        document.getElementById('prod-cliente-input')?.focus()
                      }
                    }
                  }}
                 onBlur={() => setTimeout(() => { const el = document.getElementById('prod-vendedor-list'); if (el) el.innerHTML = '' }, 200)}
                />
                <input type="hidden" id="prod-vendedor" value="" />
                <div id="prod-vendedor-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                id="prod-cliente-input"
                type="text"
                placeholder="🔍 Buscar cliente..."
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
          onChange={e => {
                  document.getElementById('prod-cliente').value = ''
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('prod-cliente-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(c => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = c.nombre
                      div.onmousedown = () => {
                        document.getElementById('prod-cliente-input').value = c.nombre
                        document.getElementById('prod-cliente').value = c.id
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
onKeyDown={e => {
                  const list = document.getElementById('prod-cliente-list')
                  const opciones = list.querySelectorAll('div')
                  if (opciones.length === 0) {
                    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('prod-producto-input')?.focus() }
                    return
                  }
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
                    if (idx >= 0) {
                      opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      setTimeout(() => document.getElementById('prod-producto-input')?.focus(), 100)
                    } else {
                      document.getElementById('prod-producto-input')?.focus()
                    }
                  }
                }}
                onBlur={() => setTimeout(() => { const el = document.getElementById('prod-cliente-list'); if (el) el.innerHTML = '' }, 200)}
              />
              <input type="hidden" id="prod-cliente" value="" />
              <div id="prod-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
              <input
                id="prod-producto-input"
                type="text"
                placeholder="-- Todos --"
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                onChange={e => {
                  document.getElementById('prod-producto').value = e.target.value
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('prod-producto-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(p => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = p.nombre
                      div.onmousedown = () => {
                        document.getElementById('prod-producto-input').value = p.nombre
                        document.getElementById('prod-producto').value = p.nombre
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
onKeyDown={e => {
                  const list = document.getElementById('prod-producto-list')
                  const opciones = list.querySelectorAll('div')
                  if (opciones.length === 0) {
                    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-reporte')?.click() }
                    return
                  }
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
                    if (idx >= 0) {
                      opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      setTimeout(() => document.getElementById('btn-buscar-reporte')?.click(), 100)
                    } else {
                      document.getElementById('btn-buscar-reporte')?.click()
                    }
                  }
                }}
                onBlur={() => setTimeout(() => { const el = document.getElementById('prod-producto-list'); if (el) el.innerHTML = '' }, 200)}
              />
              <input type="hidden" id="prod-producto" value="" />
              <div id="prod-producto-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
  
            {productosReporte.length > 0 && (
              <button onClick={() => {
                const vendedorNombre = vendedores.find(v => v.id === document.getElementById('prod-vendedor').value)?.nombre || 'Todos'
                const clienteNombre = clientes.find(c => c.id === document.getElementById('prod-cliente').value)?.nombre || 'Todos'
                const printW = window.open('', '_blank')
                const filas = productosReporte.map(p => `
                  <tr>
                    <td>${p.descripcion}</td>
                    <td style="text-align:right">${parseFloat(p.total_cantidad).toFixed(0)}</td>
                    <td style="text-align:right">RD$${parseFloat(p.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right">RD$${parseFloat(p.total_subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right">RD$${parseFloat(p.total_costo).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td style="text-align:right;color:#16a34a;font-weight:bold">RD$${parseFloat(p.beneficio).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                  </tr>`).join('')
                const totalVenta = productosReporte.reduce((s, p) => s + parseFloat(p.total_venta||0), 0)
                const totalCosto = productosReporte.reduce((s, p) => s + parseFloat(p.total_costo||0), 0)
                const totalBeneficio = productosReporte.reduce((s, p) => s + parseFloat(p.beneficio||0), 0)
                printW.document.write(`
                  <!DOCTYPE html><html><head><title>Reporte por Producto</title>
                  <style>
                    body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                    h2{color:#1e40af;margin-bottom:4px}
                    p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
                    th{background:#1e40af;color:white;padding:8px;text-align:left}
                    td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                    tr:nth-child(even){background:#f8fafc}
                    .resumen{background:#f1f5f9;border-radius:8px;padding:16px;max-width:340px;margin-left:auto}
                    .resumen-fila{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #e2e8f0}
                    .resumen-fila.total{font-weight:bold;font-size:15px;color:#1e40af;border-bottom:none;padding-top:10px}
                    .resumen-fila.beneficio{font-weight:bold;font-size:14px;color:#16a34a;border-bottom:none}
                    @media print{button{display:none}}
                  </style></head><body>
                  <h2>Reporte de Venta por Producto</h2>
                  <p class="sub">Período: ${fechaInicio||'Inicio'} al ${fechaFin||'Hoy'} | Vendedor: ${vendedorNombre} | Cliente: ${clienteNombre}</p>
                  <table>
                    <thead><tr>
                      <th>Producto</th>
                      <th style="text-align:right">Cant.</th>
                      <th style="text-align:right">P. Unit</th>
                      <th style="text-align:right">Subtotal</th>
                      <th style="text-align:right">Costo</th>
                      <th style="text-align:right">Beneficio</th>
                    </tr></thead>
                    <tbody>${filas}</tbody>
                  </table>
                  <div class="resumen">
                    <div class="resumen-fila total"><span>Total Ventas:</span><span>RD$${totalVenta.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila"><span>Total Costo:</span><span>RD$${totalCosto.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                    <div class="resumen-fila beneficio"><span>Beneficio Neto:</span><span>RD$${totalBeneficio.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                  </div>
                  <script>window.onload=()=>window.print()</script>
                  </body></html>`)
                printW.document.close()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              🖨️ Imprimir Reporte
            </button>
            )}
          </div>
          {productosReporte.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-right text-gray-600">Cant.</th>
                  <th className="px-4 py-3 text-right text-gray-600">P. Unit</th>
                  <th className="px-4 py-3 text-right text-gray-600">Subtotal</th>
                  <th className="px-4 py-3 text-right text-gray-600">Costo</th>
                  <th className="px-4 py-3 text-right text-gray-600 text-green-700">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {productosReporte.map((p, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{p.descripcion}</td>
                    <td className="px-4 py-3 text-right">{parseFloat(p.total_cantidad).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.precio_unitario).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.total_subtotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(p.total_costo).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">RD${parseFloat(p.beneficio).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'vendedor' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Vendedor</h3>
          <div className="flex gap-4 items-end mb-6">
         <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <input
                id="vend-vendedor-input"
                type="text"
                placeholder="🔍 Buscar vendedor..."
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64 w-full"
                onChange={e => {
                  setVendedorSeleccionado('')
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('vend-vendedor-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = vendedores.filter(v => v.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(v => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = v.nombre
                      div.onmousedown = () => {
                        document.getElementById('vend-vendedor-input').value = v.nombre
                        setVendedorSeleccionado(v.id)
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
   onKeyDown={e => {
                  const list = document.getElementById('vend-vendedor-list')
                  const opciones = list.querySelectorAll('div')
                  if (opciones.length === 0) {
                    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-reporte')?.click() }
                    return
                  }
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
                    if (idx >= 0) {
                      opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      setTimeout(() => document.getElementById('btn-buscar-reporte')?.click(), 100)
                    } else {
                      document.getElementById('btn-buscar-reporte')?.click()
                    }
                  }
                }}
               onBlur={() => setTimeout(() => { const el = document.getElementById('vend-vendedor-list'); if (el) el.innerHTML = '' }, 200)}
              />
              <div id="vend-vendedor-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
      
    </div>
          {facturasVendedor.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
       {[...facturasVendedor.map(x => ({ ...x, _tipo: 'fac' })), ...conducesVendedor.map(x => ({ ...x, _tipo: 'cd' }))]
                  .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                  .map(item => item._tipo === 'fac' ? (f => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                    <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString()}{parseFloat(f.nc_aplicada) > 0 && <span className="text-xs text-red-500 ml-1">(NC)</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
           </tr>
                ))(item) : (cd => {
                  const abonadoCdv = pagosCd.filter(p => p.conduce_id === cd.id && (p.estado === 'confirmado' || !p.estado)).reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const totalCdv = parseFloat(cd.total || 0)
                  const pagadoCdv = abonadoCdv >= totalCdv - 0.01 && totalCdv > 0
                  return (
                  <tr key={'cdv-' + cd.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{cd.numero || 'CD'} <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold">CONDUCE</span></td>
                    <td className="px-4 py-3">{cd.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3">RD${totalCdv.toLocaleString()}{abonadoCdv > 0 && !pagadoCdv && <span className="text-xs text-green-600 ml-1">(Abonado: RD${abonadoCdv.toLocaleString('es-DO',{minimumFractionDigits:2})})</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${pagadoCdv ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{pagadoCdv ? 'PAGADA' : 'CONDUCE'}</span></td>
           <td className="px-4 py-3">{new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                  )
                })(item))}
              </tbody>
            </table>
          )}
          {resumenVendedor && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenVendedor.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenVendedor.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas con NCF: <span className="font-medium">RD${resumenVendedor.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas por Conduce: <span className="font-medium">RD${parseFloat(resumenVendedor.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">TOTAL GENERAL: RD${(parseFloat(resumenVendedor.total_ventas) + parseFloat(resumenVendedor.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'cliente' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Venta por Cliente</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                id="cli-cliente-input"
                type="text"
                placeholder="🔍 Buscar cliente..."
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64 w-full"
                onChange={e => {
                  document.getElementById('cli-cliente').value = ''
                  const val = e.target.value.toLowerCase()
                  const list = document.getElementById('cli-cliente-list')
                  list.innerHTML = ''
                  if (val) {
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                    filtrados.forEach(c => {
                      const div = document.createElement('div')
                      div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                      div.textContent = c.nombre
                      div.onmousedown = () => {
                        document.getElementById('cli-cliente-input').value = c.nombre
                        document.getElementById('cli-cliente').value = c.id
                        list.innerHTML = ''
                      }
                      list.appendChild(div)
                    })
                  }
                }}
onKeyDown={e => {
                  const list = document.getElementById('cli-cliente-list')
                  const opciones = list.querySelectorAll('div')
                  if (opciones.length === 0) {
                    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-reporte')?.click() }
                    return
                  }
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
                    if (idx >= 0) {
                      opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                      setTimeout(() => document.getElementById('btn-buscar-reporte')?.click(), 100)
                    } else {
                      document.getElementById('btn-buscar-reporte')?.click()
                    }
                  }
                }}
               onBlur={() => setTimeout(() => { const el = document.getElementById('cli-cliente-list'); if (el) el.innerHTML = '' }, 200)}
              />
              <input type="hidden" id="cli-cliente" value="" />
   <div id="cli-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
          </div>
          {(facturasCliente.length > 0 || conducesCliente.length > 0) && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
 {[...facturasCliente.map(x => ({ ...x, _tipo: 'fac' })), ...conducesCliente.map(x => ({ ...x, _tipo: 'cd' }))]
                  .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                  .map(item => item._tipo === 'fac' ? (() => { const f = item; return (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                    <td className="px-4 py-3">RD${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString()}{parseFloat(f.nc_aplicada) > 0 && <span className="text-xs text-red-500 ml-1">(NC)</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                    <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                ) })() : (cd => {
                  const abonadoCdc = pagosCd.filter(p => p.conduce_id === cd.id && (p.estado === 'confirmado' || !p.estado)).reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const totalCdc = parseFloat(cd.total || 0)
                  const pagadoCdc = abonadoCdc >= totalCdc - 0.01 && totalCdc > 0
                  return (
                  <tr key={'cdc-' + cd.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{cd.numero || 'CD'} <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold">CONDUCE</span></td>
                    <td className="px-4 py-3">RD${totalCdc.toLocaleString()}{abonadoCdc > 0 && !pagadoCdc && <span className="text-xs text-green-600 ml-1">(Abonado: RD${abonadoCdc.toLocaleString('es-DO',{minimumFractionDigits:2})})</span>}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${pagadoCdc ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{pagadoCdc ? 'PAGADA' : 'CONDUCE'}</span></td>
           <td className="px-4 py-3">{new Date(cd.creado_en).toLocaleDateString('es-DO')}</td>
                  </tr>
                  )
                })(item))}
              </tbody>
            </table>
          )}
          {resumenCliente && (
            <div className="flex justify-end mt-4">
              <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">Subtotal: <span className="font-medium">RD${resumenCliente.total_subtotal.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">ITBIS: <span className="font-medium">RD${resumenCliente.total_itbis.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas con NCF: <span className="font-medium">RD${resumenCliente.total_ventas.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-gray-600">Ventas por Conduce: <span className="font-medium">RD${parseFloat(resumenCliente.total_conduces || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                <p className="text-lg font-bold text-gray-800">TOTAL GENERAL: RD${(parseFloat(resumenCliente.total_ventas) + parseFloat(resumenCliente.total_conduces || 0)).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'chofer' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Entregada Chofer</h3>
          <div className="flex gap-3 items-end mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura (NCF)</label>
              <input
                id="chofer-ncf-input"
                type="text"
                placeholder="Ej: B0100000001"
                autoComplete="off"
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 uppercase"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = e.target.value.trim().toUpperCase()
                    if (!val) return
                  if (!val) return
                    const cdCh = conducesVenta.find(c => (c.numero || '').toUpperCase() === val && !c.facturado && c.estado === 'emitido')
                    const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val) || (cdCh ? { ...cdCh, ncf: cdCh.numero, es_conduce: true } : null)
                    if (!factura) { alert('Documento no encontrado: ' + val); return }
                    if (facturasChofer.find(f => f.id === factura.id)) { alert('Ya está en la lista'); e.target.value = ''; return }
                    setFacturasChofer(prev => [...prev, factura])
                    e.target.value = ''
                  }
                }}
              />
            </div>
    <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Chofer</label>
              <div className="relative">
                <input
                  id="chofer-buscar-input"
                  type="text"
                  placeholder="🔍 Buscar chofer..."
                  autoComplete="off"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                  onChange={e => {
                    setChoferSeleccionado('')
                    setFacturasChofer([])
                    const val = e.target.value.toLowerCase()
                    const list = document.getElementById('chofer-buscar-list')
                    list.innerHTML = ''
                    if (val) {
                      const filtrados = choferesLista.filter(c => c.nombre.toLowerCase().includes(val)).slice(0, 10)
                      filtrados.forEach(c => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = c.nombre
                        div.onmousedown = () => {
                          document.getElementById('chofer-buscar-input').value = c.nombre
                          setChoferSeleccionado(c.id)
                          list.innerHTML = ''
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
                  onKeyDown={e => {
                    const list = document.getElementById('chofer-buscar-list')
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
                  onBlur={() => setTimeout(() => { const el = document.getElementById('chofer-buscar-list'); if (el) el.innerHTML = '' }, 200)}
                />
                <div id="chofer-buscar-list" className="absolute z-50 w-56 bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              onClick={async () => {
                const input = document.getElementById('chofer-ncf-input')
                const val = input.value.trim().toUpperCase()
                if (!val) return
                if (!choferSeleccionado) { alert('Debe seleccionar un chofer'); return }
          const cdCh2 = conducesVenta.find(c => (c.numero || '').toUpperCase() === val && !c.facturado && c.estado === 'emitido')
                const factura = facturas.find(f => (f.ncf || '').toUpperCase() === val) || (cdCh2 ? { ...cdCh2, ncf: cdCh2.numero, es_conduce: true } : null)
                if (!factura) { alert('Documento no encontrado: ' + val); return }
                if (facturasChofer.find(f => f.id === factura.id)) { alert('Ya está en la lista'); input.value = ''; return }
                try {
                  await API.put(`${factura.es_conduce ? '/conduces' : '/invoices'}/${factura.id}/asignar-chofer`, { chofer_id: choferSeleccionado })
                  setFacturasChofer(prev => [...prev, factura])
                  input.value = ''
                  input.focus()
                } catch (err) {
                  alert('Error al asignar chofer: ' + (err.response?.data?.mensaje || err.message))
                }
              }}>
              Agregar
            </button>
            {facturasChofer.length > 0 && (
              <>
                <button onClick={() => {
                  const printW = window.open('', '_blank')
                  const filas = facturasChofer.map(f => `
                    <tr>
                      <td>${f.ncf || 'BORRADOR'}</td>
                      <td>${f.cliente_nombre || 'Consumidor Final'}</td>
                      <td style="text-align:right">RD$${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    </tr>`).join('')
                  const totalGeneral = facturasChofer.reduce((s, f) => s + parseFloat(f.total || 0), 0)
                  printW.document.write(`
                    <!DOCTYPE html><html><head><title>Relación Chofer</title>
                    <style>
                      body{font-family:Arial,sans-serif;padding:20px;color:#1e293b}
                      h2{color:#1e40af;margin-bottom:4px}
                      p.sub{color:#64748b;font-size:13px;margin-bottom:16px}
                      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
                      th{background:#1e40af;color:white;padding:8px;text-align:left}
                      td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                      tr:nth-child(even){background:#f8fafc}
                      .total-row{font-weight:bold;background:#f1f5f9}
                      @media print{button{display:none}}
                    </style></head><body>
                    <h2>Relación de Entregas - Chofer: ${(choferesLista.find(c => c.id === choferSeleccionado) || {}).nombre || ''}</h2>
                    <p class="sub">Fecha: ${new Date().toLocaleDateString('es-DO')} — Total facturas: ${facturasChofer.length}</p>
                    <table>
                      <thead><tr><th>NCF</th><th>Cliente</th><th style="text-align:right">Total</th></tr></thead>
                      <tbody>
                        ${filas}
                        <tr class="total-row">
                          <td colspan="2">TOTAL GENERAL</td>
                          <td style="text-align:right">RD$${totalGeneral.toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        </tr>
                      </tbody>
                    </table>
                    <script>window.onload=()=>window.print()</script>
                    </body></html>`)
                  printW.document.close()
                }}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                  🖨️ Imprimir Relación
                </button>
                <button onClick={() => setFacturasChofer([])}
                  className="border border-red-300 text-red-500 px-4 py-2 rounded text-sm hover:bg-red-50">
                  🗑️ Limpiar
                </button>
              </>
            )}
          </div>
          {facturasChofer.length > 0 && (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
            <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                    <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-center text-gray-600">PDF</th>
                    <th className="px-4 py-3 text-center text-gray-600">Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasChofer.map(f => (
                    <tr key={f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                      <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3 text-right font-medium">RD${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handlePDF(f.id)}
                          className="text-blue-600 hover:underline text-xs font-medium">PDF</button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setFacturasChofer(prev => prev.filter(x => x.id !== f.id))}
                          className="text-red-500 hover:text-red-700 font-bold text-lg">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-bold text-gray-800">
                    Total General: RD${facturasChofer.reduce((s, f) => s + parseFloat(f.total || 0), 0).toLocaleString('es-DO',{minimumFractionDigits:2})}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{facturasChofer.length} factura(s)</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'relacion_vendedor' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Relación Vendedor</h3>
          <div className="flex gap-4 items-end mb-6 flex-wrap">
            <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <div className="relative">
                <input
                  id="rel-vendedor-input"
                  type="text"
                  placeholder="🔍 Buscar vendedor..."
                  autoComplete="off"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 w-full"
                  onChange={e => {
                    document.getElementById('rel-vendedor').value = ''
                    const val = e.target.value.toLowerCase()
                    const list = document.getElementById('rel-vendedor-list')
                    list.innerHTML = ''
                    if (val) {
                      const filtrados = vendedores.filter(v => v.nombre.toLowerCase().includes(val)).slice(0, 10)
                      filtrados.forEach(v => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = v.nombre
                        div.onmousedown = () => {
                          document.getElementById('rel-vendedor-input').value = v.nombre
                          document.getElementById('rel-vendedor').value = v.id
                          list.innerHTML = ''
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
    onKeyDown={e => {
                    const list = document.getElementById('rel-vendedor-list')
                    const opciones = list.querySelectorAll('div')
                if (opciones.length === 0) {
                      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-reporte')?.click() }
                      return
                    }
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
                      if (idx >= 0) {
                        opciones[idx].dispatchEvent(new MouseEvent('mousedown'))
                        setTimeout(() => document.getElementById('btn-buscar-reporte')?.click(), 100)
                      } else {
                        document.getElementById('btn-buscar-reporte')?.click()
                      }
                    }
                  }}
                 onBlur={() => setTimeout(() => { const el = document.getElementById('rel-vendedor-list'); if (el) el.innerHTML = '' }, 200)}
                />
                <input type="hidden" id="rel-vendedor" value="" />
                <div id="rel-vendedor-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
            </div>

        
          </div>
          {relacionVendedor.length > 0 && (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600">NCF</th>
                    <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-right text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
{relacionVendedor.map(f => (
                    <tr key={f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                      <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3 text-right font-medium">RD${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}{parseFloat(f.nc_aplicada) > 0 && <span className="text-xs text-red-500 ml-1">(NC)</span>}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>{f.estado.toUpperCase()}</span></td>
                      <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString('es-DO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <div className="text-sm text-right bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-bold text-gray-800">
                  Total General: RD${relacionVendedor.filter(f => f.estado === 'emitida').reduce((s, f) => s + parseFloat(f.total_neto != null ? f.total_neto : f.total || 0), 0).toLocaleString('es-DO',{minimumFractionDigits:2})}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{relacionVendedor.length} factura(s) — {relacionVendedor.filter(f => f.estado === 'emitida').length} emitida(s)</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'pedidos' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Pedidos</h3>
          {!showPedido ? (
            <button onClick={() => setShowPedido(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 mb-4">
              + Nuevo Pedido
            </button>
          ) : (
          <div className="mb-6 border rounded-lg p-4 form-nuevo-pedido">
             <h4 className="font-medium mb-3 text-gray-700">Nuevo Pedido</h4>
    
      
              <div className="relative mb-4 max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input type="text" placeholder="Buscar cliente..." id="ped-cliente-input" autoComplete="off"
                  ref={pedClienteInputRef}
                  className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => {
                    document.getElementById('ped-cliente').value = ''
                    setPedClienteSeleccionadoId('')
             const val = e.target.value.toLowerCase()
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val) && (!vendedor_id || c.vendedor_id === vendedor_id)).slice(0,10)
                    setPedClienteFiltrados(filtrados)
                    setPedClienteIndex(-1)
                    const list = document.getElementById('ped-cliente-list')
                    list.innerHTML = ''
                    if (val) {
                      filtrados.forEach((c, idx) => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.textContent = c.nombre
                        div.onmousedown = () => {
                          document.getElementById('ped-cliente-input').value = c.nombre
                          document.getElementById('ped-cliente').value = c.id
                          setPedClienteSeleccionadoId(c.id)
                          list.innerHTML = ''
                          setPedClienteIndex(-1)
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
                  onKeyDown={e => {
                    const list = document.getElementById('ped-cliente-list')
                    if (e.key === 'Enter' && !list.children.length) {
                      e.preventDefault()
                      setTimeout(() => pedProductoRefs.current[0]?.focus(), 100)
                      return
                    }
                    if (!list.children.length) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      const newIdx = Math.min(pedClienteIndex + 1, pedClienteFiltrados.length - 1)
                      setPedClienteIndex(newIdx)
                      Array.from(list.children).forEach((el, i) => el.style.background = i === newIdx ? '#BFDBFE' : '')
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      const newIdx = Math.max(pedClienteIndex - 1, 0)
                      setPedClienteIndex(newIdx)
                      Array.from(list.children).forEach((el, i) => el.style.background = i === newIdx ? '#BFDBFE' : '')
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (pedClienteIndex >= 0 && pedClienteFiltrados[pedClienteIndex]) {
                        const c = pedClienteFiltrados[pedClienteIndex]
                        document.getElementById('ped-cliente-input').value = c.nombre
                        document.getElementById('ped-cliente').value = c.id
                        setPedClienteSeleccionadoId(c.id)
                        list.innerHTML = ''
                        setPedClienteIndex(-1)
                      }
                      setTimeout(() => pedProductoRefs.current[0]?.focus(), 100)
                    } else if (e.key === 'Escape') {
                      list.innerHTML = ''
                      setPedClienteIndex(-1)
                    }
                  }}
                 onBlur={() => setTimeout(() => { const el = document.getElementById('ped-cliente-list'); if (el) el.innerHTML = ''; setPedClienteIndex(-1) }, 200)}
                />
             <input type="hidden" id="ped-cliente" value="" />
                <div id="ped-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>

              {/* Ticket en vivo del Pedido (mismo formato que Nueva Factura) */}
              <div className="pos-ticket">
                <div className="pos-ticket-empresa">{usuarioSesion.empresa || ''}</div>
                <div className="pos-ticket-cliente">
                  Cliente: {(clientes.find(c => String(c.id) === String(pedClienteSeleccionadoId))?.nombre) || 'Consumidor Final'}
                </div>
                <div className="pos-ticket-divider"></div>
                <div className="pos-ticket-cols"><span>DESCRIPCION</span><span>VALOR</span></div>
                <div className="pos-ticket-divider"></div>
                {itemsPed.map((it, i) => (
                  (it.descripcion || it.precio_unitario) ? (
                    <div key={i} className="pos-ticket-linea">
                      <div className="pos-ticket-fila">
                        <div className="pos-ticket-desc">{it.descripcion}</div>
            <button type="button" className="pos-ticket-eliminar"
                          onClick={() => {
                            if (!window.confirm('¿Eliminar "' + it.descripcion + '" del ticket?')) return
                            if (itemsPed.length > 1) {
                              setItemsPed(prev => prev.filter((_, xi) => xi !== i))
                              setBuscarProductoPed(prev => {
                                const nuevo = {}
                                Object.keys(prev).forEach(k => {
                                  const idx = parseInt(k)
                                  if (idx < i) nuevo[idx] = prev[k]
                                  else if (idx > i) nuevo[idx - 1] = prev[k]
                                })
                                return nuevo
                              })
                            } else {
                              setItemsPed([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
                              setBuscarProductoPed({})
                            }
                          }}>✕</button>
                      </div>
                      <div className="pos-ticket-detalle">
                        <span>
                      <input type="number" min="0.01" step="any" value={it.cantidad}
                            onChange={e => setItemsPed(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: e.target.value } : x))}
                            className="pos-ticket-cantidad" />
                          {' x '}
                          <input type="number" min="0" step="any" value={it.precio_unitario}
                            onChange={e => setItemsPed(prev => prev.map((x, xi) => xi === i ? { ...x, precio_unitario: e.target.value } : x))}
                            className="pos-ticket-precio" />
                        </span>
                        <span>{(parseFloat(it.cantidad || 0) * parseFloat(it.precio_unitario || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ) : null
                ))}
                {itemsPed.filter(it => it.descripcion || it.precio_unitario).length === 0 && (
                  <div className="pos-ticket-vacio">Agregue artículos abajo</div>
                )}
                <div className="pos-ticket-divider"></div>
                {(() => {
                  let subPed = 0, itbPed = 0
                  itemsPed.forEach(it => {
                    const bruto = parseFloat(it.cantidad || 0) * parseFloat(it.precio_unitario || 0)
                    const base = bruto / (1 + (parseFloat(it.itbis_rate || 0) / 100))
                    subPed += base
                    itbPed += bruto - base
                  })
                  return <>
                    <div className="pos-ticket-tot"><span>SUBTOTAL</span><span>{subPed.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-tot"><span>ITBIS</span><span>{itbPed.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-total"><span>TOTAL A PAGAR</span><span>RD${(subPed + itbPed).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                  </>
                })()}
              </div>

              {itemsPed.map((item, index) => (
             <div key={index} className={index !== itemsPed.length - 1 ? "hidden" : "border rounded-lg p-3 mb-3 bg-gray-50"}>
                  {/* Búsqueda de producto */}
                  <div className="relative mb-2">
                    <input type="text" placeholder="🔍 Buscar Articulo..."
                      ref={el => pedProductoRefs.current[index] = el}
                      value={buscarProductoPed[index] || ''}
                      onChange={e => {
                        setBuscarProductoPed(prev => ({...prev, [index]: e.target.value}))
                        setDropdownPed(prev => ({...prev, [index]: e.target.value.length > 0}))
                        setPedProductoIndex(prev => ({...prev, [index]: -1}))
                      }}
                      onBlur={() => setTimeout(() => { setDropdownPed(prev => ({...prev, [index]: false})); setPedProductoIndex(prev => ({...prev, [index]: -1})) }, 200)}
                      onKeyDown={e => {
                        const filtrados = productos.filter(p => p.nombre.toLowerCase().includes((buscarProductoPed[index]||'').toLowerCase()))
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setPedProductoIndex(prev => ({...prev, [index]: Math.min((prev[index]??-1)+1, filtrados.length-1)}))
                          setDropdownPed(prev => ({...prev, [index]: true}))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setPedProductoIndex(prev => ({...prev, [index]: Math.max((prev[index]??0)-1, -1)}))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          const idx = pedProductoIndex[index] ?? -1
                          if (idx >= 0 && filtrados[idx]) {
                            const p = filtrados[idx]
                            setItemsPed(prev => prev.map((it, i) => i === index ? {...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : it))
                            setBuscarProductoPed(prev => ({...prev, [index]: p.nombre}))
                            setDropdownPed(prev => ({...prev, [index]: false}))
                            setPedProductoIndex(prev => ({...prev, [index]: -1}))
                          }
                          setTimeout(() => pedCantidadRefs.current[index]?.focus(), 100)
                        } else if (e.key === 'Escape') {
                          setDropdownPed(prev => ({...prev, [index]: false}))
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    {dropdownPed[index] && (
                      <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                        {productos.filter(p => p.nombre.toLowerCase().includes((buscarProductoPed[index]||'').toLowerCase())).map((p, pidx) => (
                          <div key={p.id} className={`px-3 py-2 text-sm cursor-pointer ${(pedProductoIndex[index]??-1) === pidx ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                            onMouseDown={() => {
                              setItemsPed(prev => prev.map((it, i) => i === index ? {...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : it))
                              setBuscarProductoPed(prev => ({...prev, [index]: p.nombre}))
                              setDropdownPed(prev => ({...prev, [index]: false}))
                              setTimeout(() => pedCantidadRefs.current[index]?.focus(), 100)
                            }}>
                            {p.nombre} — RD${parseFloat(p.precio).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Descripción */}
<input placeholder="Descripción" value={item.descripcion}
                    readOnly={!!item.product_id}
                    onChange={e => setItemsPed(prev => prev.map((it,i) => i===index ? {...it, descripcion: e.target.value} : it))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.product_id ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'}`} />
                  {/* Cant, Precio, ITBIS en fila */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                      <input type="number" placeholder="1" value={item.cantidad} min="1"
                        ref={el => pedCantidadRefs.current[index] = el}
                        onChange={e => setItemsPed(prev => prev.map((it,i) => i===index ? {...it, cantidad: e.target.value} : it))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); pedPrecioRefs.current[index]?.focus() } }}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Precio</label>
                  <input type="number" placeholder="0.00" value={item.precio_unitario}
                        ref={el => pedPrecioRefs.current[index] = el}
                        onChange={e => setItemsPed(prev => prev.map((it,i) => i===index ? {...it, precio_unitario: e.target.value} : it))}
                        onBlur={e => {
                          if (item.product_id && e.target.value !== '') {
                            const prod = productos.find(p => p.id === item.product_id)
                            if (prod && parseFloat(e.target.value) < parseFloat(prod.precio)) {
                              alert(`⚠️ El precio no puede ser menor al precio de venta del artículo: RD$${parseFloat(prod.precio).toLocaleString('es-DO', {minimumFractionDigits: 2})}`)
                              setItemsPed(prev => prev.map((it,i) => i===index ? {...it, precio_unitario: prod.precio} : it))
                            }
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const nextIndex = index + 1
                            if (pedProductoRefs.current[nextIndex]) {
                              pedProductoRefs.current[nextIndex]?.focus()
                            } else {
                              pedAgregarRef.current?.focus()
                            }
                          }
                        }}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ITBIS</label>
                      <select value={item.itbis_rate}
                        onChange={e => setItemsPed(prev => prev.map((it,i) => i===index ? {...it, itbis_rate: e.target.value} : it))}
                        className="w-full border rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="18">18%</option>
                        <option value="16">16%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>
                  </div>
                  {/* Subtotal y eliminar */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Subtotal:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-700 text-sm">
                        {item.precio_unitario && item.cantidad ? 'RD$' + (parseFloat(item.cantidad||0)*parseFloat(item.precio_unitario||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : 'RD$0.00'}
                      </span>
                      {itemsPed.length > 1 && (
                        <button onClick={() => {
                          setItemsPed(prev => prev.filter((_,i) => i !== index))
                          const reindexarPed = (obj) => {
                            const nuevo = {}
                            Object.keys(obj).forEach(k => {
                              const i = parseInt(k)
                              if (i < index) nuevo[i] = obj[k]
                              else if (i > index) nuevo[i - 1] = obj[k]
                            })
                            return nuevo
                          }
                          setBuscarProductoPed(prev => reindexarPed(prev))
                        }}
                          className="bg-red-100 text-red-500 hover:bg-red-200 rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold">×</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end mb-3">
                <div className="text-sm text-right">
           {(() => {
                    let sub = 0, itb = 0
                    itemsPed.forEach(it => {
                      const bruto = parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)
                      const base = bruto / (1 + (parseFloat(it.itbis_rate||0) / 100))
                      sub += base
                      itb += bruto - base
                    })
        return <>
                      <p className="text-gray-600">Subtotal: <span className="font-medium">RD${sub.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                      <p className="text-gray-600">ITBIS: <span className="font-medium">RD${itb.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                      <p className="text-lg font-bold text-gray-800">Total: RD${(sub+itb).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                    </>
                  })()}
                </div>
              </div>
              <div className="flex gap-3">
                <button ref={pedAgregarRef} onClick={() => {
                  setItemsPed(prev => [...prev, {descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
                  setTimeout(() => pedProductoRefs.current[itemsPed.length]?.focus(), 150)
                }}
                  onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); pedGuardarRef.current?.focus() } }}
                  className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
            <button ref={pedGuardarRef} onClick={() => {
                  const customer_id = pedClienteSeleccionadoId
                  if (!customer_id) return alert('Debe seleccionar un cliente registrado de la lista para crear el pedido.')
                  const itemsChk = itemsPed.filter(i => i.descripcion && i.precio_unitario)
                  if (!itemsChk.length) return alert('Agrega al menos un producto')
                  for (const it of itemsChk) {
                    if (it.product_id) {
                      const prod = productos.find(p => p.id === it.product_id)
                      if (prod && parseFloat(it.precio_unitario) < parseFloat(prod.precio)) {
                        return alert(`El precio de "${it.descripcion}" es menor al precio de venta: RD$${parseFloat(prod.precio).toLocaleString('es-DO', {minimumFractionDigits: 2})}. Corrigelo antes de guardar.`)
                      }
                    }
                  }
                  if (pedidoEditandoId) { guardarPedidoFinal('factura'); return }
                  setMostrarTipoEntrega(true)
                }}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar Pedido</button>
                <button onClick={() => setShowPedido(false)}
                  className="px-4 py-1.5 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          )}
      
  {mostrarTipoEntrega && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                <p className="text-lg font-bold text-gray-800 mb-2">Tipo de Entrega</p>
                <p className="text-sm text-gray-500 mb-6">Como se despachara este pedido?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => guardarPedidoFinal('factura')}
                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700">
                    FACTURA
                  </button>
                  <button onClick={() => guardarPedidoFinal('conduce')}
                    className="w-full py-4 bg-teal-600 text-white rounded-lg font-bold text-base hover:bg-teal-700">
                    CONDUCE
                  </button>
                  <button onClick={() => setMostrarTipoEntrega(false)}
                    className="w-full py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
  {/* Filtro de Pedidos: solo Vendedor. El rango de fecha y Buscar son los de arriba */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end mb-4 flex-wrap">
            {!vendedor_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Vendedor</label>
                <select id="ped-vendedor-filtro"
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48">
                  <option value="">-- Todos los vendedores --</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              </div>
            )}
            {vendedor_id && (
              <input type="hidden" id="ped-vendedor-filtro" value={vendedor_id} />
            )}
          </div>

          {/* CAMBIO 2: tabla de pedidos con vista móvil (cards) y desktop */}
          {pedidos.length > 0 && (
            <>
              {/* Vista móvil - cards */}
              <div className="sm:hidden space-y-3">
                {pedidos.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400 font-mono">{p.id.slice(0,8)}...</span>
                      <span className="font-bold text-blue-700">RD${parseFloat(p.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>
                    </div>
                   <p className="text-sm font-medium text-gray-800 mb-1">{p.cliente_nombre || 'Consumidor Final'}</p>
                    <div className="mb-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${p.tipo_entrega === 'conduce' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.tipo_entrega === 'conduce' ? 'CONDUCE' : 'FACTURA'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{new Date(p.creado_en).toLocaleDateString('es-DO')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={async () => {
                        try {
                          const res = await API.get(`/invoices/${p.id}`)
                          const data = res.data.data
                          setItemsPed(data.items.map(it => ({
                            descripcion: it.descripcion,
                            cantidad: it.cantidad,
                            precio_unitario: it.precio_unitario,
                            itbis_rate: it.itbis_rate,
                            product_id: it.product_id || ''
                          })))
                          setBuscarProductoPed(data.items.reduce((acc, it, i) => ({...acc, [i]: it.descripcion}), {}))
                          setPedClienteSeleccionadoId(data.customer_id || '')
                          setPedidoEditandoId(p.id)
                          setShowPedido(true)
                          setTimeout(() => {
                            const inp = document.getElementById('ped-cliente-input')
                            if (inp) inp.value = data.cliente_nombre || ''
                            const hid = document.getElementById('ped-cliente')
                            if (hid) hid.value = data.customer_id || ''
                          }, 200)
                        } catch(e) { alert('Error al cargar pedido: ' + (e.response?.data?.mensaje || e.message)) }
                     }} className="bg-blue-600 text-white py-2.5 rounded-lg text-xs font-medium text-center leading-tight">✏️ Editar</button>
                                         {!vendedor_id && (
                      <button onClick={async () => {
                      if (!confirm('¿Convertir este pedido a factura?')) return
                        try {
                          const detPed = await API.get(`/invoices/${p.id}`)
                          const itemsPed = detPed.data.data.items || []
                          const invRes = await API.get('/inventory')
                          const invList = invRes.data.data
                      let huboAjuste = false
                          for (const it of itemsPed) {
                            if (!it.product_id) continue
                            const invItem = invList.find(v => v.product_id === it.product_id)
                      const minLista = Math.max(parseFloat(invItem?.stock_minimo || 0), parseFloat(invItem?.prod_stock_minimo || 0))
                           if (usuarioSesion?.features?.stock_negativo !== true && invItem && parseFloat(it.cantidad || 0) > parseFloat(invItem.stock_actual || 0)) {
                              const disponible = parseFloat(invItem.stock_actual || 0)
                              if (disponible <= 0) {
                                alert(`⚠️ Sin stock para "${it.descripcion}".\n\nDisponible: 0. No se puede facturar este artículo.`)
                                return
                              }
                              if (!confirm(`⚠️ Stock insuficiente para "${it.descripcion}".\n\nDisponible: ${disponible}\nSolicitado: ${parseFloat(it.cantidad || 0)}\n\n¿Desea facturar solo ${disponible}?`)) return
                              it.cantidad = disponible
                              huboAjuste = true
                            }
                            if (invItem && minLista > 0 && parseFloat(invItem.stock_actual || 0) <= minLista) {
                              alert(`⚠️ STOCK BAJO: "${it.descripcion}"\n\nQuedan ${parseFloat(invItem.stock_actual || 0)} (mínimo ${minLista}).\n\nSe convertirá a factura, pero considere reabastecer.`)
                            }
                          }
                         if (huboAjuste) {
                            await API.put(`/invoices/pedido/${p.id}/editar`, {
                              customer_id: detPed.data.data.customer_id || null,
                              items: itemsPed.map(it => ({ descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: it.precio_unitario, itbis_rate: it.itbis_rate, product_id: it.product_id || '' }))
                            })
                          }
                          await API.put(`/invoices/pedido/${p.id}/convertir`)
                          const res = await API.get('/invoices/pedidos/lista')
                          setPedidos(res.data.data)
                          fetchData()
                          alert('¡Factura emitida exitosamente!')
                       } catch(e) { alert('Error al convertir: ' + (e.response?.data?.mensaje || e.message)) }
                                         }} className="bg-green-600 text-white py-2.5 rounded-lg text-xs font-medium text-center leading-tight">Convertir</button>
                      )}
                      <button onClick={async () => {
                        if (!confirm('¿Eliminar este pedido?')) return
                        try {
                          await API.put(`/invoices/${p.id}/anular`)
                          const res = await API.get('/invoices/pedidos/lista')
                          setPedidos(res.data.data)
                        } catch(e) { alert('Error') }
                     }} className="border border-red-300 text-red-500 py-2.5 rounded-lg text-xs font-medium text-center leading-tight">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Vista desktop - tabla */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-gray-600">Entrega</th>
                    <th className="px-4 py-3 text-right text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                                         <td className="px-4 py-3">{p.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.tipo_entrega === 'conduce' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.tipo_entrega === 'conduce' ? 'CONDUCE' : 'FACTURA'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">RD${parseFloat(p.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3">{new Date(p.creado_en).toLocaleDateString('es-DO')}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={async () => {
                          try {
                       const res = await API.get(`/invoices/${p.id}`)
                            const data = res.data.data
                            let avisoStock = ''
                            try {
                              const invRes = await API.get('/inventory')
                              const invList = invRes.data.data
                              for (const it of (data.items || [])) {
                                if (!it.product_id) continue
                                const invItem = invList.find(v => v.product_id === it.product_id)
                           const minimo = Math.max(parseFloat(invItem?.stock_minimo || 0), parseFloat(invItem?.prod_stock_minimo || 0))
                           if (usuarioSesion?.features?.stock_negativo !== true && invItem && parseFloat(it.cantidad || 0) > parseFloat(invItem.stock_actual || 0)) {
                                  const disponible = parseFloat(invItem.stock_actual || 0)
                                  if (disponible <= 0) {
                                    alert(`⚠️ Sin stock para "${it.descripcion}".\n\nDisponible: 0. No se puede facturar este artículo.`)
                                    return
                                  }
                                  if (!confirm(`⚠️ Stock insuficiente para "${it.descripcion}".\n\nDisponible: ${disponible}\nSolicitado: ${parseFloat(it.cantidad || 0)}\n\n¿Desea facturar solo ${disponible}?`)) return
                                  await API.put(`/invoices/pedido/${p.id}/editar`, {
                                    customer_id: data.customer_id || null,
                                    items: (data.items || []).map(x => ({ descripcion: x.descripcion, cantidad: x.product_id === it.product_id ? disponible : x.cantidad, precio_unitario: x.precio_unitario, itbis_rate: x.itbis_rate, product_id: x.product_id || '' }))
                                  })
                       it.cantidad = disponible
                                  const resAjuste = await API.get(`/invoices/${p.id}`)
                                  data.subtotal = resAjuste.data.data.subtotal
                                  data.itbis = resAjuste.data.data.itbis
                                  data.total = resAjuste.data.data.total
                                }
                                if (invItem && minimo > 0 && parseFloat(invItem.stock_actual || 0) <= minimo) {
                                  avisoStock += `STOCK BAJO: ${it.descripcion} - quedan ${parseFloat(invItem.stock_actual || 0)} (minimo ${minimo})\n`
                                }  
                              }
                            } catch(e) {}
                            const win = window.open('', '_blank')
                            const filas = data.items.map(it => `
                              <tr>
                                <td>${it.descripcion}</td>
                                <td style="text-align:right">${parseFloat(it.cantidad).toFixed(0)}</td>
                                <td style="text-align:right">RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                                <td style="text-align:right">RD$${(parseFloat(it.cantidad)*parseFloat(it.precio_unitario)).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                              </tr>`).join('')
                            win.document.write(`<!DOCTYPE html><html><head><title>Pedido</title>
                              <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h2{color:#1e40af}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}th{background:#1e40af;color:white;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.total{text-align:right;margin-top:16px;font-size:16px;font-weight:bold}@media print{button{display:none}}</style>
                              </head><body>
                              <h2>Pedido</h2>
                              <p><b>Cliente:</b> ${data.cliente_nombre || 'Consumidor Final'}</p>
                              <p><b>Fecha:</b> ${new Date(data.creado_en).toLocaleDateString('es-DO')}</p>
                              <table><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
                              <tbody>${filas}</tbody></table>
                              <div class="total">
                                <p>Subtotal: RD$${parseFloat(data.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                                <p>ITBIS: RD$${parseFloat(data.itbis).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                                <p>Total: RD$${parseFloat(data.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                              </div>
                              <br>
              <div style="display:flex;gap:12px;margin-top:16px">
                <button onclick="window.print()" style="padding:8px 20px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ Imprimir</button>
               ${p.tipo_entrega === 'conduce' ? '' : `<button onclick="
                 ${avisoStock ? `alert('${('⚠️ ' + avisoStock + 'Se convertira a factura, pero considere reabastecer.').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')}');` : ''}
                if(confirm('¿Desea convertir este pedido a factura?')){
                    fetch('/invoices/pedido/${p.id}/convertir',{method:'PUT',headers:{'Authorization':'Bearer '+sessionStorage.getItem('token'),'Content-Type':'application/json'}})
                    .then(r=>r.json()).then(d=>{if(d.success){const fid=d.data?.id||d.id;const tok=sessionStorage.getItem('token');if(window.opener){try{window.opener.sessionStorage.setItem('facturas_tab_regreso','pedidos')}catch(e){}window.opener.location.reload()}if(confirm('¿Desea imprimir esta factura?')){window.location.href='/invoices/'+fid+'/print?token='+tok}else{window.close()}}else{alert(d.mensaje||'Error')}})
                    .catch(()=>alert('Error al convertir'))
                  }
              " style="padding:8px 20px;background:#16a34a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">✅ Convertir a Factura</button>`}
               
                ${p.tipo_entrega === 'conduce' ? `<button onclick="
                  if(confirm('¿Desea convertir este pedido a CONDUCE? No se generará NCF.')){
                    fetch('/invoices/pedido/${p.id}/convertir-conduce',{method:'PUT',headers:{'Authorization':'Bearer '+sessionStorage.getItem('token'),'Content-Type':'application/json'}})
                    .then(r=>r.json()).then(d=>{if(d.success){const cid=d.data?.id;const tok=sessionStorage.getItem('token');if(window.opener){try{window.opener.sessionStorage.setItem('facturas_tab_regreso','pedidos')}catch(e){}window.opener.location.reload()}if(confirm('Conduce '+(d.data?.numero||'')+' creado. ¿Desea imprimirlo?')){window.location.href='/conduces/'+cid+'/pdf?token='+tok}else{window.close()}}else{alert(d.mensaje||'Error')}})
                    .catch(()=>alert('Error al convertir a conduce'))
                  }
                " style="padding:8px 20px;background:#ca8a04;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">📋 Convertir a Conduce</button>` : ''}
                <button onclick="window.close()" style="padding:8px 20px;background:white;color:#374151;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:13px">← Volver</button>
              </div>
                              </body></html>`)
                            win.document.close()
                          } catch(e) { alert('Error al cargar pedido') }
                        }} className="text-blue-600 hover:underline text-xs">Ver</button>

                        <button onClick={async () => {
                          if (!confirm('¿Eliminar este pedido?')) return
                          try {
                            await API.put(`/invoices/${p.id}/anular`)
                            const res = await API.get('/invoices/pedidos/lista')
                            setPedidos(res.data.data)
                          } catch(e) { alert('Error') }
                        }} className="text-red-500 hover:underline text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {pedidos.length === 0 && !showPedido && (
            <p className="text-gray-400 text-sm text-center py-8">No hay pedidos</p>
          )}
        </div>
      )}

      {tab === 'cotizacion' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Cotización</h3>
     {!showCotizacion ? (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button onClick={() => setShowCotizacion(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                + Nueva Cotización
              </button>
              <input type="text" value={filtroClienteCot} onChange={e => setFiltroClienteCot(e.target.value)}
                placeholder="🔍 Buscar por cliente..."
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-56" />
            </div>
          ) : (
            <div className="mb-6 border rounded-lg p-4">
              <h4 className="font-medium mb-3 text-gray-700">Nueva Cotización</h4>
              <div className="relative mb-4 max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <input type="text" placeholder="Buscar cliente..." id="cot-cliente-input" autoComplete="off" autoFocus
                  ref={cotClienteInputRef}
                  className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={e => {
                    document.getElementById('cot-cliente').value = ''
                    const val = e.target.value.toLowerCase()
                    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(val)).slice(0,10)
                    setCotClienteFiltrados(filtrados)
                    setCotClienteIndex(-1)
                    const list = document.getElementById('cot-cliente-list')
                    list.innerHTML = ''
                    if (val) {
                      filtrados.forEach((c, idx) => {
                        const div = document.createElement('div')
                        div.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50'
                        div.id = `cot-cli-opt-${idx}`
                        div.textContent = c.nombre
                        div.onmousedown = () => {
                          document.getElementById('cot-cliente-input').value = c.nombre
                          document.getElementById('cot-cliente').value = c.id
                        setCotClienteId(c.id)
                          list.innerHTML = ''
                          setCotClienteIndex(-1)
                        }
                        list.appendChild(div)
                      })
                    }
                  }}
                  onKeyDown={e => {
                    const list = document.getElementById('cot-cliente-list')
                    if (e.key === 'Enter' && !list.children.length) {
                      e.preventDefault()
                      setTimeout(() => cotProductoRefs.current[0]?.focus(), 100)
                      return
                    }
                    if (!list.children.length) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      const newIdx = Math.min(cotClienteIndex + 1, cotClienteFiltrados.length - 1)
                      setCotClienteIndex(newIdx)
                      Array.from(list.children).forEach((el, i) => el.style.background = i === newIdx ? '#BFDBFE' : '')
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      const newIdx = Math.max(cotClienteIndex - 1, 0)
                      setCotClienteIndex(newIdx)
                      Array.from(list.children).forEach((el, i) => el.style.background = i === newIdx ? '#BFDBFE' : '')
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                if (cotClienteIndex >= 0 && cotClienteFiltrados[cotClienteIndex]) {
                        const c = cotClienteFiltrados[cotClienteIndex]
                        document.getElementById('cot-cliente-input').value = c.nombre
                        document.getElementById('cot-cliente').value = c.id
                        setCotClienteId(c.id)
                        list.innerHTML = ''
                        setCotClienteIndex(-1)
                      }
                      setTimeout(() => cotProductoRefs.current[0]?.focus(), 100)
                    } else if (e.key === 'Escape') {
                      list.innerHTML = ''
                      setCotClienteIndex(-1)
                    }
                  }}
                 onBlur={() => setTimeout(() => { const el = document.getElementById('cot-cliente-list'); if (el) el.innerHTML = ''; setCotClienteIndex(-1) }, 200)}
                />
                <input type="hidden" id="cot-cliente" defaultValue="" />
                <div id="cot-cliente-list" className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"></div>
              </div>
              {itemsCot.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-3 relative">
                    <input type="text" placeholder="🔍 Buscar Articulo..."
                      ref={el => cotProductoRefs.current[index] = el}
                      value={buscarProductoCot[index] || ''}
                      onChange={e => {
                        setBuscarProductoCot(prev => ({...prev, [index]: e.target.value}))
                        setDropdownCot(prev => ({...prev, [index]: e.target.value.length > 0}))
                        setCotProductoIndex(prev => ({...prev, [index]: -1}))
                      }}
                      onBlur={() => setTimeout(() => { setDropdownCot(prev => ({...prev, [index]: false})); setCotProductoIndex(prev => ({...prev, [index]: -1})) }, 200)}
                      onKeyDown={e => {
                        const filtrados = productos.filter(p => p.nombre.toLowerCase().includes((buscarProductoCot[index]||'').toLowerCase()))
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setCotProductoIndex(prev => ({...prev, [index]: Math.min((prev[index]??-1)+1, filtrados.length-1)}))
                          setDropdownCot(prev => ({...prev, [index]: true}))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setCotProductoIndex(prev => ({...prev, [index]: Math.max((prev[index]??0)-1, -1)}))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          const idx = cotProductoIndex[index] ?? -1
                          if (idx >= 0 && filtrados[idx]) {
                            const p = filtrados[idx]
                            setItemsCot(prev => prev.map((it, i) => i === index ? {...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : it))
                            setBuscarProductoCot(prev => ({...prev, [index]: p.nombre}))
                            setDropdownCot(prev => ({...prev, [index]: false}))
                            setCotProductoIndex(prev => ({...prev, [index]: -1}))
                          }
                          setTimeout(() => cotCantidadRefs.current[index]?.focus(), 100)
                        } else if (e.key === 'Escape') {
                          setDropdownCot(prev => ({...prev, [index]: false}))
                        }
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dropdownCot[index] && (
                      <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                        {productos.filter(p => p.nombre.toLowerCase().includes((buscarProductoCot[index]||'').toLowerCase())).map((p, pidx) => (
                          <div key={p.id} className={`px-3 py-2 text-sm cursor-pointer ${(cotProductoIndex[index]??-1) === pidx ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                            onMouseDown={() => {
                              setItemsCot(prev => prev.map((it, i) => i === index ? {...it, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : it))
                              setBuscarProductoCot(prev => ({...prev, [index]: p.nombre}))
                              setDropdownCot(prev => ({...prev, [index]: false}))
                              setTimeout(() => cotCantidadRefs.current[index]?.focus(), 100)
                            }}>
                            {p.nombre} — RD${parseFloat(p.precio).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                  <input placeholder="Descripción" value={item.descripcion}
                      readOnly={!!item.product_id}
                      onChange={e => setItemsCot(prev => prev.map((it,i) => i===index ? {...it, descripcion: e.target.value} : it))}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${item.product_id ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="Cant." value={item.cantidad} min="1"
                      ref={el => cotCantidadRefs.current[index] = el}
                      onChange={e => setItemsCot(prev => prev.map((it,i) => i===index ? {...it, cantidad: e.target.value} : it))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); cotPrecioRefs.current[index]?.focus() } }}
                      className="w-full border rounded px-2 py-1.5 text-sm" />
                  </div>
                  <div className="col-span-2">
                  <input type="number" placeholder="Precio" value={item.precio_unitario}
                      ref={el => cotPrecioRefs.current[index] = el}
                      onChange={e => setItemsCot(prev => prev.map((it,i) => i===index ? {...it, precio_unitario: e.target.value} : it))}
                      onBlur={e => {
                        if (item.product_id && e.target.value !== '') {
                          const prod = productos.find(p => p.id === item.product_id)
                          if (prod && parseFloat(e.target.value) < parseFloat(prod.precio)) {
                            alert(`⚠️ El precio no puede ser menor al precio de venta del artículo: RD$${parseFloat(prod.precio).toLocaleString('es-DO', {minimumFractionDigits: 2})}`)
                            setItemsCot(prev => prev.map((it,i) => i===index ? {...it, precio_unitario: prod.precio} : it))
                          }
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const nextIndex = index + 1
                          if (cotProductoRefs.current[nextIndex]) {
                            cotProductoRefs.current[nextIndex]?.focus()
                          } else {
                            cotAgregarRef.current?.focus()
                          }
                        }
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm" />
                  </div>
                  <div className="col-span-1">
                    <input type="text" readOnly
                      value={item.precio_unitario && item.cantidad ? 'RD$' + (parseFloat(item.cantidad||0)*parseFloat(item.precio_unitario||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : ''}
                      placeholder="Subtotal"
                      className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50 text-right font-medium text-gray-700" />
                  </div>
                  <div className="col-span-1">
                    <select value={item.itbis_rate}
                      onChange={e => setItemsCot(prev => prev.map((it,i) => i===index ? {...it, itbis_rate: e.target.value} : it))}
                      className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="18">18%</option>
                      <option value="16">16%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                  <div className="col-span-0 flex items-center justify-center">
                    {itemsCot.length > 1 && (
                    <button onClick={() => {
                        setItemsCot(prev => prev.filter((_,i) => i !== index))
                        const reindexarCot = (obj) => {
                          const nuevo = {}
                          Object.keys(obj).forEach(k => {
                            const i = parseInt(k)
                            if (i < index) nuevo[i] = obj[k]
                            else if (i > index) nuevo[i - 1] = obj[k]
                          })
                          return nuevo
                        }
                        setBuscarProductoCot(prev => reindexarCot(prev))
                      }}
                        className="text-red-500 hover:text-red-700 text-lg">×</button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end mb-3">
                <div className="text-sm text-right">
                  {(() => {
              let sub = 0, itb = 0
                    itemsCot.forEach(it => {
                      const bruto = parseFloat(it.cantidad||0) * parseFloat(it.precio_unitario||0)
                      const base = bruto / (1 + (parseFloat(it.itbis_rate||0) / 100))
                      sub += base
                      itb += bruto - base
          })
                    const brutoCot = sub + itb
                    const pctCot = Math.min(Math.max(parseFloat(descuentoPctCot) || 0, 0), 100)
                    const montoDescCot = brutoCot * (pctCot / 100)
                    const netoCot = brutoCot - montoDescCot
                    const itbisNetoCot = itb * (1 - pctCot / 100)
                    const subNetoCot = netoCot - itbisNetoCot
                    return <>
                      <p className="text-gray-600">TOTAL BRUTO: <span className="font-medium">RD${brutoCot.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                      <div className="flex items-center justify-end gap-2 my-1">
                        <label className="text-gray-600">Descuento</label>
                        <input type="number" min="0" max="100" step="any" value={descuentoPctCot}
                          onChange={e => setDescuentoPctCot(e.target.value)}
                          placeholder="0"
                          className="w-16 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <span className="text-gray-600">%</span>
                        <span className="font-medium text-red-600 w-24">-RD${montoDescCot.toLocaleString('es-DO',{minimumFractionDigits:2})}</span>
                      </div>
                      <p className="text-gray-600">SUB-TOTAL: <span className="font-medium">RD${subNetoCot.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                      <p className="text-gray-600">ITBIS: <span className="font-medium">RD${itbisNetoCot.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                      <p className="text-lg font-bold text-gray-800">Total: RD${netoCot.toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                    </>
                  })()}
                </div>
              </div>
              <div className="flex gap-3">
                <button ref={cotAgregarRef} onClick={() => {
                  setItemsCot(prev => [...prev, {descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
                  setTimeout(() => cotProductoRefs.current[itemsCot.length]?.focus(), 150)
                }}
                  onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); cotGuardarRef.current?.focus() } }}
                  className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
          <button ref={cotGuardarRef} onClick={async () => {
                const customer_id = cotClienteId || document.getElementById('cot-cliente').value
                  if (!customer_id) return alert('⚠️ Debe seleccionar un cliente registrado de la lista para crear la cotización.')
                  const itemsValidos = itemsCot.filter(i => i.descripcion && i.precio_unitario)
                for (const it of itemsValidos) {
                    if (it.product_id) {
                      const prod = productos.find(p => p.id === it.product_id)
                      if (prod && parseFloat(it.precio_unitario) < parseFloat(prod.precio)) {
                        return alert(`⚠️ El precio de "${it.descripcion}" (RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO', {minimumFractionDigits: 2})}) es menor al precio de venta: RD$${parseFloat(prod.precio).toLocaleString('es-DO', {minimumFractionDigits: 2})}. Corrígelo antes de guardar.`)
                      }
                    }
                  }
                  if (!itemsValidos.length) return alert('Agrega al menos un producto')
                  try {
                   const payloadCot = { customer_id: customer_id || null, items: itemsValidos, descuento_pct: Math.min(Math.max(parseFloat(descuentoPctCot) || 0, 0), 100) }
                    if (editandoCotId) {
                      await API.put(`/invoices/cotizacion/${editandoCotId}/editar`, payloadCot)
                    } else {
                      await API.post('/invoices/cotizacion', payloadCot)
                    }
                    setEditandoCotId(null)
                    setDescuentoPctCot('')
                    setShowCotizacion(false)
                    setItemsCot([{descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}])
              setBuscarProductoCot({})
                    setCotClienteId('')
                    document.getElementById('cot-cliente-input').value = ''
                    document.getElementById('cot-cliente').value = ''
                    const res = await API.get('/invoices/cotizaciones/lista')
                    setCotizaciones(res.data.data)
                  } catch(e) { alert('Error al guardar cotización') }
                }}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar Cotización</button>
                <button onClick={() => { setShowCotizacion(false); setEditandoCotId(null); setDescuentoPctCot(''); setItemsCot([{descripcion:'',cantidad:1,precio_unitario:'',itbis_rate:18,product_id:''}]) }}
                  className="px-4 py-1.5 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          )}
{cotizaciones.filter(c => {
              if (filtroClienteCot && !(c.cliente_nombre || '').toLowerCase().includes(filtroClienteCot.toLowerCase())) return false
              if (!cotFechaInicio && !cotFechaFin) return true
              const dc = new Date(c.creado_en); const fecha = `${dc.getFullYear()}-${String(dc.getMonth()+1).padStart(2,'0')}-${String(dc.getDate()).padStart(2,'0')}`
              if (cotFechaInicio && fecha < cotFechaInicio) return false
              if (cotFechaFin && fecha > cotFechaFin) return false
              return true
            }).length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">ID</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
</thead>
              <tbody>
                {cotizaciones.filter(c => {
          if (filtroClienteCot && !(c.cliente_nombre || '').toLowerCase().includes(filtroClienteCot.toLowerCase())) return false
                  if (!cotFechaInicio && !cotFechaFin) return true
                 const dc = new Date(c.creado_en); const fecha = `${dc.getFullYear()}-${String(dc.getMonth()+1).padStart(2,'0')}-${String(dc.getDate()).padStart(2,'0')}`
                  if (cotFechaInicio && fecha < cotFechaInicio) return false
                  if (cotFechaFin && fecha > cotFechaFin) return false
                  return true
                }).map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0,8)}...</td>
                    <td className="px-4 py-3">{c.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3 text-right">RD${parseFloat(c.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td className="px-4 py-3">{new Date(c.creado_en).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handlePDF(c.id)} className="text-blue-600 hover:underline text-xs">PDF</button>
                      <button onClick={async () => {
                     if (!confirm('¿Convertir esta cotización a factura?')) return
                        try {
                          const detCot = await API.get(`/invoices/${c.id}`)
                          const itemsCotz = detCot.data.data.items || []
                          const invRes = await API.get('/inventory')
                          const invList = invRes.data.data
                          for (const it of itemsCotz) {
                            if (!it.product_id) continue
                            const invItem = invList.find(v => v.product_id === it.product_id)
                           const minCot = Math.max(parseFloat(invItem?.stock_minimo || 0), parseFloat(invItem?.prod_stock_minimo || 0))
                            if (invItem && parseFloat(it.cantidad || 0) > parseFloat(invItem.stock_actual || 0)) {
                              alert(`⚠️ Stock insuficiente para "${it.descripcion}".\n\nDisponible: ${parseFloat(invItem.stock_actual || 0)}\nSolicitado: ${parseFloat(it.cantidad || 0)}\n\nSolo puede facturar hasta ${parseFloat(invItem.stock_actual || 0)}.`)
                              return
                            }
                            if (invItem && minCot > 0 && parseFloat(invItem.stock_actual || 0) <= minCot) {
                              alert(`⚠️ STOCK BAJO: "${it.descripcion}"\n\nQuedan ${parseFloat(invItem.stock_actual || 0)} (mínimo ${minCot}).\n\nSe convertirá a factura, pero considere reabastecer.`)
                            }
                          }
                          await API.put(`/invoices/cotizacion/${c.id}/convertir`)
                          const res = await API.get('/invoices/cotizaciones/lista')
                          setCotizaciones(res.data.data)
                          fetchData()
                          alert('¡Factura emitida exitosamente!')
                        } catch(e) { alert('Error al convertir') }
                    }} className="text-green-600 hover:underline text-xs">Convertir a Factura</button>
                      <button onClick={async () => {
                        if (!confirm('Convertir esta cotizacion en CONDUCE?\n\nSe descontara el inventario y no se generara NCF.')) return
                        try {
                          const res = await API.put(`/invoices/cotizacion/${c.id}/convertir-conduce`)
                          alert('Conduce generado: ' + (res.data.data?.numero || ''))
                          const lst = await API.get('/invoices/cotizaciones/lista')
                          setCotizaciones(lst.data.data)
                          fetchData()
                        } catch(e) { alert(e.response?.data?.mensaje || 'Error al convertir en conduce') }
                      }} className="text-yellow-600 hover:underline text-xs">Convertir a Conduce</button>
                      <button onClick={async () => {
                        try {
                          const det = await API.get(`/invoices/${c.id}`)
                          const its = det.data.data.items || []
                          setEditandoCotId(c.id)
                          setCotClienteId(c.customer_id || '')
                          setItemsCot(its.map(it => ({
                            descripcion: it.descripcion || '',
                            cantidad: parseFloat(it.cantidad),
                            precio_unitario: parseFloat(it.precio_unitario),
                            itbis_rate: parseFloat(it.itbis_rate || 18),
                            product_id: it.product_id || ''
                          })))
                          setDescuentoPctCot('')
                          setShowCotizacion(true)
                          setTimeout(() => { const el = document.getElementById('cot-cliente-input'); if (el) el.value = c.cliente_nombre || '' }, 100)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        } catch(e) { alert('Error al cargar la cotización') }
                      }} className="text-orange-600 hover:underline text-xs">Editar</button>
                      <button onClick={async () => {
                        if (!confirm('¿Eliminar esta cotización?')) return
                        try {
                          await API.put(`/invoices/${c.id}/anular`)
                          const res = await API.get('/invoices/cotizaciones/lista')
                          setCotizaciones(res.data.data)
                        } catch(e) { alert('Error') }
                      }} className="text-red-500 hover:underline text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {cotizaciones.length === 0 && !showCotizacion && (
            <p className="text-gray-400 text-sm text-center py-8">No hay cotizaciones</p>
          )}
        </div>
      )}

      {tab === 'nota_credito' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Nota de Crédito</h3>
          {!showNotaCredito ? (
            <button onClick={() => { setShowNotaCredito(true); setNcFacturaEncontrada(null); setNcItemsSeleccionados([]); setNcMotivo('') }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 mb-4">
              + Nueva Nota de Crédito
            </button>
          ) : (
            <div className="mb-6 border rounded-lg p-4">
              <h4 className="font-medium mb-3 text-gray-700">Nueva Nota de Crédito</h4>
              <div className="flex gap-3 items-end mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NCF de Factura Original</label>
               <input type="text" placeholder="Ej: B0100000001"
                    value={ncFacturaBuscar}
                    onChange={e => setNcFacturaBuscar(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-nc')?.click() } }}
                    className="border rounded px-3 py-2 text-sm w-56 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button id="btn-buscar-nc" onClick={async () => {
                  const busqNc = ncFacturaBuscar.trim().toUpperCase()
                  if (busqNc.startsWith('CD-')) {
                    const cdEnc = conducesVenta.find(cd => (cd.numero||'').toUpperCase() === busqNc)
                    if (!cdEnc) { alert('Conduce no encontrado: ' + busqNc); return }
                    if (cdEnc.facturado) { alert('Este conduce fue convertido en factura. Haga la NC a la factura.'); return }
                    if (cdEnc.estado !== 'emitido') { alert('Solo se puede hacer NC a conduces emitidos'); return }
                    try {
                      const resCd = await API.get(`/conduces/${cdEnc.id}`)
                      const dataCd = resCd.data.data || {}
                      const itemsCd = dataCd.items || []
                      setNcFacturaEncontrada({ ...cdEnc, es_conduce: true, ncf: cdEnc.numero })
                      setNcItemsSeleccionados(itemsCd.map(it => ({ ...it, seleccionado: false, cantidad_nc: it.cantidad, itbis_rate: 0 })))
                    } catch (e) { alert('Error al cargar el conduce') }
                    return
                  }
                  const factura = facturas.find(f => (f.ncf||'').toUpperCase() === ncFacturaBuscar.trim())
                  if (!factura) { alert('Factura no encontrada'); return }
                  if (factura.estado !== 'emitida') { alert('Solo se puede hacer nota de crédito a facturas emitidas'); return }
           try {
                    const res = await API.get(`/invoices/${factura.id}`)
                    const data = res.data.data
                    let devueltos = []
                    try {
                      const dev = await API.get(`/invoices/${factura.id}/devuelto`)
                      devueltos = dev.data.data || []
                    } catch(e2) { devueltos = [] }
                    setNcFacturaEncontrada(data)
                    setNcItemsSeleccionados(data.items.map(it => {
                      const d = devueltos.find(x => (it.product_id && x.product_id === it.product_id) || (!it.product_id && x.descripcion === it.descripcion))
                      const yaDevuelto = d ? parseFloat(d.cantidad_devuelta) : 0
                      const disponible = Math.max(parseFloat(it.cantidad) - yaDevuelto, 0)
                      return {
                        ...it,
                        seleccionado: disponible > 0,
                        cantidad_nc: 0,
                        disponible
                      }
                    }))
                  } catch(e) { alert('Error al cargar factura') }
                }}
         className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Buscar
                </button>
                {ncFacturaEncontrada && (
                  <button onClick={() => setNcItemsSeleccionados(prev => [...prev, { product_id: '', descripcion: '', cantidad: 0, cantidad_nc: 0, precio_unitario: '', itbis_rate: 18, seleccionado: true, manual: true }])}
                    className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
                )}
              </div>

              {ncFacturaEncontrada && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                    <p><span className="font-medium">Cliente:</span> {ncFacturaEncontrada.cliente_nombre || 'Consumidor Final'}</p>
                   <p><span className="font-medium">NCF:</span> {ncFacturaEncontrada.ncf} {ncFacturaEncontrada.es_conduce && <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold ml-1">CONDUCE</span>}</p>
                    <p><span className="font-medium">Total factura:</span> RD${parseFloat(ncFacturaEncontrada.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                  </div>

                  <p className="text-sm font-medium text-gray-700 mb-2">Selecciona los productos a devolver:</p>
                  <table className="w-full text-sm mb-4">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">✓</th>
                        <th className="px-3 py-2 text-left text-gray-600">Producto</th>
                        <th className="px-3 py-2 text-right text-gray-600">Cant. Orig.</th>
                        <th className="px-3 py-2 text-right text-gray-600">Cant. Devolver</th>
                        <th className="px-3 py-2 text-right text-gray-600">Precio</th>
                        <th className="px-3 py-2 text-right text-gray-600">Subtotal NC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ncItemsSeleccionados.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={item.seleccionado}
                              onChange={e => setNcItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, seleccionado: e.target.checked} : it))} />
                          </td>
                   <td className="px-3 py-2">
                            {item.manual ? (
                              <input type="text" placeholder="Descripción..."
                                value={item.descripcion}
                                onChange={e => setNcItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, descripcion: e.target.value} : it))}
                                className="border rounded px-2 py-1 text-sm w-full" />
                            ) : item.descripcion}
                          </td>
                          <td className="px-3 py-2 text-right">{item.manual ? '-' : parseFloat(item.cantidad).toFixed(0)}</td>
                          <td className="px-3 py-2 text-right">
                 <input type="number" value={item.cantidad_nc} min="1"
                              max={item.manual ? undefined : (item.disponible !== undefined ? item.disponible : parseFloat(item.cantidad))}
                              step="1"
                              disabled={!item.seleccionado}
                         onChange={e => {
                                let val = e.target.value
                                if (!item.manual && val !== '') {
                                  const maxCant = item.disponible !== undefined ? item.disponible : parseFloat(item.cantidad)
                                  if (parseFloat(val) > maxCant) {
                                    alert(`⚠️ No puede devolver más de ${maxCant.toFixed(0)} (disponible: original ${parseFloat(item.cantidad).toFixed(0)} menos lo devuelto en NC anteriores)`)
                                    val = String(maxCant)
                                  }
                                }
                                setNcItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, cantidad_nc: val} : it))
                              }}
                              className="border rounded px-2 py-1 text-sm w-20 text-right disabled:bg-gray-100" />
                          </td>
                        <td className="px-3 py-2 text-right">
                            {item.manual ? (
                              <input type="number" placeholder="Precio" value={item.precio_unitario} min="0" step="0.01"
                                onChange={e => setNcItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, precio_unitario: e.target.value} : it))}
                                className="border rounded px-2 py-1 text-sm w-24 text-right" />
                            ) : 'RD$' + parseFloat(item.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                          {item.seleccionado ? 'RD$' + (parseFloat(item.cantidad_nc||0) * (parseFloat(item.precio_unitario)||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end mb-4">
                    <div className="text-sm text-right bg-gray-50 p-3 rounded-lg">
                      {(() => {
                        let sub = 0, itb = 0
                        ncItemsSeleccionados.filter(i => i.seleccionado).forEach(it => {
                       const s = parseFloat(it.cantidad_nc||0) * (parseFloat(it.precio_unitario)||0)
                          sub += s
                          itb += s * (parseFloat(it.itbis_rate||0) / 100)
                        })
                        return <>
                          <p className="text-gray-600">Subtotal NC: <span className="font-medium">RD${sub.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                          <p className="text-gray-600">ITBIS NC: <span className="font-medium">RD${itb.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                          <p className="text-lg font-bold text-red-600">Total NC: RD${(sub+itb).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                        </>
                      })()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                    <input type="text" placeholder="Ej: Devolución de mercancía..."
                      value={ncMotivo} onChange={e => setNcMotivo(e.target.value)}
                      className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={async () => {
             const itemsNC = ncItemsSeleccionados.filter(i => i.seleccionado && parseFloat(i.cantidad_nc) > 0)
                      if (!itemsNC.length) { alert('Selecciona al menos un producto'); return }
                 const manualIncompleta = itemsNC.find(i => i.manual && (!i.descripcion.trim() || !(parseFloat(i.precio_unitario) > 0)))
                      if (manualIncompleta) { alert('Las líneas agregadas deben tener descripción y precio'); return }
                      if (!ncMotivo.trim()) { alert('Ingresa el motivo de la nota de crédito'); return }
                      if (!confirm('¿Emitir esta Nota de Crédito?')) return
                      try {
                                             if (ncFacturaEncontrada.es_conduce) {
                          const resNcCd = await API.post(`/conduces/${ncFacturaEncontrada.id}/nota-credito`, {
                            motivo: ncMotivo,
                            items: itemsNC.map(it => ({
                              product_id: it.product_id,
                              descripcion: it.descripcion,
                              cantidad: parseFloat(it.cantidad_nc),
                              precio_unitario: parseFloat(it.precio_unitario)
                            }))
                          })
                          setShowNotaCredito(false)
                          setNcFacturaBuscar('')
                          setNcFacturaEncontrada(null)
                          setNcItemsSeleccionados([])
                          setNcMotivo('')
                                                   alert('✅ Nota de Crédito de conduce creada correctamente')
                                                 const ncCdId = resNcCd.data.data?.id
                          if (ncCdId) {
                            setNccGuardadaId(ncCdId)
                            setMostrarImprimirNcc(true)
                          }
                          return
                        }
                        const resPost = await API.post('/invoices/nota-credito', {
                          factura_id: ncFacturaEncontrada.id,
                          motivo: ncMotivo,
                          items: itemsNC.map(it => ({
                            product_id: it.product_id,
                            descripcion: it.descripcion,
                            cantidad: parseFloat(it.cantidad_nc),
                            precio_unitario: parseFloat(it.precio_unitario),
                            itbis_rate: parseFloat(it.itbis_rate || 0)
                          }))
                        })
                        setShowNotaCredito(false)
                        setNcFacturaBuscar('')
                        setNcFacturaEncontrada(null)
                        setNcItemsSeleccionados([])
                     setNcMotivo('')
                        const resLista = await API.get('/invoices/nota-credito/lista')
                        setNotasCredito(resLista.data.data)
                        const resFact = await API.get('/invoices')
                        setFacturas(resFact.data.data)
                        setFacturasFiltradas(resFact.data.data)
                        setNcGuardadaId(resPost.data.data?.id)
                        setMostrarImprimirNC(true)
                    
                      } catch(e) { alert(e.response?.data?.mensaje || 'Error al emitir nota de crédito') }
                    }}
                      className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      Emitir Nota de Crédito
                    </button>
                    <button onClick={() => setShowNotaCredito(false)}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  </div>
                </>
              )}
            </div>
          )}

          {notasCredito.length > 0 && (
            <table className="w-full text-sm mt-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Número NC</th>
                  <th className="px-4 py-3 text-left text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-right text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
          {notasCredito.filter(n => {
                  const d = new Date(n.creado_en)
                  const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  if (fechaInicio && fecha < fechaInicio) return false
                  if (fechaFin && fecha > fechaFin) return false
                  if (busquedaNc && !(n.ncf || '').toUpperCase().includes(busquedaNc.toUpperCase())) return false
                  return true
                }).map(n => (
                  <tr key={n.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-red-600 font-medium">{n.ncf}</td>
                    <td className="px-4 py-3">{n.cliente_nombre || 'Consumidor Final'}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">-RD${parseFloat(n.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                    <td className="px-4 py-3">{new Date(n.creado_en).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (n.es_conduce_nc) { window.open(`${import.meta.env.VITE_API_URL || ''}/conduces/nc/${n.id}/pdf?token=${sessionStorage.getItem('token')}`, '_blank') } else { handlePDF(n.id) } }} className="text-blue-600 hover:underline text-xs">PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {notasCredito.length === 0 && !showNotaCredito && (
            <p className="text-gray-400 text-sm text-center py-8">No hay notas de crédito</p>
          )}
        </div>
      )}

      {tab === 'devoluciones' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🔄 Devoluciones de Mercancía</h3>
          <p className="text-sm text-gray-500 mb-4">Flujo: Almacén registra → Contabilidad aprueba → Se genera Nota de Crédito</p>

          {!showDevolucion ? (
            <button onClick={() => { setShowDevolucion(true); setDevFacturaEncontrada(null); setDevItemsSeleccionados([]); setDevMotivo(''); setDevFacturaBuscar('') }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 mb-4">
              + Nueva Devolución
            </button>
          ) : (
            <div className="mb-6 border rounded-lg p-4">
              <h4 className="font-medium mb-3 text-gray-700">Nueva Devolución</h4>
              <div className="flex gap-3 items-end mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NCF de Factura Original</label>
                <input type="text" placeholder="Ej: B0100000001"
                    value={devFacturaBuscar}
                    onChange={e => setDevFacturaBuscar(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-buscar-dev')?.click() } }}
                    className="border rounded px-3 py-2 text-sm w-56 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button id="btn-buscar-dev" onClick={async () => {
                 const busqDev = devFacturaBuscar.trim().toUpperCase()
                  if (busqDev.startsWith('CD-')) {
                    const cdEncDev = conducesVenta.find(cd => (cd.numero||'').toUpperCase() === busqDev)
                    if (!cdEncDev) { alert('Conduce no encontrado: ' + busqDev); return }
                    if (cdEncDev.facturado) { alert('Este conduce fue convertido en factura. Haga la devolución a la factura.'); return }
                    if (cdEncDev.estado !== 'emitido') { alert('Solo se pueden hacer devoluciones a conduces emitidos'); return }
                    try {
                      const resCdDev = await API.get(`/conduces/${cdEncDev.id}`)
                      const dataCdDev = resCdDev.data.data || {}
                      const itemsCdDev = dataCdDev.items || []
                      setDevFacturaEncontrada({ ...cdEncDev, es_conduce: true, ncf: cdEncDev.numero })
                      setDevItemsSeleccionados(itemsCdDev.map(it => ({ ...it, seleccionado: false, cantidad_dev: 0, itbis_rate: 0 })))
                    } catch (e) { alert('Error al cargar el conduce') }
                    return
                  }
                  const factura = facturas.find(f => (f.ncf||'').toUpperCase() === devFacturaBuscar.trim())
                  if (!factura) { alert('Factura no encontrada'); return }
                  if (factura.estado !== 'emitida') { alert('Solo se pueden hacer devoluciones a facturas emitidas'); return }
                  try {
                    const res = await API.get(`/invoices/${factura.id}`)
            const data = res.data.data
                    let devueltosDev = []
                    try {
                      const devd = await API.get(`/invoices/${data.id}/devuelto-dev`)
                      devueltosDev = devd.data.data || []
                    } catch(e2) { devueltosDev = [] }
                    setDevFacturaEncontrada(data)
                    setDevItemsSeleccionados(data.items.map(it => {
                      const d = devueltosDev.find(x => (it.product_id && x.product_id === it.product_id) || (!it.product_id && x.descripcion === it.descripcion))
                      const yaDevuelto = d ? parseFloat(d.cantidad_devuelta) : 0
                      const disponible = Math.max(parseFloat(it.cantidad) - yaDevuelto, 0)
                      return {
                        ...it,
                        seleccionado: false,
                        cantidad_dev: 0,
                        disponible
                      }
                    }))
                  } catch(e) { alert('Error al cargar factura') }
                }}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Buscar
                </button>
                {devFacturaEncontrada && (
                  <button onClick={() => setDevItemsSeleccionados(prev => [...prev, { product_id: '', descripcion: '', cantidad: 0, cantidad_dev: 0, precio_unitario: '', itbis_rate: 18, seleccionado: true, manual: true }])}
                    className="text-blue-600 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1">+ Agregar línea</button>
                )}
              </div>

              {devFacturaEncontrada && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                    <p><span className="font-medium">Cliente:</span> {devFacturaEncontrada.cliente_nombre || 'Consumidor Final'}</p>
                    <p><span className="font-medium">NCF:</span> {devFacturaEncontrada.ncf} {devFacturaEncontrada.es_conduce && <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold ml-1">CONDUCE</span>}</p>
                    <p><span className="font-medium">Total factura:</span> RD${parseFloat(devFacturaEncontrada.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                  </div>

                  <p className="text-sm font-medium text-gray-700 mb-2">Selecciona los productos que el cliente está devolviendo:</p>
                  <table className="w-full text-sm mb-4">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">✓</th>
                        <th className="px-3 py-2 text-left text-gray-600">Producto</th>
                        <th className="px-3 py-2 text-right text-gray-600">Cant. Original</th>
                        <th className="px-3 py-2 text-right text-gray-600">Cant. Devuelta</th>
                        <th className="px-3 py-2 text-right text-gray-600">Precio</th>
                        <th className="px-3 py-2 text-right text-gray-600">Subtotal Dev.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devItemsSeleccionados.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={item.seleccionado}
                              onChange={e => setDevItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, seleccionado: e.target.checked} : it))} />
                          </td>
                       <td className="px-3 py-2">
                            {item.manual ? (
                              <input type="text" placeholder="Descripción..."
                                value={item.descripcion}
                                onChange={e => setDevItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, descripcion: e.target.value} : it))}
                                className="border rounded px-2 py-1 text-sm w-full" />
                            ) : item.descripcion}
                          </td>
                          <td className="px-3 py-2 text-right">{item.manual ? '-' : parseFloat(item.cantidad).toFixed(0)}</td>
                          <td className="px-3 py-2 text-right">
                     <input type="number" value={item.cantidad_dev} min="0"
                              max={item.manual ? undefined : (item.disponible !== undefined ? item.disponible : parseFloat(item.cantidad))}
                              step="0.01"
                              disabled={!item.seleccionado}
                              onChange={e => {
                                let val = e.target.value
                                if (!item.manual && val !== '') {
                                  const maxCant = item.disponible !== undefined ? item.disponible : parseFloat(item.cantidad)
                                  if (parseFloat(val) > maxCant) {
                                    alert(`⚠️ No puede devolver más de ${maxCant.toFixed(0)} (disponible: original ${parseFloat(item.cantidad).toFixed(0)} menos lo devuelto en devoluciones anteriores)`)
                                    val = String(maxCant)
                                  }
                                }
                                setDevItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, cantidad_dev: val} : it))
                              }}
                              className="border rounded px-2 py-1 text-sm w-20 text-right disabled:bg-gray-100" />
                          </td>
             <td className="px-3 py-2 text-right">
                            {item.manual ? (
                              <input type="number" placeholder="Precio" value={item.precio_unitario} min="0" step="0.01"
                                onChange={e => setDevItemsSeleccionados(prev => prev.map((it,i) => i===idx ? {...it, precio_unitario: e.target.value} : it))}
                                className="border rounded px-2 py-1 text-sm w-24 text-right" />
                            ) : 'RD$' + parseFloat(item.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {item.seleccionado ? 'RD$' + (parseFloat(item.cantidad_dev||0) * (parseFloat(item.precio_unitario)||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end mb-4">
                    <div className="text-sm text-right bg-gray-50 p-3 rounded-lg">
                      {(() => {
                        let sub = 0, itb = 0
                      devItemsSeleccionados.filter(i => i.seleccionado).forEach(it => {
                          const s = parseFloat(it.cantidad_dev||0) * (parseFloat(it.precio_unitario)||0)
                          sub += s
                          itb += s * (parseFloat(it.itbis_rate||0) / 100)
                        })
                        return <>
                          <p className="text-gray-600">Subtotal Dev.: <span className="font-medium">RD${sub.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                          <p className="text-gray-600">ITBIS Dev.: <span className="font-medium">RD${itb.toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                          <p className="text-lg font-bold text-orange-600">Total Devolución: RD${(sub+itb).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                        </>
                      })()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la devolución *</label>
                    <input type="text" placeholder="Ej: Producto defectuoso, cliente insatisfecho..."
                      value={devMotivo} onChange={e => setDevMotivo(e.target.value)}
                      className="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={async () => {
                   const itemsDev = devItemsSeleccionados.filter(i => i.seleccionado && parseFloat(i.cantidad_dev) > 0)
                      if (!itemsDev.length) { alert('Selecciona al menos un producto con cantidad mayor a 0'); return }
                      const manualIncompletaDev = itemsDev.find(i => i.manual && (!i.descripcion.trim() || !(parseFloat(i.precio_unitario) > 0)))
                      if (manualIncompletaDev) { alert('Las líneas agregadas deben tener descripción y precio'); return }
                      if (!devMotivo.trim()) { alert('Ingresa el motivo de la devolución'); return }
                      if (!confirm('¿Registrar esta devolución? Quedará en estado PENDIENTE esperando aprobación.')) return
                      let devolucionRegistrada = false
                      let devolucionId = null
                      try {
                       const resPost = await API.post('/devoluciones', {
                          factura_id: devFacturaEncontrada.es_conduce ? null : devFacturaEncontrada.id,
                          conduce_id: devFacturaEncontrada.es_conduce ? devFacturaEncontrada.id : null,
                          factura_ncf: devFacturaEncontrada.ncf,
                          customer_id: devFacturaEncontrada.customer_id || null,
                          cliente_nombre: devFacturaEncontrada.cliente_nombre || 'Consumidor Final',
                          motivo: devMotivo,
                          items: itemsDev.map(it => ({
                            product_id: it.product_id || null,
                            descripcion: it.descripcion,
                            cantidad: parseFloat(it.cantidad_dev),
                            precio_unitario: parseFloat(it.precio_unitario),
                            itbis_rate: parseFloat(it.itbis_rate || 0)
                          }))
                        })
                        devolucionRegistrada = true
                        devolucionId = resPost.data.data?.id
                        setShowDevolucion(false)
                        setDevFacturaBuscar('')
                        setDevFacturaEncontrada(null)
                        setDevItemsSeleccionados([])
                        setDevMotivo('')
                        const res = await API.get('/devoluciones')
                        setDevoluciones(res.data.data)
                        alert('✅ Devolución registrada con estado PENDIENTE')
                      } catch(e) {
                        alert('❌ ' + (e.response?.data?.mensaje || 'Error al registrar devolución'))
                        return
                      }

                      // Impresión del comprobante (separado del registro para no perder datos si falla el popup)
                      if (devolucionRegistrada && devolucionId && confirm('¿Desea imprimir el comprobante de devolución?')) {
                        try {
                          const resDet = await API.get(`/devoluciones/${devolucionId}`)
                          const dev = resDet.data.data
                          const printW = window.open('', '_blank')
                          if (!printW) { alert('⚠️ El navegador bloqueó la ventana emergente. Habilita los popups para imprimir.'); return }
                          const filas = (dev.items || []).map(it => `
                            <tr>
                              <td>${it.descripcion}</td>
                              <td style="text-align:right">${parseFloat(it.cantidad).toFixed(2)}</td>
                              <td style="text-align:right">RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                              <td style="text-align:right">RD$${parseFloat(it.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                            </tr>`).join('')
                          printW.document.write(`
                            <!DOCTYPE html><html><head><title>Comprobante Devolución ${dev.numero}</title>
                            <style>
                              @page { size: letter; margin: 0.5in }
                              body{font-family:Arial,sans-serif;padding:20px;color:#1e293b;max-width:8.5in;margin:0 auto}
                              .header{background:#1e40af;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
                              .header h1{margin:0;font-size:22px}
                              .header .numero{font-size:18px;font-weight:bold;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:6px}
                              .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:16px;background:#f1f5f9;padding:12px;border-radius:6px}
                              .meta p{margin:3px 0}
                              .meta strong{color:#475569}
                              .estado-badge{display:inline-block;padding:4px 12px;border-radius:4px;font-weight:bold;font-size:11px;background:#fef3c7;color:#92400e;margin-left:6px}
                              .motivo{background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;margin-bottom:16px;font-size:13px}
                              .motivo strong{color:#92400e}
                              table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
                              th{background:#1e40af;color:white;padding:8px;text-align:left}
                              td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                              tr:nth-child(even){background:#f8fafc}
                              .totales{display:flex;justify-content:flex-end;margin-bottom:32px}
                              .totales-box{background:#fff7ed;border:2px solid #f97316;border-radius:8px;padding:12px 18px;min-width:280px}
                              .totales-fila{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
                              .totales-fila.total{font-weight:bold;font-size:16px;color:#ea580c;border-top:2px solid #f97316;padding-top:8px;margin-top:4px}
                              .firmas{display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin-top:60px}
                              .firma{text-align:center;font-size:11px}
                              .firma .linea{border-top:1px solid #334155;margin-bottom:6px;padding-top:6px}
                              .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px}
                              @media print{.no-print{display:none}}
                            </style></head><body>
                            <div class="header">
                              <h1>🔄 COMPROBANTE DE DEVOLUCIÓN</h1>
                              <div class="numero">${dev.numero}</div>
                            </div>

                            <div class="meta">
                              <p><strong>Cliente:</strong> ${dev.cliente_nombre || 'Consumidor Final'}</p>
                              <p><strong>NCF Factura Original:</strong> ${dev.factura_ncf || '-'}</p>
                              <p><strong>Fecha / Hora:</strong> ${new Date(dev.creado_en).toLocaleString('es-DO')}</p>
                              <p><strong>Estado:</strong> <span class="estado-badge">${dev.estado.toUpperCase()}</span></p>
                            </div>

                            <div class="motivo">
                              <strong>Motivo de la devolución:</strong><br>
                              ${dev.motivo || 'Sin especificar'}
                            </div>

                            <table>
                              <thead><tr>
                                <th>Producto</th>
                                <th style="text-align:right">Cantidad</th>
                                <th style="text-align:right">Precio Unit.</th>
                                <th style="text-align:right">Subtotal</th>
                              </tr></thead>
                              <tbody>${filas}</tbody>
                            </table>

                            <div class="totales">
                              <div class="totales-box">
                                <div class="totales-fila"><span>Subtotal:</span><span>RD$${parseFloat(dev.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                                <div class="totales-fila"><span>ITBIS:</span><span>RD$${parseFloat(dev.itbis).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                                <div class="totales-fila total"><span>TOTAL DEVOLUCIÓN:</span><span>RD$${parseFloat(dev.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></div>
                              </div>
                            </div>

                            <div class="firmas">
                              <div class="firma"><div class="linea"></div>ALMACÉN<br>(Recibe mercancía)</div>
                              <div class="firma"><div class="linea"></div>CONTABILIDAD<br>(Aprueba devolución)</div>
                              <div class="firma"><div class="linea"></div>CLIENTE<br>(Entrega mercancía)</div>
                            </div>

                            <div class="footer">
                              Este documento NO es una Nota de Crédito. La NC se emitirá tras la aprobación y procesamiento por parte de Contabilidad.<br>
                              Impreso el ${new Date().toLocaleString('es-DO')}
                            </div>

                            <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
                            </body></html>`)
                          printW.document.close()
                        } catch(e) {
                          alert('⚠️ La devolución se guardó correctamente pero no se pudo imprimir el comprobante. Puede imprimirlo después desde el botón Ver.')
                        }
                      }
                    }}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Registrar Devolución
                    </button>
                    <button onClick={() => setShowDevolucion(false)}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtro por estado */}
          <div className="flex gap-2 items-center mb-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            {['todos', 'pendiente', 'aprobada', 'procesada', 'cancelada'].map(e => (
              <button key={e} onClick={() => setFiltroEstadoDev(e)}
                className={`px-3 py-1 rounded text-xs font-medium ${filtroEstadoDev === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>

          {/* Lista de devoluciones */}
          {(() => {
           const lista = devoluciones.filter(d => {
              if (filtroEstadoDev !== 'todos' && d.estado !== filtroEstadoDev) return false
              const fechaDev = (d.creado_en || '').substring(0, 10)
              if (fechaInicio && fechaDev < fechaInicio) return false
              if (fechaFin && fechaDev > fechaFin) return false
              return true
            })
            if (lista.length === 0) return <p className="text-gray-400 text-sm text-center py-8">No hay devoluciones {filtroEstadoDev !== 'todos' ? `en estado ${filtroEstadoDev}` : ''}</p>
            return (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-gray-600">Número</th>
                    <th className="px-3 py-3 text-left text-gray-600">NCF Factura</th>
                    <th className="px-3 py-3 text-left text-gray-600">Cliente</th>
                    <th className="px-3 py-3 text-right text-gray-600">Total</th>
                    <th className="px-3 py-3 text-left text-gray-600">Estado</th>
                    <th className="px-3 py-3 text-left text-gray-600">Fecha</th>
                    <th className="px-3 py-3 text-left text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(d => {
                    const estadoColorDev = {
                      pendiente: 'bg-yellow-100 text-yellow-700',
                      aprobada: 'bg-green-100 text-green-700',
                      procesada: 'bg-blue-100 text-blue-700',
                      cancelada: 'bg-red-100 text-red-700'
                    }[d.estado] || 'bg-gray-100 text-gray-700'
                    return (
                      <tr key={d.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-3 font-mono font-medium">{d.numero}</td>
                        <td className="px-3 py-3 font-mono text-xs">{d.factura_ncf || '-'}</td>
                        <td className="px-3 py-3">{d.cliente_nombre || 'Consumidor Final'}</td>
                        <td className="px-3 py-3 text-right font-medium">RD${parseFloat(d.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColorDev}`}>{d.estado.toUpperCase()}</span>
                        </td>
                        <td className="px-3 py-3 text-xs">{new Date(d.creado_en).toLocaleDateString('es-DO')}</td>
                        <td className="px-3 py-3 flex gap-2 flex-wrap">
                          <button onClick={async () => {
                            try {
                              const res = await API.get(`/devoluciones/${d.id}`)
                              setDevDetalle(res.data.data)
                            } catch(e) { alert('Error al cargar detalle') }
                          }} className="text-blue-600 hover:underline text-xs">Ver</button>
                          {d.estado === 'pendiente' && (
                            <>
                              <button onClick={async () => {
                                if (!confirm('¿Aprobar devolución? Los productos regresarán al inventario.')) return
                                try {
                                  await API.put(`/devoluciones/${d.id}/aprobar`, {})
                                  const res = await API.get('/devoluciones')
                                  setDevoluciones(res.data.data)
                                  alert('✅ Devolución aprobada. Inventario actualizado.')
                                } catch(e) { alert('❌ ' + (e.response?.data?.mensaje || 'Error')) }
                              }} className="text-green-600 hover:underline text-xs font-medium">Aprobar</button>
                              <button onClick={async () => {
                                if (!confirm('¿Cancelar esta devolución?')) return
                                try {
                                  await API.put(`/devoluciones/${d.id}/cancelar`, {})
                                  const res = await API.get('/devoluciones')
                                  setDevoluciones(res.data.data)
                                } catch(e) { alert('❌ ' + (e.response?.data?.mensaje || 'Error')) }
                              }} className="text-red-500 hover:underline text-xs">Cancelar</button>
                            </>
                          )}
                          {d.estado === 'aprobada' && (
                            <>
                              <button onClick={async () => {
                                if (!confirm('¿Procesar devolución? Se generará la Nota de Crédito automáticamente.')) return
                                try {
                                  const res = await API.put(`/devoluciones/${d.id}/procesar`, {})
                                  const resLista = await API.get('/devoluciones')
                                  setDevoluciones(resLista.data.data)
                                  const resNC = await API.get('/invoices/nota-credito/lista')
                                  setNotasCredito(resNC.data.data)
                                  alert(`✅ NC generada: ${res.data.data?.ncf || res.data.data?.numero || res.data.mensaje || ''}`)
                              if (res.data.data?.numero && String(res.data.data.numero).startsWith('NCC')) {
                                    setNccGuardadaId(res.data.data.id)
                                    setMostrarImprimirNcc(true)
                                  }
                                } catch(e) { alert('❌ ' + (e.response?.data?.mensaje || 'Error')) }
                              }} className="text-blue-600 hover:underline text-xs font-medium">Procesar → NC</button>
                              <button onClick={async () => {
                                if (!confirm('¿Cancelar esta devolución? El inventario se revertirá.')) return
                                try {
                                  await API.put(`/devoluciones/${d.id}/cancelar`, {})
                                  const res = await API.get('/devoluciones')
                                  setDevoluciones(res.data.data)
                                } catch(e) { alert('❌ ' + (e.response?.data?.mensaje || 'Error')) }
                              }} className="text-red-500 hover:underline text-xs">Cancelar</button>
                            </>
                          )}
                          {d.estado === 'procesada' && d.nota_credito_id && (
                            <button onClick={() => handlePDF(d.nota_credito_id)}
                              className="text-green-600 hover:underline text-xs">Ver NC</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}

          {/* Modal detalle devolución */}
          {devDetalle && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Detalle Devolución {devDetalle.numero}</h3>
                    <p className="text-sm text-gray-500">Estado: <span className="font-medium">{devDetalle.estado.toUpperCase()}</span></p>
                  </div>
                  <button onClick={() => setDevDetalle(null)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
                </div>
                <div className="bg-gray-50 rounded p-3 mb-4 text-sm space-y-1">
                  <p><span className="text-gray-500">Cliente:</span> <span className="font-medium">{devDetalle.cliente_nombre || 'Consumidor Final'}</span></p>
                  <p><span className="text-gray-500">NCF Factura:</span> <span className="font-mono">{devDetalle.factura_ncf || '-'}</span></p>
                  <p><span className="text-gray-500">Motivo:</span> <span className="font-medium">{devDetalle.motivo || '-'}</span></p>
                  <p><span className="text-gray-500">Creada:</span> {new Date(devDetalle.creado_en).toLocaleString('es-DO')}</p>
                  {devDetalle.aprobada_en && <p><span className="text-gray-500">Aprobada:</span> {new Date(devDetalle.aprobada_en).toLocaleString('es-DO')}</p>}
                  {devDetalle.procesada_en && <p><span className="text-gray-500">Procesada:</span> {new Date(devDetalle.procesada_en).toLocaleString('es-DO')}</p>}
                  {devDetalle.cancelada_en && <p><span className="text-gray-500">Cancelada:</span> {new Date(devDetalle.cancelada_en).toLocaleString('es-DO')}</p>}
                </div>
                <table className="w-full text-sm mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Producto</th>
                      <th className="px-3 py-2 text-right text-gray-600">Cant.</th>
                      <th className="px-3 py-2 text-right text-gray-600">Precio</th>
                      <th className="px-3 py-2 text-right text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(devDetalle.items || []).map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{it.descripcion}</td>
                        <td className="px-3 py-2 text-right">{parseFloat(it.cantidad).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">RD${parseFloat(it.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td className="px-3 py-2 text-right font-medium">RD${parseFloat(it.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
  <div className="flex justify-end">
                  <div className="text-sm text-right bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600">Subtotal: <span className="font-medium">RD${parseFloat(devDetalle.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                    <p className="text-gray-600">ITBIS: <span className="font-medium">RD${parseFloat(devDetalle.itbis).toLocaleString('es-DO',{minimumFractionDigits:2})}</span></p>
                    <p className="text-lg font-bold text-orange-600">Total: RD${parseFloat(devDetalle.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => {
                    const d = devDetalle
                    const filas = (d.items || []).map(it => `
                      <tr>
                        <td>${it.descripcion}</td>
                        <td style="text-align:right">${parseFloat(it.cantidad).toFixed(2)}</td>
                        <td style="text-align:right">RD$${parseFloat(it.precio_unitario).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                        <td style="text-align:right">RD$${parseFloat(it.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</td>
                      </tr>`).join('')
                    const empresa = sessionStorage.getItem('tenant_name') || 'Sistema de Facturación'
                    const w = window.open('', '_blank')
                    w.document.write(`
                      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devolución ${d.numero}</title>
                      <style>
                        body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;max-width:700px;margin:0 auto}
                        .header{text-align:center;border-bottom:2px solid #ea580c;padding-bottom:12px;margin-bottom:16px}
                        .empresa{font-size:20px;font-weight:bold;color:#ea580c}
                        .titulo{font-size:14px;color:#64748b;margin-top:4px}
                        .info{background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;line-height:1.7}
                        .info b{color:#334155}
                        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
                        th{background:#ea580c;color:white;padding:8px;text-align:left}
                        td{padding:7px 8px;border-bottom:1px solid #e2e8f0}
                        .totales{text-align:right;font-size:13px;line-height:1.8}
                        .totales .total{font-size:18px;font-weight:bold;color:#ea580c}
                        @media print{button{display:none}}
                      </style></head><body>
                      <div class="header">
                        <div class="empresa">${empresa}</div>
                        <div class="titulo">NOTA DE DEVOLUCIÓN ${d.numero}</div>
                        <div class="titulo">Estado: ${d.estado.toUpperCase()}</div>
                      </div>
                      <div class="info">
                        <div><b>Cliente:</b> ${d.cliente_nombre || 'Consumidor Final'}</div>
                        <div><b>NCF Factura:</b> ${d.factura_ncf || '-'}</div>
                        <div><b>Motivo:</b> ${d.motivo || '-'}</div>
                        <div><b>Creada:</b> ${new Date(d.creado_en).toLocaleString('es-DO')}</div>
                        ${d.aprobada_en ? `<div><b>Aprobada:</b> ${new Date(d.aprobada_en).toLocaleString('es-DO')}</div>` : ''}
                      </div>
                      <table>
                        <thead><tr><th>Producto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
                        <tbody>${filas}</tbody>
                      </table>
                      <div class="totales">
                        <div>Subtotal: RD$${parseFloat(d.subtotal).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
                        <div>ITBIS: RD$${parseFloat(d.itbis).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
                        <div class="total">Total: RD$${parseFloat(d.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</div>
                      </div>
                      <script>window.onload=()=>window.print()</script>
                      </body></html>`)
                    w.document.close()
                  }}
                    className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
                    🖨️ Imprimir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab !== 'fecha' && tab !== 'zona' && tab !== 'vendedor' && tab !== 'producto' && tab !== 'cliente' && tab !== 'chofer' && tab !== 'relacion_vendedor' && tab !== 'cotizacion' && tab !== 'nota_credito' && tab !== 'pedidos' && tab !== 'devoluciones' && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          <p className="text-lg">Módulo en desarrollo...</p>
          <p className="text-sm mt-2">Próximamente disponible</p>
        </div>
      )}

      {/* Modal imprimir Nota de Crédito */}
      {mostrarImprimirNC && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir la Nota de Crédito?</p>
            <div className="flex justify-center gap-6">
   <button
                autoFocus
                id="btn-si-nc"
            onClick={() => {
                  const token = sessionStorage.getItem('token')
                  const formato = localStorage.getItem('formato_impresion') || 'media'
                  let endpoint = '/pdf'
                  if (formato === 'pos') endpoint = '/pdf-pos'
                  else if (formato === 'carta') endpoint = '/pdf-carta'
                  window.open(`/invoices/${ncGuardadaId}${endpoint}?token=${token}`, '_blank')
                  setMostrarImprimirNC(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-no-nc')?.focus() }
                  if (e.key === 'Enter') { const token = sessionStorage.getItem('token'); const formato = localStorage.getItem('formato_impresion') || 'media'; let endpoint = '/pdf'; if (formato === 'pos') endpoint = '/pdf-pos'; else if (formato === 'carta') endpoint = '/pdf-carta'; window.open(`/invoices/${ncGuardadaId}${endpoint}?token=${token}`, '_blank'); setMostrarImprimirNC(false) }
                }}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium">
                Sí
              </button>
          <button
                id="btn-no-nc"
                onClick={() => setMostrarImprimirNC(false)}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-nc')?.focus() }
                  if (e.key === 'Enter') setMostrarImprimirNC(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal imprimir */}
      {mostrarImprimir && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir la factura?</p>
            <div className="flex justify-center gap-6">
         
      {modoPOS && (
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  onClick={() => {
                    imprimirHojaCompleta(facturaGuardadaId)
                    setMostrarImprimir(false)
                  }}>
                  📄 Hoja completa
                </button>
              )}
         <button
                autoFocus
                id="btn-si-imprimir"
        onClick={() => {
                  if (modoPOS) {
                    imprimirTicketRawBT(facturaGuardadaId)
                    setMostrarImprimir(false)
                    return
                  }
                  const token = sessionStorage.getItem('token')
                  const formato = localStorage.getItem('formato_impresion') || 'media'
                  let endpoint = '/pdf'
                  if (formato === 'pos') endpoint = '/pdf-pos'
                  else if (formato === 'carta') endpoint = '/pdf-carta'
                  window.open(`/invoices/${facturaGuardadaId}${endpoint}?token=${token}`, '_blank')
                  setMostrarImprimir(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-no-imprimir')?.focus() }
                 if (e.key === 'Enter') { if (modoPOS) { imprimirTicketRawBT(facturaGuardadaId); setMostrarImprimir(false); return } const token = sessionStorage.getItem('token'); const formato = localStorage.getItem('formato_impresion') || 'media'; let endpoint = '/pdf'; if (formato === 'pos') endpoint = '/pdf-pos'; else if (formato === 'carta') endpoint = '/pdf-carta'; window.open(`/invoices/${facturaGuardadaId}${endpoint}?token=${token}`, '_blank'); setMostrarImprimir(false) }
                }}
             className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                {modoPOS ? '🖨️ Ticket' : 'Sí'}
              </button>
         <button
                id="btn-no-imprimir"
                onClick={() => setMostrarImprimir(false)}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-imprimir')?.focus() }
                  if (e.key === 'Enter') setMostrarImprimir(false)
                }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal autorización descuento */}
      {mostrarAutorizacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">⚠️ Autorización Requerida</h3>
              <p className="text-sm text-gray-600 mt-1">Los siguientes productos tienen un precio MENOR al oficial. Se requiere clave de autorización.</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              {productosConDescuento.map((p, idx) => (
                <div key={idx} className="text-xs mb-2 pb-2 border-b border-yellow-200 last:border-0 last:mb-0 last:pb-0">
                  <p className="font-medium text-gray-800">{p.nombre}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <span className="text-gray-500">Oficial:</span><br/>
                      <span className="font-medium text-blue-600">RD${p.precio_oficial.toLocaleString('es-DO',{minimumFractionDigits:2})}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ingresado:</span><br/>
                      <span className="font-medium text-orange-600">RD${p.precio_ingresado.toLocaleString('es-DO',{minimumFractionDigits:2})}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Diferencia:</span><br/>
                      <span className="font-bold text-red-600">-RD${p.diferencia.toLocaleString('es-DO',{minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errorAutorizacion && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{errorAutorizacion}</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">🔐 Clave de Autorización</label>
              <input type="password"
                value={claveAutorizacion}
                onChange={e => setClaveAutorizacion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleValidarClave() } }}
                placeholder="Ingrese la clave del administrador..."
                autoFocus
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => {
                setMostrarAutorizacion(false)
                setClaveAutorizacion('')
                setProductosConDescuento([])
                setErrorAutorizacion('')
              }}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleValidarClave}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium">
                ✓ Validar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar guardar */}
       
       {mostrarImprimirNcc && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-96">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desea imprimir la Nota de Crédito del conduce?</p>
            <div className="flex justify-center gap-6">
              <button autoFocus id="btn-si-imprimir-ncc"
                onClick={() => { setMostrarImprimirNcc(false); const tokenNcc = sessionStorage.getItem('token'); window.open(`/conduces/nc/${nccGuardadaId}/pdf?token=${tokenNcc}`, '_blank') }}
                onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-no-imprimir-ncc')?.focus() } }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
              <button id="btn-no-imprimir-ncc" onClick={() => setMostrarImprimirNcc(false)}
                onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-imprimir-ncc')?.focus() } }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center w-80">
            <p className="text-lg font-semibold text-gray-800 mb-6">¿Desear Grabar Esta Factura?</p>
            <div className="flex justify-center gap-6">
<button
                autoFocus
                id="btn-si-grabar-factura"
                onClick={handleConfirmarSi}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-volver')?.focus() }
                  if (e.key === 'Enter') handleConfirmarSi()
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium">
                Sí
              </button>
          <button
                id="btn-volver"
                onClick={handleConfirmarVolver}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-si-grabar-factura')?.focus() }
                  if (e.key === 'Enter') handleConfirmarVolver()
                }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium text-gray-700">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'fecha' && (
        <>
          {/* Formulario */}
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Nueva Factura</h3>
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      ref={buscarClienteRef}
                      value={buscarCliente}
                      onChange={e => { setBuscarCliente(e.target.value); setMostrarDropdown(e.target.value.length > 0) }}
                      onBlur={() => setTimeout(() => { setMostrarDropdown(false); setClienteIndex(-1) }, 200)}
                      onKeyDown={e => {
                        const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase()))
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setClienteIndex(i => (i === -1 && buscarCliente.trim() !== '' && filtrados.length > 0) ? 1 : Math.min(i + 1, filtrados.length))
                          setMostrarDropdown(true)
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setClienteIndex(i => Math.max(i - 1, -1))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          if (clienteIndex === 0) {
                            setForm({...form, customer_id: ''}); setBuscarCliente(''); setMostrarDropdown(false); setClienteSeleccionado(null)
                          } else if (clienteIndex > 0 && filtrados[clienteIndex - 1]) {
                            const c = filtrados[clienteIndex - 1]
                         setForm({...form, customer_id: c.id, ncf_tipo: detectarNCFPorCliente(c.tipo)}); setBuscarCliente(c.nombre); setMostrarDropdown(false); setClienteSeleccionado(c)
                          }
                          setClienteIndex(-1)
                         setTimeout(() => { buscarProductoRef.current?.focus(); buscarProductoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 100)
                        } else if (e.key === 'Escape') {
                          setMostrarDropdown(false); setClienteIndex(-1)
                        }
                      }}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {mostrarDropdown && (
                      <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
          {/* Consumidor Final oculto del dropdown
                        <div
                          className={`px-3 py-2 text-sm cursor-pointer text-gray-500 ${clienteIndex === 0 ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                          onMouseEnter={() => setClienteIndex(0)}
                          onMouseDown={() => {
                            setForm({...form, customer_id: ''})
                            setBuscarCliente('')
                            setMostrarDropdown(false)
                            setClienteSeleccionado(null)
                          }}>
                          Consumidor Final
                        </div>
                        */}
                        {clientes
                          .filter(c => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase()))
                          .map(c => (
                            <div key={c.id}
                              className={`px-3 py-2 text-sm cursor-pointer ${
                                clienteIndex === clientes.filter(x => x.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).indexOf(c) + 1
                                  ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'
                              }`}
                              onMouseEnter={() => setClienteIndex(clientes.filter(x => x.nombre.toLowerCase().includes(buscarCliente.toLowerCase())).indexOf(c) + 1)}
                         onMouseDown={() => {
                                setForm({...form, customer_id: c.id, ncf_tipo: detectarNCFPorCliente(c.tipo)})
                                setBuscarCliente(c.nombre)
                                setMostrarDropdown(false)
                                setClienteSeleccionado(c)
                              }}>
                              {c.nombre} {c.telefono ? `- ${c.telefono}` : ''}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info del cliente seleccionado */}
                {clienteSeleccionado && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="font-medium text-gray-600">RNC/Cédula:</span> {clienteSeleccionado.rnc_cedula || '-'}</div>
                    <div><span className="font-medium text-gray-600">Teléfono:</span> {clienteSeleccionado.telefono || '-'}</div>
                    <div><span className="font-medium text-gray-600">Negocio:</span> {clienteSeleccionado.email || '-'}</div>
                    <div><span className="font-medium text-gray-600">Tipo:</span> {clienteSeleccionado.tipo?.replace(/_/g, ' ') || '-'}</div>
                    <div><span className="font-medium text-gray-600">Condiciones:</span> {clienteSeleccionado.condiciones?.replace(/_/g, ' ') || '-'}</div>
                    <div><span className="font-medium text-gray-600">Dirección:</span> {clienteSeleccionado.direccion || '-'}</div>
                    <div><span className="font-medium text-gray-600">Vendedor:</span> {vendedores.find(v => v.id === clienteSeleccionado.vendedor_id)?.nombre || '-'}</div>
                    <div><span className="font-medium text-gray-600">Zona:</span> {zonas.find(z => z.id === clienteSeleccionado.zona_id)?.nombre || '-'}</div>
                  </div>
                )}

                <div className="hidden">
                  <select name="ncf_tipo" value={form.ncf_tipo} onChange={handleFormChange}>
                    <option value="B01">B01 - Consumidor Final</option>
                    <option value="B14">B14 - Régimen Especial</option>
                    <option value="B15">B15 - Gubernamental</option>
                  </select>
                  <input type="date" name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleFormChange} />
                </div>

              {false && (
                  <div className="pos-ticket">
                    <div className="pos-ticket-empresa">{usuarioSesion.empresa || ''}</div>
                    <div className="pos-ticket-cliente">
                      Cliente: {(clientes.find(c => String(c.id) === String(form.customer_id))?.nombre) || 'Consumidor Final'}
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
                                  setItems([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
                                  setBuscarProducto({})
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
                      <div className="pos-ticket-vacio">Agregue artículos abajo</div>
                    )}
                    <div className="pos-ticket-divider"></div>
                    <div className="pos-ticket-tot"><span>SUBTOTAL</span><span>{subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-tot"><span>ITBIS</span><span>{itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-total"><span>TOTAL A PAGAR</span><span>RD${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                )}

          

             {/* Items */}
                                <div className={modoPOS && !posLineaAbierta ? "mb-4 pos-entrada-cerrada" : "mb-4"} style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                  {items.map((item, index) => (
                    <div key={index} className={`grid grid-cols-12 gap-2 mb-2 ${modoPOS && index !== items.length - 1 ? 'pos-item-anterior' : ''}`}>
                      <div className="col-span-3 relative">
                        <input
                          type="text"
                          placeholder="🔍 Buscar Articulos..."
                          ref={el => { buscarProductoRefs.current[index] = el; if (index === 0) buscarProductoRef.current = el }}
                          value={buscarProducto[index] || ''}
                          onChange={e => {
                            setBuscarProducto(prev => ({...prev, [index]: e.target.value}))
                            setMostrarDropdownProducto(prev => ({...prev, [index]: e.target.value.length > 0}))
                          }}
                          onBlur={() => setTimeout(() => { setMostrarDropdownProducto(prev => ({...prev, [index]: false})); setProductoIndex(prev => ({...prev, [index]: -1})) }, 200)}
                          onKeyDown={e => {
                            const filtrados = productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase()))
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              setProductoIndex(prev => ({...prev, [index]: Math.min((prev[index] ?? -1) + 1, filtrados.length - 1)}))
                              setMostrarDropdownProducto(prev => ({...prev, [index]: true}))
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              setProductoIndex(prev => ({...prev, [index]: Math.max((prev[index] ?? 0) - 1, -1)}))
                            } else if (e.key === 'Enter') {
                              e.preventDefault()
                           const idx = productoIndex[index] ?? -1
                              if (idx >= 0 && filtrados[idx]) {
                                const p = filtrados[idx]
                       const padreP = p.articulo_padre_id ? productos.find(x => x.id === p.articulo_padre_id) : null
                                    const factorP = parseFloat(p.factor_empaque || 1) || 1
                                    const stockP = padreP ? Math.floor(parseFloat(padreP.stock_actual || 0) / factorP) : parseFloat(p.stock_actual || 0)
                                    if (usuarioSesion?.features?.stock_negativo !== true && stockP <= 0) {
                                  alert(`⚠️ "${p.nombre}" no tiene existencia en inventario.\n\nNo se puede agregar a la factura.`)
                                  return
                                }
                                if (parseFloat(p.stock_minimo || 0) > 0 && stockP <= parseFloat(p.stock_minimo || 0)) {
                                  alert(`⚠️ STOCK BAJO: "${p.nombre}"\n\nQuedan ${stockP} (mínimo ${parseFloat(p.stock_minimo || 0)}).\n\nSe agregará a la factura, pero considere reabastecer.`)
                                }
                            const yaExisteIdx = items.findIndex((it, i) => i !== index && it.product_id === p.id)
                                if (yaExisteIdx !== -1) {
                                  setItems(prev => prev
                                    .map((it, i) => i === yaExisteIdx ? {...it, cantidad: parseFloat(it.cantidad || 0) + 1} : it)
                                    .filter((_, i) => i !== index))
                                  setBuscarProducto(prev => { const n = {...prev}; delete n[index]; return n })
                                } else {
                                  setItems(prev => prev.map((item, i) => i === index ? {...item, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate, cantidad: modoPOS ? parseFloat(item.cantidad || 1).toFixed(2) : item.cantidad} : item))
                                  setBuscarProducto(prev => ({...prev, [index]: p.nombre}))
                                }
                        setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
                                setProductoIndex(prev => ({...prev, [index]: -1}))
                        if (modoPOS) {
                                  if (yaExisteIdx === -1) setItems(prev => [...prev, { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
                                  setTimeout(() => {
                                    const ultima = document.querySelectorAll('input[placeholder*="Buscar Articulos"]')
                                    ultima[ultima.length - 1]?.focus()
                                  }, 150)
                                } else {
                                  setTimeout(() => cantidadRefs.current[index]?.focus(), 100)
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
                            }
                          }}
                          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {mostrarDropdownProducto[index] && (
                          <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                            {productos
                              .filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase()))
                              .map(p => (
                                <div key={p.id}
                                  className={`px-3 py-2 text-sm cursor-pointer ${(productoIndex[index] ?? -1) === productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p) ? 'bg-blue-200 font-medium' : 'hover:bg-blue-50'}`}
                                  onMouseEnter={() => setProductoIndex(prev => ({...prev, [index]: productos.filter(p => p.nombre.toLowerCase().includes((buscarProducto[index] || '').toLowerCase())).indexOf(p)}))}
                    onMouseDown={() => {
                                    const padreP2 = p.articulo_padre_id ? productos.find(x => x.id === p.articulo_padre_id) : null
                                    const factorP2 = parseFloat(p.factor_empaque || 1) || 1
                                    const stockP2 = padreP2 ? Math.floor(parseFloat(padreP2.stock_actual || 0) / factorP2) : parseFloat(p.stock_actual || 0)
                                    if (usuarioSesion?.features?.stock_negativo !== true && stockP2 <= 0) {
                                      alert(`⚠️ "${p.nombre}" no tiene existencia en inventario.\n\nNo se puede agregar a la factura.`)
                                      return
                                    }
                                    if (parseFloat(p.stock_minimo || 0) > 0 && stockP2 <= parseFloat(p.stock_minimo || 0)) {
                                      alert(`⚠️ STOCK BAJO: "${p.nombre}"\n\nQuedan ${stockP2} (mínimo ${parseFloat(p.stock_minimo || 0)}).\n\nSe agregará a la factura, pero considere reabastecer.`)
                                    }
                                    const yaExisteIdx = items.findIndex((it, i) => i !== index && it.product_id === p.id)
                                    if (yaExisteIdx !== -1) {
                                      setItems(prev => prev
                                        .map((it, i) => i === yaExisteIdx ? {...it, cantidad: parseFloat(it.cantidad || 0) + 1} : it)
                                        .filter((_, i) => i !== index))
                                      setBuscarProducto(prev => { const n = {...prev}; delete n[index]; return n })
                                    } else {
                                      setItems(prev => prev.map((item, i) => i === index ? {...item, product_id: p.id, descripcion: p.nombre, precio_unitario: p.precio, itbis_rate: p.itbis_rate} : item))
                                      setBuscarProducto(prev => ({...prev, [index]: p.nombre}))
                                    }
                                setMostrarDropdownProducto(prev => ({...prev, [index]: false}))
                                   if (modoPOS) {
                                      if (yaExisteIdx === -1) setItems(prev => [...prev, { descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
                                      setTimeout(() => {
                                        const ultima = document.querySelectorAll('input[placeholder*="Buscar Articulos"]')
                                        ultima[ultima.length - 1]?.focus()
                                      }, 150)
                                    }
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
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <input name="precio_unitario" type="number" placeholder="Precio" value={item.precio_unitario} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <input type="text" readOnly
                          value={item.precio_unitario && item.cantidad ? 'RD$' + (parseFloat(item.cantidad||0)*parseFloat(item.precio_unitario||0)).toLocaleString('es-DO',{minimumFractionDigits:2}) : ''}
                          placeholder="Subtotal"
                          className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50 text-right font-medium text-gray-700" />
                      </div>
                      <div className="col-span-1">
                        <select name="itbis_rate" value={item.itbis_rate} onChange={(e) => handleItemChange(index, e)}
                          className="w-full border rounded px-2 py-1.5 text-sm">
                          <option value="18">18%</option>
                          <option value="16">16%</option>
                          <option value="0">0%</option>
                        </select>
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
                    <button type="submit" ref={guardarRef}
                      onKeyDown={e => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); agregarLineaRef.current?.focus() }
                      }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      Guardar
                    </button>
           </div>
                </div>

                {/* Ticket POS en vivo — solo tenants con feature responsive (casa reyes) */}
                              {modoPOS && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[['contado','CONTADO'],['abono','ABONO'],['credito','CREDITO']].map(([v,l]) => (
                        <button key={v} type="button"
                          onClick={() => { setCondicionPago(v); if (v !== 'abono') setMontoAbono('') }}
                          style={{
                            flex: 1, padding: '10px 4px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                            border: condicionPago === v ? '2px solid #2563eb' : '2px solid #cbd5e1',
                            background: condicionPago === v ? '#2563eb' : '#fff',
                            color: condicionPago === v ? '#fff' : '#334155'
                          }}>{l}</button>
                      ))}
                    </div>
                    {condicionPago === 'abono' && (
                      <input type="number" step="0.01" min="0" value={montoAbono}
                        onChange={e => setMontoAbono(e.target.value)}
                        placeholder="Monto del abono"
                        style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '15px', textAlign: 'right', fontWeight: 700 }} />
                    )}
                  </div>
                )}
                {modoPOS && (
                  <div className="pos-ticket">
                    <div className="pos-ticket-empresa">{usuarioSesion.empresa || ''}</div>
                    <div className="pos-ticket-cliente">
                      Cliente: {(clientes.find(c => String(c.id) === String(form.customer_id))?.nombre) || 'Consumidor Final'}
                    </div>
                    <div className="pos-ticket-divider"></div>
                                   <div className="pos-ticket-cols"><span>DESCRIPCION</span><span>VALOR</span></div>
                    <div className="pos-ticket-divider"></div>
                    <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
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
                                  setItems([{ descripcion: '', cantidad: 1, precio_unitario: '', itbis_rate: 18, product_id: '' }])
                                  setBuscarProducto({})
                                }
                              }}>✕</button>
                          </div>
                          <div className="pos-ticket-detalle">
                            <span>
                        <button type="button" className="pos-ticket-mas-menos"
                                onClick={() => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: Math.max(1, (parseFloat(x.cantidad) || 1) - 1).toFixed(2) } : x))}>−</button>
                             <input type="text" inputMode="decimal" value={it.cantidad}
                                onChange={e => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: e.target.value } : x))}
                                onBlur={e => { const v = parseFloat(e.target.value); setItems(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: isNaN(v) || v <= 0 ? '1.00' : v.toFixed(2) } : x)) }}
                                className="pos-ticket-cantidad" />
                              <button type="button" className="pos-ticket-mas-menos"
                                onClick={() => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: ((parseFloat(x.cantidad) || 0) + 1).toFixed(2) } : x))}>+</button>
                            {' x '}
                              <input type="number" min="0" step="any" value={it.precio_unitario}
                                onChange={e => setItems(prev => prev.map((x, xi) => xi === i ? { ...x, precio_unitario: e.target.value } : x))}
                                className="pos-ticket-cantidad" />
                            </span>
                            <span>{(parseFloat(it.cantidad || 0) * parseFloat(it.precio_unitario || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                                        ) : null
                    ))}
                    </div>
                    {items.filter(it => it.descripcion || it.precio_unitario).length === 0 && (
                      <div className="pos-ticket-vacio">Agregue artículos arriba</div>
                    )}
                    <div className="pos-ticket-divider"></div>
                    <div className="pos-ticket-tot"><span>SUBTOTAL</span><span>{subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-tot"><span>ITBIS</span><span>{itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                    <div className="pos-ticket-total"><span>TOTAL A PAGAR</span><span>RD${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                )}

             {/* Totales */}
                <div className="flex justify-end mb-4">
                  <div className="text-sm text-right">
                    {(() => {
                      const pct = Math.min(Math.max(parseFloat(descuentoPct) || 0, 0), 100)
                      const brutoFac = total
                      const montoDesc = brutoFac * (pct / 100)
                      const netoFac = brutoFac - montoDesc
                      const subNetoFac = subtotal * (1 - pct / 100)
                      const itbisNetoFac = itbis * (1 - pct / 100)
                      return <>
                        <p className="text-gray-600">TOTAL BRUTO: <span className="font-medium">RD${brutoFac.toFixed(2)}</span></p>
                        <div className="flex items-center justify-end gap-2 my-1">
                          <label className="text-gray-600">Descuento</label>
                          <input type="number" min="0" max="100" step="any" value={descuentoPct}
                            onChange={e => setDescuentoPct(e.target.value)}
                            placeholder="0"
                            className="w-16 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          <span className="text-gray-600">%</span>
                          <span className="font-medium text-red-600 w-24">-RD${montoDesc.toFixed(2)}</span>
                        </div>
                        <p className="text-gray-600">SUB-TOTAL: <span className="font-medium">RD${subNetoFac.toFixed(2)}</span></p>
                        <p className="text-gray-600">ITBIS: <span className="font-medium">RD${itbisNetoFac.toFixed(2)}</span></p>
                        <p className="text-lg font-bold text-gray-800">Total: RD${netoFac.toFixed(2)}</p>
                      </>
                    })()}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    Guardar 
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50">
                <tr>
        <th className="px-4 py-3 text-left text-gray-600 w-[12%]">NCF</th>
                  <th className="px-4 py-3 text-left text-gray-600 w-[10%]">Cliente</th>
                  <th className="px-4 py-3 text-left text-gray-600 w-[42%]">Total</th>
          <th className="px-4 py-3 text-left text-gray-600 w-[9%]">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600 w-[9%]">Fecha</th>
                <th className="px-4 py-3 text-left text-gray-600 w-[18%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
        
   {(() => {
                  const factsVF = facturasFiltradas.filter(f =>
                    (f.estado === 'emitida' || f.estado === 'pagada') && (!busquedaNcf || (f.ncf || '').toUpperCase().includes(busquedaNcf.toUpperCase()))
                  ).map(f => ({ ...f, _tipoVF: 'factura' }))
                  const condsVF = conducesVenta.filter(cd => {
                    if (cd.estado !== 'emitido' || cd.facturado) return false
                    if (busquedaNcf && !(cd.numero || '').toUpperCase().includes(busquedaNcf.toUpperCase())) return false
                    const d = new Date(cd.creado_en)
                    const fcd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                    if (fechaInicio && fcd < fechaInicio) return false
                    if (fechaFin && fcd > fechaFin) return false
                    return true
                  }).map(cd => ({ ...cd, _tipoVF: 'conduce' }))
                  const todosVF = [...factsVF, ...condsVF].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                  if (todosVF.length === 0) {
                    return <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">{busquedaNcf ? 'No se encontraron documentos' : 'No hay documentos'}</td></tr>
                  }
           return todosVF.map(f => f._tipoVF === 'conduce' ? (() => {
                    const abonadoVF = pagosCd.filter(p => p.conduce_id === f.id && (p.estado === 'confirmado' || !p.estado)).reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                    const ncVF = notasCredito.filter(n => n.conduce_id === f.id && n.estado === 'emitida').reduce((s, n) => s + parseFloat(n.total || 0), 0)
                    const totalVF = parseFloat(f.total || 0) - ncVF
                    const pagadoVF = abonadoVF >= totalVF - 0.01 && parseFloat(f.total || 0) > 0
                    return (
                    <tr key={'cd-' + f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{f.numero || 'CD'} <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-bold">CONDUCE</span></td>
                      <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3">RD${totalVF.toLocaleString('es-DO',{minimumFractionDigits:2})}{abonadoVF > 0 && !pagadoVF && <span className="text-xs text-green-600 ml-1">(Abonado: RD${abonadoVF.toLocaleString('es-DO',{minimumFractionDigits:2})})</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${pagadoVF ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{pagadoVF ? 'PAGADA' : 'CONDUCE'}</span>
                      </td>
               <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString()}</td>
                   <td className="px-4 py-3 flex gap-2 flex-wrap">
                        <button onClick={() => {
                          const tok = sessionStorage.getItem('token')
                          const ventanaCd = window.open(`/conduces/${f.id}/pdf?token=${tok}`, '_blank')
                          if (ventanaCd) {
                            ventanaCd.addEventListener('load', () => {
                              setTimeout(() => { ventanaCd.focus(); ventanaCd.print() }, 1000)
                            })
                          } else {
                            alert('Por favor permite las ventanas emergentes para imprimir')
                          }
                        }}
                          className="text-blue-600 hover:underline text-xs">Imprimir</button>
                        <button onClick={() => { const tok = sessionStorage.getItem('token'); window.open(`/conduces/${f.id}/pdf?token=${tok}`, '_blank') }}
                          className="text-green-600 hover:underline text-xs">PDF</button>
                      </td>
                    </tr>
                    )
                  })() : (
                    <tr key={f.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{f.ncf || 'BORRADOR'}</td>
                      <td className="px-4 py-3">{f.cliente_nombre || 'Consumidor Final'}</td>
                      <td className="px-4 py-3">{parseFloat(f.nc_aplicada) > 0 ? (<span className="text-xs font-medium text-gray-800">Fact: {parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})} − NC# {f.nc_numeros || ''}: {parseFloat(f.nc_aplicada).toLocaleString('es-DO',{minimumFractionDigits:2})} = RD${parseFloat(f.total_neto != null ? f.total_neto : f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>) : (<span>RD${parseFloat(f.total).toLocaleString('es-DO',{minimumFractionDigits:2})}</span>)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${estadoColor(f.estado)}`}>
                          {f.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(f.creado_en).toLocaleDateString()}</td>
                      <td className="px-4 py-3 flex gap-2 flex-wrap">
                        {f.estado === 'borrador' && (
                          <button onClick={() => handleEmitir(f.id)}
                            className="text-blue-600 hover:underline text-xs">Emitir</button>
                        )}
                        {f.estado !== 'borrador' && (
                          <>
                            {puedeVerSubTab('imprimir') && <button onClick={() => handleImprimir(f.id)}
                              className="text-blue-600 hover:underline text-xs">Imprimir</button>}
                            {puedeVerSubTab('pdf') && <button onClick={() => handlePDF(f.id)}
                              className="text-green-600 hover:underline text-xs">PDF</button>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
