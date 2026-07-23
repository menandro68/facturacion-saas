import { useState, useEffect, useRef } from 'react'
import API from '../services/api'

// ============ HELPERS DE INDEXEDDB (MODO OFFLINE) ============
const DB_NAME = 'pos_offline_db'
const DB_VERSION = 1

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
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const guardarProductosCache = async (productos) => {
  try {
    const db = await abrirDB()
    const tx = db.transaction('productos_cache', 'readwrite')
    const store = tx.objectStore('productos_cache')
    store.clear()
    for (const p of productos) store.put(p)
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    db.close()
  } catch (e) {
    console.error('Error guardando cache de productos:', e)
  }
}

const leerProductosCache = async () => {
  try {
    const db = await abrirDB()
    const tx = db.transaction('productos_cache', 'readonly')
    const store = tx.objectStore('productos_cache')
    const req = store.getAll()
    const data = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || [])
      req.onerror = () => rej(req.error)
    })
    db.close()
    return data
  } catch (e) {
    console.error('Error leyendo cache de productos:', e)
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

  // Estados de caja
  const [caja, setCaja] = useState(null)
  const [cargandoCaja, setCargandoCaja] = useState(true)
  const [montoApertura, setMontoApertura] = useState('')
  const [errorCaja, setErrorCaja] = useState('')
  const [procesandoCaja, setProcesandoCaja] = useState(false)
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [resumenCaja, setResumenCaja] = useState(null)
  const [cierreExitoso, setCierreExitoso] = useState(null)

  // Estados del cobro
  const [mostrarCobro, setMostrarCobro] = useState(false)
  const [formaPago, setFormaPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorCobro, setErrorCobro] = useState('')
  const [ventaExitosa, setVentaExitosa] = useState(null)

  // Estados de modo offline
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [pendientes, setPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const inputRef = useRef(null)
  const montoRef = useRef(null)
  const aperturaRef = useRef(null)
  const sincronizandoRef = useRef(false)

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}')

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
          // Si es error de red, parar (seguimos offline). Si es error del servidor, también paramos para no perder datos.
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
        guardarProductosCache(lista)
      } catch (err) {
        console.error('Error cargando productos, usando cache:', err)
        const cache = await leerProductosCache()
        setProductos(cache)
      } finally {
        setCargando(false)
      }
    }
    cargarProductos()
  }, [])

  // Foco en apertura de caja
  useEffect(() => {
    if (!cargandoCaja && !caja && aperturaRef.current) aperturaRef.current.focus()
  }, [cargandoCaja, caja])

  // Foco permanente en la búsqueda
  useEffect(() => {
    if (caja && !cargando && !mostrarCobro && !ventaExitosa && !mostrarCierre && inputRef.current) {
      inputRef.current.focus()
    }
  }, [caja, cargando, mostrarCobro, ventaExitosa, mostrarCierre])

  // Foco en el monto al abrir cobro
  useEffect(() => {
    if (mostrarCobro && montoRef.current) montoRef.current.focus()
  }, [mostrarCobro])

  // TECLA F1 = COBRAR (global en el POS)
  useEffect(() => {
    const manejarF1 = (e) => {
      if (e.key === 'F1') {
        e.preventDefault()
        if (caja && !mostrarCobro && !ventaExitosa && !mostrarCierre && ticket.length > 0) {
          setFormaPago('efectivo')
          setMontoRecibido('')
          setErrorCobro('')
          setMostrarCobro(true)
        }
      }
    }
    window.addEventListener('keydown', manejarF1)
    return () => window.removeEventListener('keydown', manejarF1)
  }, [caja, mostrarCobro, ventaExitosa, mostrarCierre, ticket])

  // Buscar mientras escribe
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

  // Abrir pantalla de cierre (cargar resumen)
  const abrirCierre = async () => {
    if (pendientes > 0) {
      alert(`⚠️ Hay ${pendientes} venta(s) pendiente(s) de sincronizar.\n\nEspere a que se sincronicen antes de cerrar la caja para que el cuadre sea correcto.`)
      return
    }
    try {
      const res = await API.get('/pos/caja/resumen')
      setResumenCaja(res.data.data)
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
      const res = await API.post('/pos/caja/cerrar')
      setCierreExitoso(res.data.data)
      setMostrarCierre(false)
      setCaja(null)
      setTicket([])
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

  // Devuelta
  const recibido = parseFloat(montoRecibido) || 0
  const devuelta = recibido - totalGeneral

  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Abrir ventana de cobro
  const abrirCobro = () => {
    if (ticket.length === 0) return
    setFormaPago('efectivo')
    setMontoRecibido('')
    setErrorCobro('')
    setMostrarCobro(true)
  }

  // Confirmar cobro → crear FACTURA REAL (o guardar offline)
  const confirmarCobro = async () => {
    if (procesando) return
    if (formaPago === 'efectivo' && recibido < totalGeneral) {
      setErrorCobro('El monto recibido es menor que el total')
      return
    }
    setProcesando(true)
    setErrorCobro('')
    const etiquetaPago = formaPago === 'efectivo' ? 'Efectivo' : formaPago === 'tarjeta' ? 'Tarjeta' : 'Transferencia'
    const payload = {
      customer_id: '',
      ncf_tipo: 'B02',
      notas: `POS - Pago: ${etiquetaPago}`,
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
    try {
      const res = await API.post('/invoices', payload)
      const factura = res.data.data || res.data
      setVentaExitosa({
        offline: false,
        id: factura.id,
        ncf: factura.ncf || 'N/D',
        numero: factura.numero_factura || 'N/D',
        total: totalGeneral,
        recibido: formaPago === 'efectivo' ? recibido : totalGeneral,
        devuelta: formaPago === 'efectivo' ? devuelta : 0,
        pago: etiquetaPago
      })
      setMostrarCobro(false)
      setTicket([])
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
            total: totalGeneral,
            recibido: formaPago === 'efectivo' ? recibido : totalGeneral,
            devuelta: formaPago === 'efectivo' ? devuelta : 0,
            pago: etiquetaPago
          })
          setMostrarCobro(false)
          setTicket([])
        } catch (e2) {
          console.error('Error guardando venta offline:', e2)
          setErrorCobro('Sin conexión y no se pudo guardar localmente. Intente de nuevo.')
        }
      } else {
        // Error del SERVIDOR (validación, etc.) → mostrar error, NO guardar offline
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
    setBusqueda('')
    if (inputRef.current) inputRef.current.focus()
  }

  // Enter en el modal de cobro
  const teclasCobro = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmarCobro()
    } else if (e.key === 'Escape') {
      setMostrarCobro(false)
    }
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
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
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
                    <span className="text-gray-600 font-semibold">EFECTIVO EN GAVETA:</span>
                    <span className="font-bold text-green-600 text-xl">RD$ {fmt(cierreExitoso.efectivo_esperado)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCierreExitoso(null)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700"
                >
                  ACEPTAR
                </button>
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
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            🔒 CERRAR CAJA
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
        <div className="w-96 bg-white rounded-lg shadow flex flex-col">
          <div className="bg-gray-800 text-white text-center py-2 rounded-t-lg flex justify-between items-center px-4">
            <p className="font-bold">🧾 TICKET</p>
            <p className="text-xs">{ticket.length} línea(s)</p>
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
              ticket.map((l) => (
                <div key={l.id} className="border-b py-2 px-1">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm flex-1 pr-2">{l.nombre}</p>
                    <button
                      onClick={() => eliminarLinea(l.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                      title="Eliminar"
                    >
                      ✕
                    </button>
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
                      <span className="text-xs text-gray-500 ml-1">x RD$ {fmt(l.precio)}</span>
                    </div>
                    <p className="font-bold text-sm">RD$ {fmt(l.precio * l.cantidad)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTALES */}
          <div className="border-t p-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>RD$ {fmt(baseGeneral)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>ITBIS:</span>
              <span>RD$ {fmt(itbisGeneral)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold mb-3">
              <span>TOTAL:</span>
              <span>RD$ {fmt(totalGeneral)}</span>
            </div>
            <button
              onClick={abrirCobro}
              disabled={ticket.length === 0}
              className={`w-full py-3 rounded-lg font-bold text-lg text-white ${
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

      {/* MODAL DE COBRO */}
      {mostrarCobro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onKeyDown={teclasCobro}>
            <div className="bg-green-600 text-white px-5 py-3 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold">💰 COBRAR</h2>
              <button onClick={() => setMostrarCobro(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>

            <div className="p-5">
              {/* AVISO OFFLINE */}
              {!enLinea && (
                <div className="mb-3 bg-yellow-50 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-lg text-sm text-center">
                  🔴 Sin conexión: la venta se guardará y se sincronizará automáticamente al volver el internet.
                </div>
              )}

              {/* TOTAL A PAGAR */}
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">TOTAL A PAGAR</p>
                <p className="text-4xl font-bold text-gray-800">RD$ {fmt(totalGeneral)}</p>
                <p className="text-xs text-gray-400 mt-1">Cliente: CONSUMIDOR FINAL (B02)</p>
              </div>

              {/* FORMAS DE PAGO */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'efectivo', label: '💵 Efectivo' },
                  { id: 'tarjeta', label: '💳 Tarjeta' },
                  { id: 'transferencia', label: '🏦 Transf.' }
                ].map(fp => (
                  <button
                    key={fp.id}
                    onClick={() => { setFormaPago(fp.id); setErrorCobro(''); if (fp.id === 'efectivo' && montoRef.current) setTimeout(() => montoRef.current?.focus(), 50) }}
                    className={`py-3 rounded-lg font-semibold text-sm border-2 ${
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
              {formaPago === 'efectivo' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Monto recibido:</label>
                  <input
                    ref={montoRef}
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => { setMontoRecibido(e.target.value); setErrorCobro('') }}
                    placeholder="0.00"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-2xl text-right font-bold focus:outline-none focus:border-green-600"
                  />
                  {/* DEVUELTA */}
                  <div className={`mt-3 rounded-lg p-3 text-center ${devuelta >= 0 && recibido > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-500">DEVUELTA</p>
                    <p className={`text-3xl font-bold ${devuelta >= 0 && recibido > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      RD$ {recibido > 0 && devuelta >= 0 ? fmt(devuelta) : '0.00'}
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {errorCobro && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm text-center">
                  {errorCobro}
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarCobro(false)}
                  disabled={procesando}
                  className="flex-1 py-3 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar (Esc)
                </button>
                <button
                  onClick={confirmarCobro}
                  disabled={procesando}
                  className={`flex-1 py-3 rounded-lg font-bold text-white ${
                    procesando ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {procesando ? 'Procesando...' : '✓ CONFIRMAR (Enter)'}
                </button>
              </div>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-red-600 text-white px-5 py-3 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold">🔒 CERRAR CAJA</h2>
              <button onClick={() => setMostrarCierre(false)} className="text-white text-2xl leading-none font-bold">✕</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 text-center mb-4">Resumen del turno actual</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
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
                  <span className="text-gray-600 font-semibold">EFECTIVO EN GAVETA:</span>
                  <span className="font-bold text-green-600 text-xl">RD$ {fmt(resumenCaja.efectivo_esperado)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarCierre(false)}
                  disabled={procesandoCaja}
                  className="flex-1 py-3 rounded-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCierre}
                  disabled={procesandoCaja}
                  className={`flex-1 py-3 rounded-lg font-bold text-white ${
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