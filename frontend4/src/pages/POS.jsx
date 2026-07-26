import { useState, useEffect, useRef } from 'react'
import API from '../services/api'

// ============ HELPERS DE INDEXEDDB (MODO OFFLINE) ============
const DB_NAME = 'pos_offline_db'
const DB_VERSION = 2

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('productos_cache')) {
        db.createObjectStore('productos_cache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('ventas_pendientes')) {
        db.createObjectStore('ventas_pendientes', { keyPath: 'local_id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('clientes_cache')) {
        db.createObjectStore('clientes_cache', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const guardarCache = async (storeName, datos) => {
  try {
    const db = await abrirDB()
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
    for (const d of datos) store.put(d)
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    db.close()
  } catch (e) {
    console.error(`Error guardando cache ${storeName}:`, e)
  }
}

const leerCache = async (storeName) => {
  try {
    const db = await abrirDB()
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    const data = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || [])
      req.onerror = () => rej(req.error)
    })
    db.close()
    return data
  } catch (e) {
    console.error(`Error leyendo cache ${storeName}:`, e)
    return []
  }
}

const guardarVentaPendiente = async (venta) => {
  const db = await abrirDB()
  const tx = db.transaction('ventas_pendientes', 'readwrite')
  tx.objectStore('ventas_pendientes').add(venta)
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
  db.close()
}

const leerVentasPendientes = async () => {
  try {
    const db = await abrirDB()
    const tx = db.transaction('ventas_pendientes', 'readonly')
    const req = tx.objectStore('ventas_pendientes').getAll()
    const data = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || [])
      req.onerror = () => rej(req.error)
    })
    db.close()
    return data
  } catch (e) {
    console.error('Error leyendo ventas pendientes:', e)
    return []
  }
}

const eliminarVentaPendiente = async (local_id) => {
  const db = await abrirDB()
  const tx = db.transaction('ventas_pendientes', 'readwrite')
  tx.objectStore('ventas_pendientes').delete(local_id)
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
  db.close()
}

function POS() {
  const [horaActual, setHoraActual] = useState(new Date())
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [seleccionado, setSeleccionado] = useState(0)
  const [ticket, setTicket] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados de clientes
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [mostrarBuscarCliente, setMostrarBuscarCliente] = useState(false)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [consultandoDgii, setConsultandoDgii] = useState(false)
  const [resultadoDgii, setResultadoDgii] = useState(null)
  const [errorDgii, setErrorDgii] = useState('')

  // Estados de caja
  const [caja, setCaja] = useState(null)
  const [cargandoCaja, setCargandoCaja] = useState(true)
  const [montoApertura, setMontoApertura] = useState('')
  const [errorCaja, setErrorCaja] = useState('')
  const [procesandoCaja, setProcesandoCaja] = useState(false)
  const [mostrarCierre, setMostrarCierre] = useState(false)
  // Desglose de billetes para el cuadre de caja (F3)
  const DENOMINACIONES = [2000, 1000, 500, 200, 100, 50, 25, 20, 10, 5, 1]
  const [conteoBilletes, setConteoBilletes] = useState({})
 const [cierreImpresion, setCierreImpresion] = useState(null)
  // Pago mixto (combinación de métodos en una misma factura)
  const [modoMixto, setModoMixto] = useState(false)
  const [pagosMixto, setPagosMixto] = useState({ efectivo: '', tarjeta: '', transferencia: '' })
  const [resumenCaja, setResumenCaja] = useState(null)
  const [cierreExitoso, setCierreExitoso] = useState(null)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [historialCajas, setHistorialCajas] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // Estados del cobro
  const [mostrarCobro, setMostrarCobro] = useState(false)
  const [formaPago, setFormaPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorCobro, setErrorCobro] = useState('')
  const [ventaExitosa, setVentaExitosa] = useState(null)

  // Estados de descuento
  const [mostrarDescuento, setMostrarDescuento] = useState(false)
  const [descuentoLineaId, setDescuentoLineaId] = useState(null)
  const [descuentoTipo, setDescuentoTipo] = useState('porcentaje')
  const [descuentoValor, setDescuentoValor] = useState('')
  const [descuentoAutorizado, setDescuentoAutorizado] = useState(false)
  const [claveDesc, setClaveDesc] = useState('')
  const [errorDesc, setErrorDesc] = useState('')
  const [procesandoDesc, setProcesandoDesc] = useState(false)
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [codigoEliminar, setCodigoEliminar] = useState('')
  const [claveEliminar, setClaveEliminar] = useState('')
  const [errorEliminar, setErrorEliminar] = useState('')
  const [procesandoEliminar, setProcesandoEliminar] = useState(false)

  // Estados de modo offline
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [pendientes, setPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const inputRef = useRef(null)
  const montoRef = useRef(null)
  const aperturaRef = useRef(null)
  const clienteRef = useRef(null)
  const descValorRef = useRef(null)
  const codigoEliminarRef = useRef(null)
  const sincronizandoRef = useRef(false)

 const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}')
  // Cajero (solo_pos): no ve montos del turno, solo cuenta el efectivo e imprime
  const esSoloPos = usuario?.solo_pos === true

  // NCF según cliente: con RNC → B01, sin cliente o sin RNC → B02
  const tieneRnc = clienteSeleccionado && clienteSeleccionado.rnc_cedula && String(clienteSeleccionado.rnc_cedula).trim() !== ''
  const ncfTipo = tieneRnc ? 'B01' : 'B02'

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Detectar conexión / desconexión
  useEffect(() => {
    const online = () => setEnLinea(true)
    const offline = () => setEnLinea(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  // Contar ventas pendientes al iniciar
  useEffect(() => {
    leerVentasPendientes().then(v => setPendientes(v.length))
  }, [])

  // Sincronizar ventas pendientes cuando hay conexión
  const sincronizarPendientes = async () => {
    if (sincronizandoRef.current) return
    sincronizandoRef.current = true
    setSincronizando(true)
    try {
      const ventas = await leerVentasPendientes()
      for (const v of ventas) {
        try {
          await API.post('/invoices', v.payload)
          await eliminarVentaPendiente(v.local_id)
          setPendientes(prev => Math.max(0, prev - 1))
        } catch (err) {
          console.error('Error sincronizando venta pendiente:', err)
          break
        }
      }
    } finally {
      sincronizandoRef.current = false
      setSincronizando(false)
    }
  }

  // Auto-sincronizar al volver la conexión y al cargar
  useEffect(() => {
    if (enLinea && pendientes > 0) {
      sincronizarPendientes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLinea, pendientes])

  // Consultar caja abierta al iniciar
  useEffect(() => {
    const consultarCaja = async () => {
      try {
        const res = await API.get('/pos/caja/actual')
        setCaja(res.data.data)
      } catch (err) {
        console.error('Error consultando caja:', err)
      } finally {
        setCargandoCaja(false)
      }
    }
    consultarCaja()
  }, [])

  // Cargar productos al iniciar (con cache offline)
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const res = await API.get('/products')
        const lista = res.data.data || []
        setProductos(lista)
        guardarCache('productos_cache', lista)
      } catch (err) {
        console.error('Error cargando productos, usando cache:', err)
        const cache = await leerCache('productos_cache')
        setProductos(cache)
      } finally {
        setCargando(false)
      }
    }
    cargarProductos()
  }, [])

  // Cargar clientes al iniciar (con cache offline)
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const res = await API.get('/customers')
        const lista = res.data.data || []
        setClientes(lista)
        guardarCache('clientes_cache', lista)
      } catch (err) {
        console.error('Error cargando clientes, usando cache:', err)
        const cache = await leerCache('clientes_cache')
        setClientes(cache)
      }
    }
    cargarClientes()
  }, [])

  // Foco en apertura de caja
  useEffect(() => {
    if (!cargandoCaja && !caja && aperturaRef.current) aperturaRef.current.focus()
  }, [cargandoCaja, caja])

  // Foco permanente en la búsqueda
  useEffect(() => {
    if (caja && !cargando && !mostrarCobro && !ventaExitosa && !mostrarCierre && !mostrarDescuento && inputRef.current) {
      inputRef.current.focus()
    }
  }, [caja, cargando, mostrarCobro, ventaExitosa, mostrarCierre, mostrarDescuento])

// Foco en el monto al abrir cobro (si no está buscando cliente)
  useEffect(() => {
    if (mostrarCobro && !mostrarBuscarCliente && montoRef.current) montoRef.current.focus()
  }, [mostrarCobro, mostrarBuscarCliente])
  // Flechas ← → para cambiar la forma de pago en el modal de cobro
useEffect(() => {
if (!mostrarCobro || mostrarBuscarCliente) return
    const filas = modoMixto
      ? [
          ['cobro-cliente'],
          ['cobro-mixto'],
          ['mixto-efectivo'],
          ['mixto-tarjeta'],
          ['mixto-transferencia'],
          ['cobro-cancelar', 'cobro-confirmar']
        ]
      : [
          ['cobro-cliente'],
          ['cobro-mixto'],
          ['metodo-efectivo', 'metodo-tarjeta', 'metodo-transferencia'],
          ...(formaPago === 'efectivo' ? [['cobro-recibido']] : []),
          ['cobro-cancelar', 'cobro-confirmar']
        ]
    const posicion = () => {
      const id = document.activeElement?.id
      for (let f = 0; f < filas.length; f++) {
        const c = filas[f].indexOf(id)
        if (c >= 0) return [f, c]
      }
      return [-1, -1]
    }
    const ir = (f, c) => {
      const fila = filas[f]
      if (!fila) return
      document.getElementById(fila[Math.min(c, fila.length - 1)])?.focus()
    }
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const [f, c] = posicion()
      if (f === -1) { ir(filas.length - 1, 1); return }
      if (e.key === 'ArrowDown') ir(Math.min(f + 1, filas.length - 1), c)
      else if (e.key === 'ArrowUp') ir(Math.max(f - 1, 0), c)
      else if (e.key === 'ArrowRight') ir(f, Math.min(c + 1, filas[f].length - 1))
      else if (e.key === 'ArrowLeft') ir(f, Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
}, [mostrarCobro, mostrarBuscarCliente, modoMixto, formaPago])

  // Foco en búsqueda de cliente
  useEffect(() => {
    if (mostrarBuscarCliente && clienteRef.current) clienteRef.current.focus()
  }, [mostrarBuscarCliente])

  // Foco en valor de descuento
  useEffect(() => {
  if (mostrarDescuento && descValorRef.current) descValorRef.current.focus()
  }, [mostrarDescuento])
  // NAVEGACIÓN POR TECLADO EN EL MODAL DE DESCUENTO (sin mouse)
  useEffect(() => {
    if (!mostrarDescuento) return
    const filas = [
      ['desc-porcentaje', 'desc-monto'],
      ['desc-valor'],
      ...(!descuentoAutorizado ? [['desc-clave']] : []),
      ['desc-cancelar', 'desc-aplicar']
    ]
    const posicion = () => {
      const id = document.activeElement?.id
      for (let f = 0; f < filas.length; f++) {
        const c = filas[f].indexOf(id)
        if (c >= 0) return [f, c]
      }
      return [-1, -1]
    }
    const ir = (f, c) => {
      const fila = filas[f]
      if (!fila) return
      document.getElementById(fila[Math.min(c, fila.length - 1)])?.focus()
    }
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const [f, c] = posicion()
      if (f === -1) { ir(filas.length - 1, 1); return }
      if (e.key === 'ArrowDown') ir(Math.min(f + 1, filas.length - 1), c)
      else if (e.key === 'ArrowUp') ir(Math.max(f - 1, 0), c)
      else if (e.key === 'ArrowRight') ir(f, Math.min(c + 1, filas[f].length - 1))
      else if (e.key === 'ArrowLeft') ir(f, Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mostrarDescuento, descuentoAutorizado])

// Foco en código de eliminar
  useEffect(() => {
if (mostrarEliminar && codigoEliminarRef.current) codigoEliminarRef.current.focus()
  }, [mostrarEliminar])
  // NAVEGACIÓN POR TECLADO EN EL MODAL DE ELIMINAR (sin mouse)
  useEffect(() => {
    if (!mostrarEliminar) return
    const filas = [
      ['elim-codigo'],
      ['elim-clave'],
      ['elim-cancelar', 'elim-confirmar']
    ]
    const posicion = () => {
      const id = document.activeElement?.id
      for (let f = 0; f < filas.length; f++) {
        const c = filas[f].indexOf(id)
        if (c >= 0) return [f, c]
      }
      return [-1, -1]
    }
    const ir = (f, c) => {
      const fila = filas[f]
      if (!fila) return
      document.getElementById(fila[Math.min(c, fila.length - 1)])?.focus()
    }
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const [f, c] = posicion()
      if (f === -1) { ir(filas.length - 1, 1); return }
      if (e.key === 'ArrowDown') ir(Math.min(f + 1, filas.length - 1), c)
      else if (e.key === 'ArrowUp') ir(Math.max(f - 1, 0), c)
      else if (e.key === 'ArrowRight') ir(f, Math.min(c + 1, filas[f].length - 1))
      else if (e.key === 'ArrowLeft') ir(f, Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mostrarEliminar])
// Foco en el primer billete al abrir el cierre de caja (F3)
  useEffect(() => {
    if (mostrarCierre) {
      setTimeout(() => document.getElementById('billete-2000')?.focus(), 120)
    }
  }, [mostrarCierre])
  // Pantalla CAJA CERRADA: foco en IMPRIMIR y navegación con flechas
  useEffect(() => {
    if (!cierreExitoso) return
    setTimeout(() => document.getElementById('btn-imprimir-cuadre')?.focus(), 150)
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        document.getElementById('btn-aceptar-cierre')?.focus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        document.getElementById('btn-imprimir-cuadre')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cierreExitoso])

// TECLAS F1 = COBRAR / F2 = DESCUENTO / F3 = CERRAR CAJA / F4 = ELIMINAR (globales en el POS)
  useEffect(() => {
    const manejarTeclasGlobales = (e) => {
      const modalAbierto = mostrarCobro || ventaExitosa || mostrarCierre || mostrarDescuento || mostrarEliminar
      if (e.key === 'F1') {
        e.preventDefault()
        if (caja && !modalAbierto && ticket.length > 0) {
          setFormaPago('efectivo')
          setMontoRecibido('')
          setErrorCobro('')
          setMostrarCobro(true)
        }
      } else if (e.key === 'F2') {
        e.preventDefault()
        if (caja && !modalAbierto && ticket.length > 0) {
          abrirDescuentoGlobal()
        }
      } else if (e.key === 'F3') {
        e.preventDefault()
        if (caja && !modalAbierto) {
          abrirCierre()
        }
  } else if (e.key === 'F4') {
        e.preventDefault()
        if (caja && !modalAbierto && ticket.length > 0) {
          abrirEliminar()
        }
      } else if (e.key === '+' || e.key === 'Add') {
        e.preventDefault()
        if (caja && !modalAbierto && ticket.length > 0) {
          const ultima = ticket[ticket.length - 1]
          cambiarCantidad(ultima.id, ultima.cantidad + 1)
        }
      } else if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault()
        if (caja && !modalAbierto && ticket.length > 0) {
          const ultima = ticket[ticket.length - 1]
          if (ultima.cantidad > 1) cambiarCantidad(ultima.id, ultima.cantidad - 1)
        }
      }
    }
    window.addEventListener('keydown', manejarTeclasGlobales)
    return () => window.removeEventListener('keydown', manejarTeclasGlobales)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caja, mostrarCobro, ventaExitosa, mostrarCierre, mostrarDescuento, mostrarEliminar, ticket])

  // Buscar productos mientras escribe
  useEffect(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) {
      setResultados([])
      setSeleccionado(0)
      return
    }
    const encontrados = productos.filter(p =>
      (p.codigo && p.codigo.toLowerCase().includes(texto)) ||
      (p.nombre && p.nombre.toLowerCase().includes(texto))
    ).slice(0, 8)
    setResultados(encontrados)
    setSeleccionado(0)
  }, [busqueda, productos])

  // Clientes filtrados por búsqueda (nombre o RNC)
  const clientesFiltrados = busquedaCliente.trim()
    ? clientes.filter(c => {
        const texto = busquedaCliente.trim().toLowerCase()
        return (
          (c.nombre && c.nombre.toLowerCase().includes(texto)) ||
          (c.rnc_cedula && String(c.rnc_cedula).toLowerCase().includes(texto))
        )
      }).slice(0, 8)
    : []

  // Seleccionar cliente
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setMostrarBuscarCliente(false)
    setBusquedaCliente('')
  }

  // Quitar cliente (volver a CONSUMIDOR FINAL)
  const quitarCliente = () => {
    setClienteSeleccionado(null)
    setMostrarBuscarCliente(false)
    setBusquedaCliente('')
    setResultadoDgii(null)
    setErrorDgii('')
  }

  // ¿Lo escrito parece un RNC (9) o cédula (11)?
  const soloDigitos = busquedaCliente.replace(/\D/g, '')
  const pareceRnc = soloDigitos.length === 9 || soloDigitos.length === 11

  // Consultar RNC en la DGII
  const consultarDgii = async () => {
    if (consultandoDgii || !pareceRnc) return
    setConsultandoDgii(true)
    setErrorDgii('')
    setResultadoDgii(null)
    try {
      const res = await API.get(`/pos/consulta-rnc/${soloDigitos}`)
      if (res.data.data) {
        setResultadoDgii(res.data.data)
      } else {
        setErrorDgii('RNC no encontrado en la DGII')
      }
    } catch (err) {
      console.error('Error consultando DGII:', err)
      setErrorDgii(err.response?.data?.mensaje || 'No se pudo consultar la DGII')
    } finally {
      setConsultandoDgii(false)
    }
  }

  // Usar el resultado de la DGII: crear cliente automáticamente y seleccionarlo
  const usarClienteDgii = async () => {
    if (!resultadoDgii || consultandoDgii) return
    setConsultandoDgii(true)
    setErrorDgii('')
    try {
      const res = await API.post('/customers', {
        nombre: resultadoDgii.nombre || resultadoDgii.nombre_comercial || `RNC ${resultadoDgii.rnc}`,
        rnc_cedula: resultadoDgii.rnc,
        tipo: 'empresa'
      })
      const nuevo = res.data.data || res.data
      setClientes(prev => [...prev, nuevo])
      seleccionarCliente(nuevo)
      setResultadoDgii(null)
    } catch (err) {
      console.error('Error creando cliente desde DGII:', err)
      const existente = clientes.find(c => String(c.rnc_cedula || '').replace(/\D/g, '') === String(resultadoDgii.rnc).replace(/\D/g, ''))
      if (existente) {
        seleccionarCliente(existente)
        setResultadoDgii(null)
      } else {
        setErrorDesc('')
        setErrorDgii(err.response?.data?.mensaje || 'No se pudo registrar el cliente')
      }
    } finally {
      setConsultandoDgii(false)
    }
  }

  // ============ DESCUENTOS ============

  // Abrir modal de descuento para UNA línea
  const abrirDescuentoLinea = (id) => {
    setDescuentoLineaId(id)
    setDescuentoTipo('porcentaje')
    setDescuentoValor('')
    setClaveDesc('')
    setErrorDesc('')
    setMostrarDescuento(true)
  }

  // Abrir modal de descuento GLOBAL (todo el ticket)
  const abrirDescuentoGlobal = () => {
    if (ticket.length === 0) return
    setDescuentoLineaId(null)
    setDescuentoTipo('porcentaje')
    setDescuentoValor('')
    setClaveDesc('')
    setErrorDesc('')
    setMostrarDescuento(true)
  }

  // Quitar descuento de una línea (restaurar precio original, sin clave)
  const quitarDescuentoLinea = (id) => {
    setTicket(prev => prev.map(l => l.id === id ? { ...l, precio: l.precio_original } : l))
    if (inputRef.current) inputRef.current.focus()
  }

  // Aplicar descuento (valida clave si aún no está autorizado)
  const aplicarDescuento = async () => {
    if (procesandoDesc) return
    const valor = parseFloat(descuentoValor)
    if (isNaN(valor) || valor <= 0) {
      setErrorDesc('Ingrese un valor válido mayor que 0')
      return
    }
    if (descuentoTipo === 'porcentaje' && valor >= 100) {
      setErrorDesc('El porcentaje debe ser menor que 100')
      return
    }

    // Validar clave (solo la primera vez por ticket)
    if (!descuentoAutorizado) {
      if (!claveDesc.trim()) {
        setErrorDesc('Ingrese la clave de autorización')
        return
      }
      setProcesandoDesc(true)
      setErrorDesc('')
      try {
        const res = await API.post('/mantenimiento/validar-clave-descuento', { clave: claveDesc })
        if (!res.data.success) {
          setErrorDesc('Clave incorrecta')
          setProcesandoDesc(false)
          return
        }
        setDescuentoAutorizado(true)
      } catch (err) {
        setErrorDesc(err.response?.data?.mensaje || 'Clave incorrecta')
        setProcesandoDesc(false)
        return
      }
      setProcesandoDesc(false)
    }

    // Aplicar el descuento (siempre sobre el precio ORIGINAL, no se acumula)
    if (descuentoLineaId) {
      // Descuento a UNA línea
      const linea = ticket.find(l => l.id === descuentoLineaId)
      if (!linea) { setMostrarDescuento(false); return }
      let nuevoPrecio
      if (descuentoTipo === 'porcentaje') {
        nuevoPrecio = linea.precio_original * (1 - valor / 100)
      } else {
        // Monto RD$ sobre el total de la línea → se reparte por cantidad
        const totalLineaOriginal = linea.precio_original * linea.cantidad
        if (valor >= totalLineaOriginal) {
          setErrorDesc(`El descuento no puede ser mayor o igual al total de la línea (RD$ ${totalLineaOriginal.toFixed(2)})`)
          return
        }
        nuevoPrecio = (totalLineaOriginal - valor) / linea.cantidad
      }
      setTicket(prev => prev.map(l => l.id === descuentoLineaId ? { ...l, precio: nuevoPrecio } : l))
    } else {
      // Descuento GLOBAL: se prorratea entre todas las líneas
      const totalOriginal = ticket.reduce((acc, l) => acc + l.precio_original * l.cantidad, 0)
      let factor
      if (descuentoTipo === 'porcentaje') {
        factor = 1 - valor / 100
      } else {
        if (valor >= totalOriginal) {
          setErrorDesc(`El descuento no puede ser mayor o igual al total (RD$ ${totalOriginal.toFixed(2)})`)
          return
        }
        factor = 1 - valor / totalOriginal
      }
      setTicket(prev => prev.map(l => ({ ...l, precio: l.precio_original * factor })))
    }

    setMostrarDescuento(false)
    setDescuentoValor('')
    setClaveDesc('')
    if (inputRef.current) inputRef.current.focus()
  }

  // Abrir modal de eliminar artículo (F4)
  const abrirEliminar = () => {
    if (ticket.length === 0) return
    setCodigoEliminar('')
    setClaveEliminar('')
    setErrorEliminar('')
    setMostrarEliminar(true)
  }

  // Línea encontrada por el código escaneado
  const lineaAEliminar = codigoEliminar.trim()
    ? ticket.find(l => (l.codigo || '').toLowerCase() === codigoEliminar.trim().toLowerCase())
    : null

  // Confirmar eliminación (valida clave)
  const confirmarEliminar = async () => {
    if (procesandoEliminar) return
    if (!lineaAEliminar) {
      setErrorEliminar('Escanee o escriba el código de un artículo que esté en el ticket')
      return
    }
    if (!claveEliminar.trim()) {
      setErrorEliminar('Ingrese la clave de autorización')
      return
    }
    setProcesandoEliminar(true)
    setErrorEliminar('')
    try {
      const res = await API.post('/mantenimiento/validar-clave-descuento', { clave: claveEliminar })
      if (!res.data.success) {
        setErrorEliminar('Clave incorrecta')
        setProcesandoEliminar(false)
        return
      }
      setTicket(prev => prev.filter(l => l.id !== lineaAEliminar.id))
      setMostrarEliminar(false)
      if (inputRef.current) inputRef.current.focus()
    } catch (err) {
      setErrorEliminar(err.response?.data?.mensaje || 'Clave incorrecta')
    } finally {
      setProcesandoEliminar(false)
    }
  }

  // Abrir caja
  const abrirCaja = async () => {
    if (procesandoCaja) return
    const monto = parseFloat(montoApertura)
    if (isNaN(monto) || monto < 0) {
      setErrorCaja('Ingrese un monto válido (0 o mayor)')
      return
    }
    setProcesandoCaja(true)
    setErrorCaja('')
    try {
      const res = await API.post('/pos/caja/abrir', {
        monto_apertura: monto,
        usuario_nombre: usuario?.nombre || usuario?.usuario || null
      })
      setCaja(res.data.data)
      setMontoApertura('')
    } catch (err) {
      console.error('Error abriendo caja:', err)
      setErrorCaja(err.response?.data?.mensaje || 'Error abriendo caja. Verifique su conexión.')
    } finally {
      setProcesandoCaja(false)
    }
  }

  // Abrir historial de cajas cerradas
  const abrirHistorial = async () => {
    setCargandoHistorial(true)
    setMostrarHistorial(true)
    try {
      const res = await API.get('/pos/caja/historial')
      setHistorialCajas(res.data.data || [])
    } catch (err) {
      console.error('Error cargando historial de cajas:', err)
      setHistorialCajas([])
    } finally {
      setCargandoHistorial(false)
    }
  }

  const fmtFecha = (f) => {
    if (!f) return 'N/D'
    return new Date(f).toLocaleString('es-DO', {
      timeZone: 'America/Santo_Domingo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

// Cuadre de efectivo (desglose de billetes)
  const totalContado = DENOMINACIONES.reduce(
    (acc, d) => acc + (parseInt(conteoBilletes[d], 10) || 0) * d, 0
  )
  const efectivoEsperadoCaja = resumenCaja ? parseFloat(resumenCaja.efectivo_esperado) || 0 : 0
  const diferenciaCaja = totalContado - efectivoEsperadoCaja

  // Imprimir el cuadre de caja
  const imprimirCuadre = (c) => {
    if (!c) return
    const w = window.open('', '_blank')
    if (!w) { alert('⚠️ Habilite las ventanas emergentes para imprimir.'); return }
    const desg = c.desglose_efectivo || {}
    const filasDesg = DENOMINACIONES
      .filter(d => (parseInt(desg[d], 10) || 0) > 0)
      .map(d => {
        const cant = parseInt(desg[d], 10) || 0
        return `<tr><td style="text-align:center">${cant}</td><td style="text-align:center">x ${fmt(d)}</td><td style="text-align:right">${fmt(cant * d)}</td></tr>`
      }).join('')
    const dif = c.diferencia === null || c.diferencia === undefined ? null : parseFloat(c.diferencia)
    const etiqueta = dif === null ? 'SIN CONTEO' : (Math.abs(dif) < 0.01 ? 'CUADRADO' : (dif > 0 ? 'SOBRANTE' : 'FALTANTE'))
    const colorDif = dif === null ? '#64748b' : (Math.abs(dif) < 0.01 ? '#16a34a' : (dif > 0 ? '#2563eb' : '#dc2626'))
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cuadre de Caja</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;max-width:480px;margin:0 auto}
      h2{text-align:center;margin:0 0 4px}
      p.sub{text-align:center;color:#64748b;font-size:12px;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}
      th{background:#374151;color:#fff;padding:6px;text-align:left}
      td{padding:5px 6px;border-bottom:1px solid #e2e8f0}
      .row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
      .tot{border-top:2px solid #334155;margin-top:6px;padding-top:6px;font-weight:bold;font-size:15px}
      .dif{margin-top:12px;padding:10px;border-radius:6px;color:#fff;display:flex;justify-content:space-between;font-weight:bold;font-size:16px;background:${colorDif}}
    </style></head><body>
      <h2>CUADRE DE CAJA</h2>
      <p class="sub">Operador: ${c.usuario_nombre || 'N/D'}<br>
      Apertura: ${fmtFecha(c.fecha_apertura)} &nbsp;|&nbsp; Cierre: ${fmtFecha(c.fecha_cierre)}</p>
      <div class="row"><span>Monto de apertura:</span><b>RD$ ${fmt(c.monto_apertura)}</b></div>
      <div class="row"><span>Facturas del turno:</span><b>${c.cantidad_facturas || 0}</b></div>
      <div class="row"><span>Ventas en efectivo:</span><b>RD$ ${fmt(c.total_efectivo)}</b></div>
      <div class="row"><span>Ventas con tarjeta:</span><b>RD$ ${fmt(c.total_tarjeta)}</b></div>
      <div class="row"><span>Transferencias:</span><b>RD$ ${fmt(c.total_transferencia)}</b></div>
      <div class="row"><span>Total de ventas:</span><b>RD$ ${fmt(c.total_ventas)}</b></div>
      <div class="row tot"><span>EFECTIVO ESPERADO:</span><span>RD$ ${fmt(c.efectivo_esperado)}</span></div>
      ${filasDesg ? `<h4 style="margin:16px 0 6px">Detalle de Efectivo</h4>
      <table><thead><tr><th style="text-align:center">Cant.</th><th style="text-align:center">Billete</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${filasDesg}</tbody></table>` : ''}
      <div class="row tot"><span>TOTAL CONTADO:</span><span>RD$ ${fmt(c.efectivo_contado || 0)}</span></div>
      <div class="dif"><span>${etiqueta}</span><span>${dif !== null && dif > 0 ? '+' : ''}RD$ ${fmt(dif || 0)}</span></div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:24px">_______________________<br>Firma del cajero</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
    </body></html>`)
    w.document.close()
  }

  // Abrir pantalla de cierre (cargar resumen)
  const abrirCierre = async () => {
    if (pendientes > 0) {
      alert(`⚠️ Hay ${pendientes} venta(s) pendiente(s) de sincronizar.\n\nEspere a que se sincronicen antes de cerrar la caja para que el cuadre sea correcto.`)
      return
    }
    try {
      const res = await API.get('/pos/caja/resumen')
     setResumenCaja(res.data.data)
      setConteoBilletes({})
      setMostrarCierre(true)
    } catch (err) {
      console.error('Error cargando resumen:', err)
    }
  }

  // Confirmar cierre de caja
  const confirmarCierre = async () => {
    if (procesandoCaja) return
    setProcesandoCaja(true)
    try {
     const desglose = {}
      DENOMINACIONES.forEach(d => {
        const c = parseInt(conteoBilletes[d], 10) || 0
        if (c > 0) desglose[d] = c
      })
      const res = await API.post('/pos/caja/cerrar', {
        desglose_efectivo: desglose,
        efectivo_contado: totalContado
      })
      setCierreExitoso(res.data.data)
      setConteoBilletes({})
      setMostrarCierre(false)
      setCaja(null)
      setTicket([])
      setDescuentoAutorizado(false)
    } catch (err) {
      console.error('Error cerrando caja:', err)
    } finally {
      setProcesandoCaja(false)
    }
  }

  // Agregar producto al ticket
  const agregarAlTicket = (producto) => {
    setTicket(prev => {
      const existe = prev.find(l => l.id === producto.id)
      if (existe) {
        return prev.map(l =>
          l.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l
        )
      }
      return [...prev, {
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        precio: parseFloat(producto.precio),
        precio_original: parseFloat(producto.precio),
        itbis_rate: parseFloat(producto.itbis_rate || 18),
        cantidad: 1
      }]
    })
    setBusqueda('')
    setResultados([])
    setSeleccionado(0)
    if (inputRef.current) inputRef.current.focus()
  }

  // Teclas en la búsqueda
  const manejarTeclas = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const texto = busqueda.trim().toLowerCase()
      if (!texto) return
      const porCodigo = productos.find(p => p.codigo && p.codigo.toLowerCase() === texto)
      if (porCodigo) {
        agregarAlTicket(porCodigo)
        return
      }
      if (resultados.length > 0) {
        agregarAlTicket(resultados[seleccionado] || resultados[0])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSeleccionado(prev => Math.min(prev + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSeleccionado(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Escape') {
      setBusqueda('')
      setResultados([])
    }
  }

  // Cambiar cantidad de una línea
  const cambiarCantidad = (id, nuevaCantidad) => {
    const cant = parseFloat(nuevaCantidad)
    if (isNaN(cant) || cant <= 0) return
    setTicket(prev => prev.map(l => l.id === id ? { ...l, cantidad: cant } : l))
  }

  // Eliminar línea del ticket
  const eliminarLinea = (id) => {
    setTicket(prev => prev.filter(l => l.id !== id))
    if (inputRef.current) inputRef.current.focus()
  }

  // Totales (precios con ITBIS INCLUIDO — se desglosa)
  const totalGeneral = ticket.reduce((acc, l) => acc + l.precio * l.cantidad, 0)
  const baseGeneral = ticket.reduce((acc, l) => {
    const lineaTotal = l.precio * l.cantidad
    return acc + lineaTotal / (1 + l.itbis_rate / 100)
  }, 0)
  const itbisGeneral = totalGeneral - baseGeneral
  const totalOriginalTicket = ticket.reduce((acc, l) => acc + l.precio_original * l.cantidad, 0)
  const descuentoTotalTicket = totalOriginalTicket - totalGeneral
// Devuelta
  const recibido = parseFloat(montoRecibido) || 0
  const devuelta = recibido - totalGeneral

  // Pago mixto: suma de los métodos y lo que falta por cubrir
  const totalMixto = ['efectivo', 'tarjeta', 'transferencia']
    .reduce((acc, m) => acc + (parseFloat(pagosMixto[m]) || 0), 0)
  const faltaMixto = totalGeneral - totalMixto

  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Abrir ventana de cobro
  const abrirCobro = () => {
    if (ticket.length === 0) return
setFormaPago('efectivo')
    setMontoRecibido('')
    setModoMixto(false)
    setPagosMixto({ efectivo: '', tarjeta: '', transferencia: '' })
    setErrorCobro('')
    setMostrarCobro(true)
  }

  // Confirmar cobro → crear FACTURA REAL (o guardar offline)
  const confirmarCobro = async () => {
if (procesando) return
    if (modoMixto) {
      if (totalMixto <= 0) {
        setErrorCobro('Debe ingresar al menos un monto')
        return
      }
      if (Math.abs(faltaMixto) > 0.009) {
        setErrorCobro(faltaMixto > 0
          ? `Faltan RD$ ${fmt(faltaMixto)} por cubrir`
          : `El monto excede el total en RD$ ${fmt(Math.abs(faltaMixto))}`)
        return
      }
      if (!enLinea) {
        setErrorCobro('El pago mixto requiere conexión a internet')
        return
      }
    } else if (formaPago === 'efectivo' && recibido < totalGeneral) {
      setErrorCobro('El monto recibido es menor que el total')
      return
    }
    setProcesando(true)
    setErrorCobro('')
    const METODOS_MIX = ['efectivo', 'tarjeta', 'transferencia']
    const detallePagos = modoMixto
      ? METODOS_MIX.filter(m => (parseFloat(pagosMixto[m]) || 0) > 0)
          .map(m => ({ metodo: m, monto: parseFloat(pagosMixto[m]) }))
      : [{ metodo: formaPago, monto: totalGeneral }]
    const etiquetaPago = modoMixto
      ? 'Mixto (' + detallePagos.map(p => `${p.metodo === 'efectivo' ? 'Efectivo' : p.metodo === 'tarjeta' ? 'Tarjeta' : 'Transferencia'} RD$ ${p.monto.toFixed(2)}`).join(' + ') + ')'
      : (formaPago === 'efectivo' ? 'Efectivo' : formaPago === 'tarjeta' ? 'Tarjeta' : 'Transferencia')
    const notaDescuento = descuentoTotalTicket > 0.009 ? ` | Descuento: RD$ ${descuentoTotalTicket.toFixed(2)}` : ''
    const payload = {
      customer_id: clienteSeleccionado ? clienteSeleccionado.id : '',
      ncf_tipo: ncfTipo,
      notas: `POS - Pago: ${etiquetaPago}${notaDescuento}`,
      fecha_vencimiento: '',
      estado: 'emitida',
      items: ticket.map(l => ({
        product_id: l.id,
        descripcion: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio,
        itbis_rate: l.itbis_rate
      }))
    }
    const nombreClienteVenta = clienteSeleccionado ? clienteSeleccionado.nombre : 'CONSUMIDOR FINAL'
    try {
const res = await API.post('/invoices', payload)
      const factura = res.data.data || res.data
      // Registrar el desglose real de pago (soporta mixto y simple)
      try {
        await API.post('/pos/pagos', { invoice_id: factura.id, pagos: detallePagos })
      } catch (e) {
        console.error('Error registrando desglose de pago:', e)
      }
      setVentaExitosa({
        offline: false,
        id: factura.id,
        ncf: factura.ncf || 'N/D',
        numero: factura.numero_factura || 'N/D',
        cliente: nombreClienteVenta,
        total: totalGeneral,
        descuento: descuentoTotalTicket,
        recibido: modoMixto ? totalGeneral : (formaPago === 'efectivo' ? recibido : totalGeneral),
        devuelta: modoMixto ? 0 : (formaPago === 'efectivo' ? devuelta : 0),
        pago: etiquetaPago
      })
 setMostrarCobro(false)
      setTicket([])
      setClienteSeleccionado(null)
      setDescuentoAutorizado(false)
      setModoMixto(false)
      setPagosMixto({ efectivo: '', tarjeta: '', transferencia: '' })
      setMontoRecibido('')
    } catch (err) {
      // Error de RED (sin conexión) → guardar venta offline
      if (!err.response) {
        try {
          await guardarVentaPendiente({ payload, fecha_local: new Date().toISOString() })
          setPendientes(prev => prev + 1)
          setVentaExitosa({
            offline: true,
            id: null,
            ncf: 'PENDIENTE',
            numero: 'PENDIENTE',
            cliente: nombreClienteVenta,
            total: totalGeneral,
            descuento: descuentoTotalTicket,
            recibido: formaPago === 'efectivo' ? recibido : totalGeneral,
            devuelta: formaPago === 'efectivo' ? devuelta : 0,
            pago: etiquetaPago
          })
          setMostrarCobro(false)
          setTicket([])
          setClienteSeleccionado(null)
          setDescuentoAutorizado(false)
        } catch (e2) {
          console.error('Error guardando venta offline:', e2)
          setErrorCobro('Sin conexión y no se pudo guardar localmente. Intente de nuevo.')
        }
      } else {
        console.error('Error creando factura:', err)
        setErrorCobro(err.response?.data?.mensaje || 'Error al crear la factura. Intente de nuevo.')
      }
    } finally {
      setProcesando(false)
    }
  }

  // Nueva venta después del éxito
  const nuevaVenta = () => {
   setVentaExitosa(null)
    setModoMixto(false)
    setPagosMixto({ efectivo: '', tarjeta: '', transferencia: '' })
    setMontoRecibido('')
    setBusqueda('')
    if (inputRef.current) inputRef.current.focus()
  }

  // Enter en el modal de cobro (solo si no está en búsqueda de cliente)
  const teclasCobro = (e) => {
    if (mostrarBuscarCliente) {
      if (e.key === 'Escape') {
        setMostrarBuscarCliente(false)
        setBusquedaCliente('')
      }
      return
    }
if (e.key === 'Escape') {
      setMostrarCobro(false)
      return
    }
    if (e.key !== 'Enter') return
    const el = document.activeElement
    if (el && el.tagName === 'BUTTON') return
    e.preventDefault()
    if (el && el.id && el.id.startsWith('mixto-')) {
      const orden = ['mixto-efectivo', 'mixto-tarjeta', 'mixto-transferencia']
      const i = orden.indexOf(el.id)
      if (i >= 0 && i < orden.length - 1) {
        document.getElementById(orden[i + 1])?.focus()
        return
      }
      document.getElementById('cobro-confirmar')?.focus()
      return
    }
    confirmarCobro()
  }

  // Teclas en el modal de descuento
const teclasDescuento = (e) => {
    if (e.key === 'Escape') {
      setMostrarDescuento(false)
      return
    }
    if (e.key !== 'Enter') return
    const el = document.activeElement
    if (el && el.tagName === 'BUTTON') return
    e.preventDefault()
    if (el && el.id === 'desc-valor' && !descuentoAutorizado) {
      document.getElementById('desc-clave')?.focus()
      return
    }
    aplicarDescuento()
  }

  // Indicador de conexión (componente inline)
  const IndicadorConexion = () => (
    <div className="flex items-center gap-2">
      {enLinea ? (
        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">🟢 EN LÍNEA</span>
      ) : (
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">🔴 SIN CONEXIÓN</span>
      )}
      {pendientes > 0 && (
        <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
          {sincronizando ? '⏳ Sincronizando...' : `⏳ ${pendientes} pendiente(s)`}
        </span>
      )}
    </div>
  )

  // ============ PANTALLA DE CARGA ============
  if (cargandoCaja) {
    return (
      <div className="h-[calc(100vh-2px)] flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-400">
          <p className="text-5xl mb-3">🛒</p>
          <p className="text-lg font-semibold">Cargando Punto de Venta...</p>
        </div>
      </div>
    )
  }

  // ============ PANTALLA DE APERTURA DE CAJA ============
  if (!caja) {
    return (
      <div className="h-[calc(100vh-2px)] flex flex-col bg-gray-100 overflow-hidden">
        <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-xl font-bold">PUNTO DE VENTA</h1>
              <p className="text-xs text-blue-200">
                Operador: {usuario?.nombre || usuario?.usuario || 'N/D'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <IndicadorConexion />
            <div className="text-right">
              <p className="text-lg font-mono font-bold">
                {horaActual.toLocaleTimeString('es-DO', { timeZone: 'America/Santo_Domingo' })}
              </p>
              <p className="text-xs text-blue-200">
                {horaActual.toLocaleDateString('es-DO', {
                  timeZone: 'America/Santo_Domingo',
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-5 py-4 rounded-t-xl text-center">
              <p className="text-4xl mb-1">🔓</p>
              <h2 className="text-xl font-bold">APERTURA DE CAJA</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center mb-4">
                Ingrese el monto inicial en efectivo con el que abre la caja
              </p>
              {!enLinea && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm text-center">
                  🔴 Sin conexión. Necesita internet para abrir la caja.
                </div>
              )}
              <label className="block text-sm font-semibold text-gray-600 mb-1">Monto de apertura (RD$):</label>
              <input
                ref={aperturaRef}
                type="number"
                value={montoApertura}
                onChange={(e) => { setMontoApertura(e.target.value); setErrorCaja('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); abrirCaja() } }}
                placeholder="0.00"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-2xl text-right font-bold focus:outline-none focus:border-blue-600 mb-3"
              />
              {errorCaja && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm text-center">
                  {errorCaja}
                </div>
              )}
              <button
                onClick={abrirCaja}
                disabled={procesandoCaja}
                className={`w-full py-3 rounded-lg font-bold text-lg text-white ${
                  procesandoCaja ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {procesandoCaja ? 'Abriendo...' : '🔓 ABRIR CAJA (Enter)'}
              </button>
            </div>
          </div>
        </div>

        {/* MODAL CIERRE EXITOSO (se muestra aquí porque caja ya es null) */}
        {cierreExitoso && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
              <div className="p-6 text-center">
                <p className="text-6xl mb-3">🔒</p>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">CAJA CERRADA</h2>
                {esSoloPos && (
                  <p className="text-sm text-gray-500 mb-4">
                    Presione <b>IMPRIMIR</b> para obtener el cuadre del turno.
                  </p>
                )}
                <div className={`bg-gray-50 rounded-lg p-4 mb-4 text-left ${esSoloPos ? 'hidden' : ''}`}>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500">Facturas del turno:</span>
                    <span className="font-bold">{cierreExitoso.cantidad_facturas}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500">💵 Efectivo:</span>
                    <span className="font-bold">RD$ {fmt(cierreExitoso.total_efectivo)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500">💳 Tarjeta:</span>
                    <span className="font-bold">RD$ {fmt(cierreExitoso.total_tarjeta)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500">🏦 Transferencia:</span>
                    <span className="font-bold">RD$ {fmt(cierreExitoso.total_transferencia)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm border-t mt-2 pt-2">
                    <span className="text-gray-500">Total ventas:</span>
                    <span className="font-bold">RD$ {fmt(cierreExitoso.total_ventas)}</span>
                  </div>
            <div className="flex justify-between py-1">
                    <span className="text-gray-600 font-semibold">EFECTIVO ESPERADO:</span>
                    <span className="font-bold text-green-600 text-xl">RD$ {fmt(cierreExitoso.efectivo_esperado)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t mt-2 pt-2 text-sm">
                    <span className="text-gray-500">Total contado:</span>
                    <span className="font-bold">RD$ {fmt(cierreExitoso.efectivo_contado || 0)}</span>
                  </div>
                </div>
               {!esSoloPos && cierreExitoso.diferencia !== null && cierreExitoso.diferencia !== undefined && (
                  <div className={`rounded-lg p-3 mb-4 text-white flex justify-between items-center ${
                    Math.abs(parseFloat(cierreExitoso.diferencia)) < 0.01 ? 'bg-green-600'
                      : parseFloat(cierreExitoso.diferencia) > 0 ? 'bg-blue-600' : 'bg-red-600'
                  }`}>
                    <span className="font-bold">
                      {Math.abs(parseFloat(cierreExitoso.diferencia)) < 0.01 ? '✅ CUADRADO'
                        : parseFloat(cierreExitoso.diferencia) > 0 ? '🔵 SOBRANTE' : '🔴 FALTANTE'}
                    </span>
                    <span className="font-bold text-2xl">
                      {parseFloat(cierreExitoso.diferencia) > 0 ? '+' : ''}RD$ {fmt(cierreExitoso.diferencia)}
                    </span>
                  </div>
                )}
     <div className="flex gap-2">
                  <button
                    id="btn-imprimir-cuadre"
                    autoFocus
                    onClick={() => imprimirCuadre(cierreExitoso)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-aceptar-cierre')?.focus() }
                    }}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-bold text-lg hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400"
                  >
                    🖨️ IMPRIMIR
                  </button>
                  <button
                    id="btn-aceptar-cierre"
                    onClick={() => setCierreExitoso(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-imprimir-cuadre')?.focus() }
                    }}
              className={`flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 ${esSoloPos ? 'hidden' : ''}`}
                  >
                    ACEPTAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============ PANTALLA PRINCIPAL DEL POS ============
  return (
    <div className="h-[calc(100vh-2px)] flex flex-col bg-gray-100 overflow-hidden">
      {/* BARRA SUPERIOR POS */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛒</span>
          <div>
            <h1 className="text-xl font-bold">PUNTO DE VENTA</h1>
            <p className="text-xs text-blue-200">
              Operador: {usuario?.nombre || usuario?.usuario || 'N/D'} | Caja abierta: RD$ {fmt(caja.monto_apertura)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <IndicadorConexion />
          <div className="text-right">
            <p className="text-lg font-mono font-bold">
              {horaActual.toLocaleTimeString('es-DO', { timeZone: 'America/Santo_Domingo' })}
            </p>
            <p className="text-xs text-blue-200">
              {horaActual.toLocaleDateString('es-DO', {
                timeZone: 'America/Santo_Domingo',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
 
          <button
            onClick={abrirCierre}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            🔒 CERRAR CAJA (F3)
          </button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL: 2 COLUMNAS */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* COLUMNA IZQUIERDA: BUSQUEDA Y RESULTADOS */}
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col p-4 relative">
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={manejarTeclas}
            placeholder={cargando ? 'Cargando productos...' : '🔍 Escanear código de barras o buscar producto...'}
            disabled={cargando}
            className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-600"
          />

          {/* RESULTADOS DE BÚSQUEDA */}
          {resultados.length > 0 && (
            <div className="absolute left-4 right-4 top-20 bg-white border-2 border-blue-200 rounded-lg shadow-xl z-20 overflow-hidden">
              {resultados.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlTicket(p)}
                  className={`w-full text-left px-4 py-3 flex justify-between items-center border-b last:border-b-0 ${
                    i === seleccionado ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{p.nombre}</p>
                    <p className={`text-xs ${i === seleccionado ? 'text-blue-200' : 'text-gray-500'}`}>
                      Código: {p.codigo || 'N/D'} | Stock: {parseFloat(p.stock_actual || 0).toLocaleString('es-DO')}
                    </p>
                  </div>
                  <p className="font-bold">RD$ {fmt(parseFloat(p.precio))}</p>
                </button>
              ))}
            </div>
          )}

          {/* MENSAJE CENTRAL */}
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-6xl mb-3">📦</p>
              <p className="text-lg font-semibold">
                {cargando ? 'Cargando productos...' : `${productos.length} productos disponibles`}
              </p>
              <p className="text-sm">Escanea o escribe para buscar. Enter agrega al ticket.</p>
              <p className="text-sm mt-2 font-semibold text-blue-500">⌨️ F1 = COBRAR</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TICKET EN VIVO */}
        <div className="w-[60%] bg-white rounded-lg shadow flex flex-col">
          <div className="bg-gray-800 text-white text-center py-2 rounded-t-lg flex justify-between items-center px-4">
            <p className="font-bold">🧾 TICKET</p>
            <p className="text-xs">{ticket.length} línea(s)</p>
          </div>

          {/* CLIENTE DEL TICKET */}
          <div className={`px-3 py-2 border-b text-xs flex justify-between items-center ${tieneRnc ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="min-w-0">
              <p className="font-semibold text-gray-700 truncate">
                👤 {clienteSeleccionado ? clienteSeleccionado.nombre : 'CONSUMIDOR FINAL'}
              </p>
              <p className={`font-bold ${tieneRnc ? 'text-blue-600' : 'text-gray-400'}`}>
                NCF: {ncfTipo} {tieneRnc ? '(Crédito Fiscal)' : '(Consumo)'}
                {tieneRnc && ` | RNC: ${clienteSeleccionado.rnc_cedula}`}
              </p>
            </div>
            {clienteSeleccionado && (
              <button
                onClick={quitarCliente}
                className="text-red-500 hover:text-red-700 font-bold ml-2 flex-shrink-0"
                title="Volver a Consumidor Final"
              >
                ✕
              </button>
            )}
          </div>

          {/* LÍNEAS DEL TICKET */}
          <div className="flex-1 overflow-auto p-2">
            {ticket.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-4xl mb-2">🧾</p>
                  <p className="text-sm">Ticket vacío</p>
                </div>
              </div>
            ) : (
              ticket.map((l) => {
                const tieneDescuento = l.precio < l.precio_original - 0.001
                return (
                  <div key={l.id} className={`border-b py-2 px-1 ${tieneDescuento ? 'bg-orange-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm flex-1 pr-2">{l.nombre}</p>
                  
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(l.id, l.cantidad - 1)}
                          className="w-7 h-7 bg-gray-200 rounded font-bold hover:bg-gray-300"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={l.cantidad}
                          onChange={(e) => cambiarCantidad(l.id, e.target.value)}
                          className="w-14 text-center border rounded py-1 text-sm"
                          min="1"
                        />
                        <button
                          onClick={() => cambiarCantidad(l.id, l.cantidad + 1)}
                          className="w-7 h-7 bg-gray-200 rounded font-bold hover:bg-gray-300"
                        >
                          +
                        </button>
                        {tieneDescuento ? (
                          <span className="text-xs ml-1">
                            <span className="text-gray-400 line-through">RD$ {fmt(l.precio_original)}</span>{' '}
                            <span className="text-orange-600 font-bold">RD$ {fmt(l.precio)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 ml-1">x RD$ {fmt(l.precio)}</span>
                        )}
                      </div>
                      <p className="font-bold text-sm">RD$ {fmt(l.precio * l.cantidad)}</p>
                    </div>
             
                  </div>
                )
              })
            )}
          </div>

{/* TOTALES */}
          <div className="border-t p-4">
            <div className="flex justify-between text-3xl font-bold text-gray-700 mb-1">
              <span>Subtotal:</span>
              <span>RD$ {fmt(baseGeneral)}</span>
            </div>
         <div className="flex justify-between text-3xl font-bold text-gray-700 mb-1">
              <span>ITBIS:</span>
              <span>RD$ {fmt(itbisGeneral)}</span>
            </div>
            {/* FILA DE DESCUENTO (entre ITBIS y TOTAL) */}
            <div className="flex justify-between items-center text-sm mb-1">
              {descuentoTotalTicket > 0.009 ? (
                <>
                  <span className="text-orange-600 font-bold">🏷️ Descuento:</span>
                  <span className="flex items-center gap-2">
                    <span className="text-orange-600 font-bold">− RD$ {fmt(descuentoTotalTicket)}</span>
                    <button
                      onClick={() => setTicket(prev => prev.map(l => ({ ...l, precio: l.precio_original })))}
                      className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold hover:bg-orange-200"
                      title="Quitar descuento"
                    >
                      ✕
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-600">🏷️ Descuento:</span>
           <button
                    onClick={abrirDescuentoGlobal}
                    disabled={ticket.length === 0}
                    className={`text-xs px-3 py-1 rounded font-bold text-white ${
                      ticket.length > 0
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-green-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    ➖ Aplicar (F2)
                  </button>
                </>
              )}
            </div>
            <div className="flex justify-between text-5xl font-bold mb-2">
              <span>TOTAL:</span>
              <span>RD$ {fmt(totalGeneral)}</span>
            </div>
      <div className="flex gap-2">
     <button
                onClick={abrirEliminar}
                disabled={ticket.length === 0}
                className={`px-4 py-1 rounded-lg font-bold text-white flex flex-col items-center justify-center leading-tight ${
                  ticket.length > 0
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-green-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-sm">ELIMINAR</span>
                <span className="text-xs">(F4)</span>
              </button>
              <button
                onClick={abrirCobro}
                disabled={ticket.length === 0}
                className={`flex-1 py-3 rounded-lg font-bold text-lg text-white ${
                  ticket.length > 0
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-green-600 opacity-50 cursor-not-allowed'
                }`}
              >
                💰 COBRAR (F1)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DESCUENTO */}
      {mostrarDescuento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onKeyDown={teclasDescuento}>
            <div className="bg-orange-500 text-white px-4 py-2 rounded-t-xl flex justify-between items-center">
              <h2 className="text-base font-bold">
                🏷️ {descuentoLineaId ? 'DESCUENTO A LÍNEA' : 'DESCUENTO AL TICKET'}
              </h2>
              <button onClick={() => setMostrarDescuento(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>
            <div className="p-4">
              {descuentoLineaId && (
                <p className="text-sm text-gray-600 font-semibold mb-2 truncate">
                  {ticket.find(l => l.id === descuentoLineaId)?.nombre}
                </p>
              )}

              {/* TIPO DE DESCUENTO */}
              <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                  id="desc-porcentaje"
                  onFocus={() => { setDescuentoTipo('porcentaje'); setErrorDesc('') }}
                  onClick={() => { setDescuentoTipo('porcentaje'); setErrorDesc('') }}
                  className={`py-2 rounded-lg font-bold text-sm border-2 focus:outline-none focus:ring-4 focus:ring-orange-300 ${
                    descuentoTipo === 'porcentaje'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}
                >
                  % Porcentaje
                </button>
              <button
                  id="desc-monto"
                  onFocus={() => { setDescuentoTipo('monto'); setErrorDesc('') }}
                  onClick={() => { setDescuentoTipo('monto'); setErrorDesc('') }}
                  className={`py-2 rounded-lg font-bold text-sm border-2 focus:outline-none focus:ring-4 focus:ring-orange-300 ${
                    descuentoTipo === 'monto'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}
                >
                  RD$ Monto
                </button>
              </div>

              {/* VALOR */}
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                {descuentoTipo === 'porcentaje' ? 'Porcentaje de descuento (%):' : 'Monto de descuento (RD$):'}
              </label>
             <input
                id="desc-valor"
                ref={descValorRef}
                type="number"
                value={descuentoValor}
                onChange={(e) => { setDescuentoValor(e.target.value); setErrorDesc('') }}
                placeholder={descuentoTipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 50.00'}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-xl text-right font-bold focus:outline-none focus:border-orange-500 mb-3"
              />

              {/* CLAVE (solo si aún no está autorizado en este ticket) */}
              {!descuentoAutorizado && (
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">🔑 Clave de autorización:</label>
              <input
                    id="desc-clave"
                    type="password"
                    value={claveDesc}
                    onChange={(e) => { setClaveDesc(e.target.value); setErrorDesc('') }}
                    placeholder="Clave del administrador"
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}
              {descuentoAutorizado && (
                <p className="text-xs text-green-600 font-bold mb-3">✓ Descuentos autorizados para este ticket</p>
              )}

              {/* ERROR */}
              {errorDesc && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-sm text-center">
                  {errorDesc}
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-2">
      <button
                  id="desc-cancelar"
                  onClick={() => setMostrarDescuento(false)}
                  disabled={procesandoDesc}
                  className="flex-1 py-2.5 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-400"
                >
                  Cancelar (Esc)
                </button>
                <button
                  id="desc-aplicar"
                  onClick={aplicarDescuento}
                  disabled={procesandoDesc}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-orange-300 ${
                    procesandoDesc ? 'bg-orange-300 cursor-wait' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {procesandoDesc ? 'Validando...' : '✓ APLICAR (Enter)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     {/* MODAL DE ELIMINAR ARTÍCULO */}
      {mostrarEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onKeyDown={(e) => {
            if (e.key === 'Escape') { setMostrarEliminar(false); return }
            if (e.key !== 'Enter') return
            const el = document.activeElement
            if (el && el.tagName === 'BUTTON') return
            e.preventDefault()
            if (el && el.id === 'elim-codigo') { document.getElementById('elim-clave')?.focus(); return }
            confirmarEliminar()
          }}>
            <div className="bg-red-600 text-white px-4 py-2 rounded-t-xl flex justify-between items-center">
              <h2 className="text-base font-bold">🗑️ ELIMINAR ARTÍCULO</h2>
              <button onClick={() => setMostrarEliminar(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Escanee el código del artículo:</label>
             <input
                id="elim-codigo"
                ref={codigoEliminarRef}
                type="text"
                value={codigoEliminar}
                onChange={(e) => { setCodigoEliminar(e.target.value); setErrorEliminar('') }}
                placeholder="🔍 Código del artículo a eliminar..."
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-red-500 mb-2"
              />

              {/* ARTÍCULO ENCONTRADO */}
              {codigoEliminar.trim() && (
                lineaAEliminar ? (
                  <div className="mb-3 border-2 border-red-300 bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-red-600 font-bold">SE VA A ELIMINAR:</p>
                    <p className="font-bold text-sm text-gray-800">{lineaAEliminar.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Cantidad: {lineaAEliminar.cantidad} | RD$ {fmt(lineaAEliminar.precio * lineaAEliminar.cantidad)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center mb-3">Ese código no está en el ticket</p>
                )
              )}

              {/* CLAVE */}
              <label className="block text-sm font-semibold text-gray-600 mb-1">🔑 Clave de autorización:</label>
          <input
                id="elim-clave"
                type="password"
                value={claveEliminar}
                onChange={(e) => { setClaveEliminar(e.target.value); setErrorEliminar('') }}
                placeholder="Clave del administrador"
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 mb-3"
              />

              {/* ERROR */}
              {errorEliminar && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-sm text-center">
                  {errorEliminar}
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-2">
       <button
                  id="elim-cancelar"
                  onClick={() => setMostrarEliminar(false)}
                  disabled={procesandoEliminar}
                  className="flex-1 py-2.5 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-400"
                >
                  Cancelar (Esc)
                </button>
                <button
                  id="elim-confirmar"
                  onClick={confirmarEliminar}
                  disabled={procesandoEliminar}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-red-300 ${
                    procesandoEliminar ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {procesandoEliminar ? 'Validando...' : '🗑️ ELIMINAR (Enter)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COBRO */}
      {mostrarCobro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[96vh] flex flex-col" onKeyDown={teclasCobro}>
            {/* HEADER FIJO */}
            <div className="bg-green-600 text-white px-4 py-2 rounded-t-xl flex justify-between items-center flex-shrink-0">
              <h2 className="text-base font-bold">💰 COBRAR — RD$ {fmt(totalGeneral)}</h2>
              <button onClick={() => setMostrarCobro(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>

            {/* CONTENIDO SCROLLEABLE */}
            <div className="p-3 overflow-y-auto flex-1">
              {/* AVISO OFFLINE */}
              {!enLinea && (
                <div className="mb-2 bg-yellow-50 border border-yellow-400 text-yellow-800 px-3 py-1.5 rounded-lg text-xs text-center">
                  🔴 Sin conexión: la venta se guardará y sincronizará automáticamente.
                </div>
              )}

              {/* DESCUENTO APLICADO */}
              {descuentoTotalTicket > 0.009 && (
                <div className="mb-2 bg-orange-50 border border-orange-300 text-orange-700 px-3 py-1.5 rounded-lg text-xs text-center font-bold">
                  🏷️ Descuento aplicado: − RD$ {fmt(descuentoTotalTicket)}
                </div>
              )}

              {/* CLIENTE Y NCF */}
              <div className={`rounded-lg border-2 p-2.5 mb-3 ${tieneRnc ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      👤 {clienteSeleccionado ? clienteSeleccionado.nombre : 'CONSUMIDOR FINAL'}
                    </p>
                    <p className={`text-xs font-bold ${tieneRnc ? 'text-blue-600' : 'text-gray-400'}`}>
                      NCF: {ncfTipo} {tieneRnc ? '(Crédito Fiscal)' : '(Consumo)'}
                      {tieneRnc && ` | RNC: ${clienteSeleccionado.rnc_cedula}`}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    {clienteSeleccionado && (
                      <button
                        onClick={quitarCliente}
                        className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-200"
                        title="Volver a Consumidor Final"
                      >
                        ✕
                      </button>
                    )}
                    <button
                     id="cobro-cliente"
                      onClick={() => setMostrarBuscarCliente(!mostrarBuscarCliente)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                      {mostrarBuscarCliente ? 'Cerrar' : '👤 CLIENTE'}
                    </button>
                  </div>
                </div>

                {/* BÚSQUEDA DE CLIENTE */}
                {mostrarBuscarCliente && (
                  <div className="mt-2">
                    <input
                      ref={clienteRef}
                      type="text"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      placeholder="Buscar por nombre o RNC..."
                      className="w-full border-2 border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600"
                    />
                    {clientesFiltrados.length > 0 && (
                      <div className="mt-1 border-2 border-blue-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto bg-white">
                        {clientesFiltrados.map(c => (
                          <button
                            key={c.id}
                            onClick={() => seleccionarCliente(c)}
                            className="w-full text-left px-3 py-1.5 border-b last:border-b-0 hover:bg-blue-50"
                          >
                            <p className="font-semibold text-sm text-gray-800">{c.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {c.rnc_cedula && String(c.rnc_cedula).trim() !== ''
                                ? `RNC/Cédula: ${c.rnc_cedula} → B01 Crédito Fiscal`
                                : 'Sin RNC → B02 Consumo'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {busquedaCliente.trim() !== '' && clientesFiltrados.length === 0 && !resultadoDgii && (
                      <div className="text-center mt-2">
                        <p className="text-xs text-gray-400 mb-1">No se encontraron clientes registrados</p>
                        {pareceRnc && (
                          <button
                            onClick={consultarDgii}
                            disabled={consultandoDgii}
                            className={`w-full py-1.5 rounded-lg font-bold text-sm text-white ${
                              consultandoDgii ? 'bg-purple-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                          >
                            {consultandoDgii ? '⏳ Consultando DGII...' : '🔍 CONSULTAR EN DGII'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* RESULTADO DE LA DGII */}
                    {resultadoDgii && (
                      <div className="mt-2 border-2 border-purple-300 bg-purple-50 rounded-lg p-2">
                        <p className="text-xs text-purple-600 font-bold">📋 PADRÓN DGII:</p>
                        <p className="font-bold text-sm text-gray-800">{resultadoDgii.nombre}</p>
                        <p className="text-xs text-gray-500">
                          RNC: {resultadoDgii.rnc} | Estado: <span className={resultadoDgii.estado === 'ACTIVO' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{resultadoDgii.estado || 'N/D'}</span>
                        </p>
                        <button
                          onClick={usarClienteDgii}
                          disabled={consultandoDgii}
                          className={`w-full mt-1.5 py-1.5 rounded-lg font-bold text-sm text-white ${
                            consultandoDgii ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {consultandoDgii ? '⏳ Registrando...' : '✓ USAR ESTE CLIENTE (B01)'}
                        </button>
                      </div>
                    )}

                    {/* ERROR DGII */}
                    {errorDgii && (
                      <p className="text-xs text-red-500 text-center mt-1 font-semibold">{errorDgii}</p>
                    )}
                  </div>
                )}
              </div>

           {/* BOTÓN PAGO MIXTO */}
            <button
                id="cobro-mixto"
                onClick={() => { setModoMixto(!modoMixto); setErrorCobro(''); setPagosMixto({ efectivo: '', tarjeta: '', transferencia: '' }) }}
             className={`w-full mb-2 py-2 rounded-lg font-bold text-sm border-2 focus:outline-none focus:ring-4 focus:ring-purple-300 ${
                  modoMixto ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-400 hover:bg-purple-50'
                }`}
              >
                {modoMixto ? '✕ Cancelar pago mixto' : '🔀 PAGO MIXTO (combinar métodos)'}
              </button>

              {/* PAGO MIXTO: MONTO POR MÉTODO */}
              {modoMixto && (
                <div className="border-2 border-purple-300 rounded-lg p-3 mb-3 bg-purple-50">
                  {[
                    { id: 'efectivo', label: '💵 Efectivo' },
                    { id: 'tarjeta', label: '💳 Tarjeta' },
                    { id: 'transferencia', label: '🏦 Transferencia' }
                  ].map((m, i, arr) => (
                    <div key={m.id} className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-semibold text-gray-700 w-36">{m.label}</label>
                      <input
                        id={`mixto-${m.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={pagosMixto[m.id]}
                        onChange={(e) => { setPagosMixto(prev => ({ ...prev, [m.id]: e.target.value })); setErrorCobro('') }}
                onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-1.5 text-lg text-right font-bold focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  ))}
                  <div className="border-t border-purple-300 pt-2 mt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total ingresado:</span>
                      <span className="font-bold">RD$ {fmt(totalMixto)}</span>
                    </div>
                    <div className={`flex justify-between font-bold ${
                      Math.abs(faltaMixto) < 0.01 ? 'text-green-600' : faltaMixto > 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      <span>{Math.abs(faltaMixto) < 0.01 ? '✅ Cubierto' : faltaMixto > 0 ? 'Falta por cubrir:' : 'Excede por:'}</span>
                      <span className="text-lg">RD$ {fmt(Math.abs(faltaMixto))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FORMAS DE PAGO */}
              <div className={`grid grid-cols-3 gap-2 mb-3 ${modoMixto ? 'hidden' : ''}`}>
                {[
                  { id: 'efectivo', label: '💵 Efectivo' },
                  { id: 'tarjeta', label: '💳 Tarjeta' },
                  { id: 'transferencia', label: '🏦 Transf.' }
                ].map(fp => (
               <button
                    key={fp.id}
                    id={`metodo-${fp.id}`}
                    onFocus={() => { setFormaPago(fp.id); setErrorCobro('') }}
                    onClick={() => { setFormaPago(fp.id); setErrorCobro('') }}
                    className={`py-2 rounded-lg font-semibold text-sm border-2 ${
                      formaPago === fp.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {fp.label}
                  </button>
                ))}
              </div>

              {/* MONTO RECIBIDO (solo efectivo) */}
              {!modoMixto && formaPago === 'efectivo' && (
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-600 flex-shrink-0">Recibido:</label>
                 <input
                      id="cobro-recibido"
                      ref={montoRef}
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => { setMontoRecibido(e.target.value); setErrorCobro('') }}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-xl text-right font-bold focus:outline-none focus:border-green-600"
                    />
                  </div>
                  {/* DEVUELTA */}
                  <div className={`mt-2 rounded-lg py-1.5 px-3 flex justify-between items-center ${devuelta >= 0 && recibido > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-500 font-semibold">DEVUELTA:</p>
                    <p className={`text-2xl font-bold ${devuelta >= 0 && recibido > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      RD$ {recibido > 0 && devuelta >= 0 ? fmt(devuelta) : '0.00'}
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {errorCobro && (
                <div className="mt-2 bg-red-50 border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-sm text-center">
                  {errorCobro}
                </div>
              )}
            </div>

            {/* BOTONES FIJOS ABAJO (siempre visibles) */}
            <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-white rounded-b-xl">
              <button
                onClick={() => setMostrarCobro(false)}
           id="cobro-cancelar"
                disabled={procesando}
                className="flex-1 py-2.5 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-400"
              >
                Cancelar (Esc)
              </button>
        <button
                id="cobro-confirmar"
                onClick={confirmarCobro}
                disabled={procesando}
                className={`flex-1 py-2.5 rounded-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-green-300 ${
                  procesando ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {procesando ? 'Procesando...' : '✓ CONFIRMAR (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VENTA EXITOSA */}
      {ventaExitosa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <p className="text-6xl mb-3">{ventaExitosa.offline ? '📥' : '✅'}</p>
              <h2 className={`text-2xl font-bold mb-1 ${ventaExitosa.offline ? 'text-yellow-600' : 'text-green-600'}`}>
                {ventaExitosa.offline ? 'VENTA GUARDADA (OFFLINE)' : '¡VENTA COMPLETADA!'}
              </h2>
              {ventaExitosa.offline && (
                <p className="text-xs text-gray-500 mb-3">Se sincronizará automáticamente al volver el internet</p>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4 mt-3 text-left">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-bold">{ventaExitosa.cliente}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Factura No.:</span>
                  <span className="font-bold">{ventaExitosa.numero}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">NCF:</span>
                  <span className="font-bold">{ventaExitosa.ncf}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Forma de pago:</span>
                  <span className="font-bold">{ventaExitosa.pago}</span>
                </div>
                {ventaExitosa.descuento > 0.009 && (
                  <div className="flex justify-between py-1 text-sm text-orange-600">
                    <span className="font-semibold">🏷️ Descuento:</span>
                    <span className="font-bold">− RD$ {fmt(ventaExitosa.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm border-t mt-2 pt-2">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-bold">RD$ {fmt(ventaExitosa.total)}</span>
                </div>
                {ventaExitosa.pago === 'Efectivo' && (
                  <>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500">Recibido:</span>
                      <span className="font-bold">RD$ {fmt(ventaExitosa.recibido)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600 font-semibold">DEVUELTA:</span>
                      <span className="font-bold text-green-600 text-xl">RD$ {fmt(ventaExitosa.devuelta)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {!ventaExitosa.offline && (
                  <button
                    onClick={() => {
                      const token = sessionStorage.getItem('token')
                      window.open(`/invoices/${ventaExitosa.id}/pdf-pos?token=${token}`, '_blank')
                    }}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-bold text-lg hover:bg-gray-800"
                  >
                    🖨️ IMPRIMIR
                  </button>
                )}
                <button
                  onClick={nuevaVenta}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700"
                >
                  🛒 NUEVA VENTA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
   

      {/* MODAL DE CIERRE DE CAJA */}
      {mostrarCierre && resumenCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto">
            <div className="bg-red-600 text-white px-5 py-3 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold">🔒 CERRAR CAJA</h2>
              <button onClick={() => setMostrarCierre(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>
            <div className="p-3">
          <p className="text-xs text-gray-500 text-center mb-2">
                {esSoloPos ? 'Cuente el efectivo de la gaveta y presione Confirmar' : 'Resumen del turno actual'}
              </p>

              <div className={`bg-gray-50 rounded-lg p-4 mb-4 ${esSoloPos ? 'hidden' : ''}`}>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Apertura de caja:</span>
                  <span className="font-bold">RD$ {fmt(resumenCaja.caja.monto_apertura)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Facturas del turno:</span>
                  <span className="font-bold">{resumenCaja.cantidad_facturas}</span>
                </div>
                <div className="border-t my-2"></div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">💵 Ventas en efectivo:</span>
                  <span className="font-bold">RD$ {fmt(resumenCaja.total_efectivo)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">💳 Ventas con tarjeta:</span>
                  <span className="font-bold">RD$ {fmt(resumenCaja.total_tarjeta)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">🏦 Transferencias:</span>
                  <span className="font-bold">RD$ {fmt(resumenCaja.total_transferencia)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm border-t mt-2 pt-2">
                  <span className="text-gray-500">Total de ventas:</span>
                  <span className="font-bold">RD$ {fmt(resumenCaja.total_ventas)}</span>
                </div>
             <div className="flex justify-between py-1">
                  <span className="text-gray-600 font-semibold">EFECTIVO ESPERADO:</span>
                  <span className="font-bold text-green-600 text-xl">RD$ {fmt(resumenCaja.efectivo_esperado)}</span>
                </div>
              </div>

              {/* DESGLOSE DE EFECTIVO */}
              <div className="border rounded-lg overflow-hidden mb-4">
               <div className="bg-gray-700 text-white px-3 py-1 text-xs font-bold">
                  💵 Detalle de Efectivo (conteo físico)
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-2 py-0.5 text-center w-24 text-xs">Cantidad</th>
                      <th className="px-2 py-0.5 text-center text-xs">Billete</th>
                     <th className="px-2 py-0.5 text-right text-xs">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DENOMINACIONES.map(d => {
                      const cant = parseInt(conteoBilletes[d], 10) || 0
                      return (
                        <tr key={d} className="border-t">
                          <td className="px-2 py-0.5">
                      <input
                              id={`billete-${d}`}
                              type="number"
                              min="0"
                              value={conteoBilletes[d] ?? ''}
                              onChange={(e) => setConteoBilletes(prev => ({ ...prev, [d]: e.target.value.replace(/\D/g, '') }))}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                const idx = DENOMINACIONES.indexOf(d)
                          if (e.key === 'ArrowDown' || e.key === 'Enter') {
                                  e.preventDefault()
                                  const sig = DENOMINACIONES[idx + 1]
                                  if (sig !== undefined) document.getElementById(`billete-${sig}`)?.focus()
                                  else document.getElementById('btn-confirmar-cierre')?.focus()
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  const ant = DENOMINACIONES[idx - 1]
                                  if (ant !== undefined) document.getElementById(`billete-${ant}`)?.focus()
                                }
                              }}
                              placeholder="0"
                          className="w-full border rounded px-2 py-0.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                         <td className="px-2 py-0.5 text-center text-gray-600 text-sm">X {fmt(d)} =</td>
                        <td className="px-2 py-0.5 text-right font-semibold text-sm">{fmt(cant * d)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2">
                     <td colSpan="2" className="px-2 py-1 font-bold text-gray-700">TOTAL CONTADO</td>
                      <td className="px-2 py-1 text-right font-bold text-lg">RD$ {fmt(totalContado)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* RESULTADO DEL CUADRE */}
             <div className={`rounded-lg p-3 mb-4 text-white flex justify-between items-center ${esSoloPos ? 'hidden' : ''} ${
                Math.abs(diferenciaCaja) < 0.01 ? 'bg-green-600'
                  : diferenciaCaja > 0 ? 'bg-blue-600' : 'bg-red-600'
              }`}>
                <span className="font-bold">
                  {Math.abs(diferenciaCaja) < 0.01 ? '✅ CUADRADO' : diferenciaCaja > 0 ? '🔵 SOBRANTE' : '🔴 FALTANTE'}
                </span>
                <span className="font-bold text-2xl">
                  {diferenciaCaja > 0 ? '+' : ''}RD$ {fmt(diferenciaCaja)}
                </span>
              </div>

     <div className="flex gap-2">
                <button
                  id="btn-cancelar-cierre"
                  onClick={() => setMostrarCierre(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-confirmar-cierre')?.focus() }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('billete-1')?.focus() }
                  }}
                  disabled={procesandoCaja}
                  className="flex-1 py-3 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-400"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-cierre"
                  onClick={confirmarCierre}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-cancelar-cierre')?.focus() }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('billete-1')?.focus() }
                  }}
                  disabled={procesandoCaja}
                  className={`flex-1 py-3 rounded-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-red-300 ${
                    procesandoCaja ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {procesandoCaja ? 'Cerrando...' : '🔒 CONFIRMAR CIERRE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POS