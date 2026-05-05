import { useState, useEffect } from 'react'
import API from '../services/api'

// Módulos del sistema agrupados por categoría (usados para permisos de operadores)
const MODULOS_DISPONIBLES = [
  {
    categoria: 'PRINCIPAL',
    items: [
      { id: 'panel', label: 'Panel de Control' }
    ]
  },
  {
    categoria: 'VENTAS',
    items: [
      {
        id: 'facturas',
        label: 'Facturas',
        sub_tabs: [
          { id: 'facturas:fecha', label: 'Venta por Fecha' },
          { id: 'facturas:zona', label: 'Venta por Zona' },
          { id: 'facturas:vendedor', label: 'Venta por Vendedor' },
          { id: 'facturas:producto', label: 'Venta por Producto' },
          { id: 'facturas:cliente', label: 'Venta por Cliente' },
          { id: 'facturas:chofer', label: 'Entregada Chofer' },
          { id: 'facturas:relacion_vendedor', label: 'Relación Vendedor' },
          { id: 'facturas:pedidos', label: 'Pedidos' },
          { id: 'facturas:cotizacion', label: 'Cotización' },
          { id: 'facturas:nota_credito', label: 'Nota de Crédito' },
          { id: 'facturas:devoluciones', label: 'Devoluciones' },
          { id: 'facturas:anular', label: 'Anular Factura' },
          { id: 'facturas:imprimir', label: 'Imprimir Factura' },
          { id: 'facturas:pdf', label: 'PDF Factura' }
        ]
      },
      { id: 'pedidos', label: 'Pedidos' },
      { id: 'cotizaciones', label: 'Cotizaciones' },
      { id: 'notas_credito', label: 'Notas de Crédito' },
      { id: 'devoluciones', label: 'Devoluciones' }
    ]
  },
  {
    categoria: 'INVENTARIO',
    items: [
      { id: 'productos', label: 'Productos' },
      {
        id: 'inventario',
        label: 'Inventario',
        sub_tabs: [
          { id: 'inventario:inventario', label: 'Inventario' },
          { id: 'inventario:valor', label: 'Valor de Inventario' },
          { id: 'inventario:stock_minimo', label: 'Stock Mínimo' },
          { id: 'inventario:orden_compra', label: 'Crear Orden de Compra' },
          { id: 'inventario:mov_producto', label: 'Movimiento de Producto' }
        ]
      },
      { id: 'orden_compra', label: 'Orden de Compra' }
    ]
  },
  {
    categoria: 'CLIENTES Y PROVEEDORES',
    items: [
      { id: 'clientes', label: 'Clientes' },
      { id: 'proveedores', label: 'Proveedores' }
    ]
  },
  {
    categoria: 'FINANZAS',
    items: [
      { id: 'pagos', label: 'Pagos' },
      {
        id: 'cuentas_cobrar',
        label: 'Cuentas por Cobrar',
        sub_tabs: [
          { id: 'cuentas_cobrar:cuentas', label: 'Cuentas por Cobrar' },
          { id: 'cuentas_cobrar:cobro_vendedor', label: 'Cobro por Vendedor' },
          { id: 'cuentas_cobrar:cxc_vendedor', label: 'Cuenta por Cobrar por Vendedor' },
          { id: 'cuentas_cobrar:estado_cuenta', label: 'Estado de Cuenta x Cliente' },
          { id: 'cuentas_cobrar:historial', label: 'Historial' }
        ]
      },
      {
        id: 'cuentas_pagar',
        label: 'Cuentas por Pagar',
        sub_tabs: [
          { id: 'cuentas_pagar:cuentas', label: 'Cuentas' },
          { id: 'cuentas_pagar:vencimiento', label: 'Por Vencer' },
          { id: 'cuentas_pagar:proveedor', label: 'Por Proveedor' },
          { id: 'cuentas_pagar:pagos', label: 'Pagos Realizados' },
          { id: 'cuentas_pagar:vencidas', label: 'Vencidas' },
          { id: 'cuentas_pagar:estado_cuenta', label: 'Estado por Proveedor' },
          { id: 'cuentas_pagar:pagar_orden', label: 'Pagar Orden' }
        ]
      },
      { id: 'reportes', label: 'Reportes' }
    ]
  },
  {
    categoria: 'CONFIGURACIÓN',
    items: [
      { id: 'mantenimiento', label: 'Mantenimiento' },
      { id: 'configuracion', label: 'Configuración' }
    ]
  }
]

export default function Mantenimiento() {
  const [tab, setTab] = useState('vendedores')
  const [vendedores, setVendedores] = useState([])
  const [zonas, setZonas] = useState([])
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState('')

  const [formVendedor, setFormVendedor] = useState({ nombre: '', cedula: '', email: '', telefono: '', zona_id: '', comision_pct: '', usuario: '', password: '' })
  const [formZona, setFormZona] = useState({ nombre: '', descripcion: '' })
  const [formChofer, setFormChofer] = useState({ nombre: '', cedula: '', licencia: '', telefono: '', email: '', vehiculo: '', placa: '' })
  const [operadores, setOperadores] = useState([])
  const [formOperador, setFormOperador] = useState({ nombre: '', username: '', password: '', modulos_permitidos: [] })
  const [claveDescuento, setClaveDescuento] = useState('')
  const [nuevaClave, setNuevaClave] = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mensajeClave, setMensajeClave] = useState('')

  // Estados para Secuencias NCF Electrónicas
  const [ncfElectronicas, setNcfElectronicas] = useState([])
  const [formNcfElec, setFormNcfElec] = useState({
    tipo_ncf: 'E31',
    secuencia_desde: 1,
    secuencia_hasta: 1000,
    fecha_vencimiento: ''
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [v, z, c, o] = await Promise.all([
        API.get('/mantenimiento/vendedores'),
        API.get('/mantenimiento/zonas'),
        API.get('/mantenimiento/choferes'),
        API.get('/operadores')
      ])
      setVendedores(v.data.data)
      setZonas(z.data.data)
      setChoferes(c.data.data)
      setOperadores(o.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNcfElectronicas = async () => {
    try {
      const res = await API.get('/mantenimiento/ncf-electronicas')
      setNcfElectronicas(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault()
        const formEl = target.form
        const campos = Array.from(formEl.querySelectorAll('input, select'))
        const idx = campos.indexOf(target)
        if (idx >= 0 && idx < campos.length - 1) {
          campos[idx + 1].focus()
        } else if (idx === campos.length - 1) {
          formEl.requestSubmit()
        }
      }
    }
  }

  const handleNuevo = () => {
    setEditando(null)
    setError('')
    if (tab === 'vendedores') setFormVendedor({ nombre: '', cedula: '', email: '', telefono: '', zona_id: '', comision_pct: '', usuario: '', password: '' })
    if (tab === 'zonas') setFormZona({ nombre: '', descripcion: '' })
    if (tab === 'choferes') setFormChofer({ nombre: '', cedula: '', licencia: '', telefono: '', email: '', vehiculo: '', placa: '' })
    if (tab === 'usuarios') setFormOperador({ nombre: '', username: '', password: '', modulos_permitidos: [] })
    if (tab === 'ncf_electronicas') setFormNcfElec({ tipo_ncf: 'E31', secuencia_desde: 1, secuencia_hasta: 1000, fecha_vencimiento: '' })
    setShowForm(true)
  }

  const handleEditar = (item) => {
    setEditando(item.id)
    setError('')
    if (tab === 'vendedores') setFormVendedor({ nombre: item.nombre, cedula: item.cedula || '', email: item.email || '', telefono: item.telefono || '', zona_id: item.zona_id || '', comision_pct: item.comision_pct || '' })
    if (tab === 'zonas') setFormZona({ nombre: item.nombre, descripcion: item.descripcion || '' })
    if (tab === 'choferes') setFormChofer({ nombre: item.nombre, cedula: item.cedula || '', licencia: item.licencia || '', telefono: item.telefono || '', email: item.email || '', vehiculo: item.vehiculo || '', placa: item.placa || '' })
    if (tab === 'usuarios') setFormOperador({ nombre: item.nombre, username: item.username, password: '', modulos_permitidos: item.modulos_permitidos || [] })
    if (tab === 'ncf_electronicas') setFormNcfElec({
      tipo_ncf: item.tipo_ncf,
      secuencia_desde: item.secuencia_desde,
      secuencia_hasta: item.secuencia_hasta,
      fecha_vencimiento: item.fecha_vencimiento ? item.fecha_vencimiento.split('T')[0] : ''
    })
    setShowForm(true)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      if (tab === 'usuarios') {
        await API.delete(`/operadores/${id}`)
        fetchData()
      } else if (tab === 'ncf_electronicas') {
        await API.delete(`/mantenimiento/ncf-electronicas/${id}`)
        fetchNcfElectronicas()
      } else {
        await API.delete(`/mantenimiento/${tab}/${id}`)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (tab === 'usuarios') {
        if (editando) {
          const { password, ...datosSinPassword } = formOperador
          await API.put(`/operadores/${editando}`, datosSinPassword)
          if (password && password.trim().length > 0) {
            await API.put(`/operadores/${editando}/password`, { password })
          }
        } else {
          await API.post('/operadores', formOperador)
        }
        setShowForm(false)
        fetchData()
      } else if (tab === 'ncf_electronicas') {
        if (editando) {
          await API.put(`/mantenimiento/ncf-electronicas/${editando}`, formNcfElec)
        } else {
          await API.post('/mantenimiento/ncf-electronicas', formNcfElec)
        }
        setShowForm(false)
        fetchNcfElectronicas()
      } else {
        const form = tab === 'vendedores' ? formVendedor : tab === 'zonas' ? formZona : formChofer
        if (editando) {
          await API.put(`/mantenimiento/${tab}/${editando}`, form)
        } else {
          await API.post(`/mantenimiento/${tab}`, form)
        }
        setShowForm(false)
        fetchData()
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const tabs = [
    { id: 'vendedores', label: '🧑‍💼 Vendedores' },
    { id: 'zonas', label: '🗺️ Zonas' },
    { id: 'choferes', label: '🚗 Choferes' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'clave', label: '🔐 Clave Descuento' },
    { id: 'ncf_electronicas', label: '🧾 Secuencias NCF' },
  ]

  if (loading) return <p className="text-gray-500 p-6">Cargando...</p>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Mantenimiento</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(t => (
          <button key={t.id} onClick={async () => {
            setTab(t.id); setShowForm(false)
            if (t.id === 'clave') {
              try {
                const res = await API.get('/mantenimiento/clave-descuento')
                setClaveDescuento(res.data.data.valor)
                setNuevaClave('')
                setMensajeClave('')
              } catch(e) { setMensajeClave('❌ Error al cargar clave') }
            }
            if (t.id === 'ncf_electronicas') {
              fetchNcfElectronicas()
            }
          }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'clave' && (
        <div className="flex justify-end mb-4">
          <button onClick={handleNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + Nuevo
          </button>
        </div>
      )}

      {/* Formulario Vendedor */}
      {showForm && tab === 'vendedores' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formVendedor.nombre} onChange={e => setFormVendedor({...formVendedor, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input value={formVendedor.cedula} onChange={e => setFormVendedor({...formVendedor, cedula: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formVendedor.email} onChange={e => setFormVendedor({...formVendedor, email: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={formVendedor.telefono} onChange={e => setFormVendedor({...formVendedor, telefono: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select value={formVendedor.zona_id} onChange={e => setFormVendedor({...formVendedor, zona_id: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin zona</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión %</label>
              <input type="number" step="0.01" value={formVendedor.comision_pct} onChange={e => setFormVendedor({...formVendedor, comision_pct: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input value={formVendedor.usuario} onChange={e => setFormVendedor({...formVendedor, usuario: e.target.value})}
                placeholder="Nombre de usuario para login"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={formVendedor.password} onChange={e => setFormVendedor({...formVendedor, password: e.target.value})}
                placeholder={editando ? 'Dejar vacío para no cambiar' : 'Contraseña de acceso'}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Zona */}
      {showForm && tab === 'zonas' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Zona' : 'Nueva Zona'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formZona.nombre} onChange={e => setFormZona({...formZona, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={formZona.descripcion} onChange={e => setFormZona({...formZona, descripcion: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Chofer */}
      {showForm && tab === 'choferes' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Chofer' : 'Nuevo Chofer'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={formChofer.nombre} onChange={e => setFormChofer({...formChofer, nombre: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input value={formChofer.cedula} onChange={e => setFormChofer({...formChofer, cedula: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licencia</label>
              <input value={formChofer.licencia} onChange={e => setFormChofer({...formChofer, licencia: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={formChofer.telefono} onChange={e => setFormChofer({...formChofer, telefono: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
              <input value={formChofer.vehiculo} onChange={e => setFormChofer({...formChofer, vehiculo: e.target.value})}
                placeholder="Ej: Toyota Hilux"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input value={formChofer.placa} onChange={e => setFormChofer({...formChofer, placa: e.target.value})}
                placeholder="Ej: A123456"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Operador (Usuario) */}
      {showForm && tab === 'usuarios' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input value={formOperador.nombre} onChange={e => setFormOperador({...formOperador, nombre: e.target.value})} required
                  placeholder="Ej: Juan Pérez"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                <input value={formOperador.username} onChange={e => setFormOperador({...formOperador, username: e.target.value})} required
                  placeholder="Ej: juanp"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {!editando && '*'}</label>
                <input type="password" value={formOperador.password} onChange={e => setFormOperador({...formOperador, password: e.target.value})} required={!editando}
                  placeholder={editando ? 'Dejar vacío para no cambiar' : 'Mínimo 4 caracteres'}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Módulos y Permisos */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-800">📋 Módulos y Permisos:</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const todos = MODULOS_DISPONIBLES.flatMap(cat => cat.items.flatMap(i => [i.id, ...(i.sub_tabs || []).map(s => s.id)]))
                    setFormOperador({...formOperador, modulos_permitidos: todos})
                  }}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 font-medium">
                    ✓ Todos
                  </button>
                  <button type="button" onClick={() => setFormOperador({...formOperador, modulos_permitidos: []})}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 font-medium">
                    ✗ Ninguno
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {MODULOS_DISPONIBLES.map(categoria => (
                  <div key={categoria.categoria} className="border rounded-lg p-4 bg-gray-50">
                    <h5 className="text-xs font-bold text-blue-600 mb-3 tracking-wide">{categoria.categoria}</h5>
                    <div className="space-y-3">
                      {categoria.items.map(modulo => (
                        <div key={modulo.id} className="bg-white rounded p-3 border">
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input type="checkbox"
                              checked={formOperador.modulos_permitidos.includes(modulo.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setFormOperador({...formOperador, modulos_permitidos: [...formOperador.modulos_permitidos, modulo.id]})
                                } else {
                                  const subIds = (modulo.sub_tabs || []).map(s => s.id)
                                  setFormOperador({...formOperador, modulos_permitidos: formOperador.modulos_permitidos.filter(m => m !== modulo.id && !subIds.includes(m))})
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                            <span className="text-sm text-gray-800">{modulo.label}</span>
                            {modulo.sub_tabs && (
                              <span className="text-xs text-gray-400 ml-2">({modulo.sub_tabs.length} opciones)</span>
                            )}
                          </label>

                          {modulo.sub_tabs && formOperador.modulos_permitidos.includes(modulo.id) && (
                            <div className="mt-3 ml-6 pl-3 border-l-2 border-blue-200">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-gray-500 font-medium">Sub-opciones:</p>
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => {
                                    const subIds = modulo.sub_tabs.map(s => s.id)
                                    const nuevos = [...new Set([...formOperador.modulos_permitidos, ...subIds])]
                                    setFormOperador({...formOperador, modulos_permitidos: nuevos})
                                  }}
                                    className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                    ✓ Todos
                                  </button>
                                  <button type="button" onClick={() => {
                                    const subIds = modulo.sub_tabs.map(s => s.id)
                                    setFormOperador({...formOperador, modulos_permitidos: formOperador.modulos_permitidos.filter(m => !subIds.includes(m))})
                                  }}
                                    className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                                    ✗ Ninguno
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {modulo.sub_tabs.map(sub => (
                                  <label key={sub.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                    <input type="checkbox"
                                      checked={formOperador.modulos_permitidos.includes(sub.id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setFormOperador({...formOperador, modulos_permitidos: [...formOperador.modulos_permitidos, sub.id]})
                                        } else {
                                          setFormOperador({...formOperador, modulos_permitidos: formOperador.modulos_permitidos.filter(m => m !== sub.id)})
                                        }
                                      }}
                                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500" />
                                    <span className="text-xs text-gray-600">{sub.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario NCF Electrónicas */}
      {showForm && tab === 'ncf_electronicas' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editando ? 'Editar Secuencia NCF' : 'Nueva Secuencia NCF Electrónica'}</h3>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de NCF *</label>
              <select value={formNcfElec.tipo_ncf} onChange={e => setFormNcfElec({...formNcfElec, tipo_ncf: e.target.value})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <optgroup label="Tradicionales (DGII)">
                  <option value="B01">B01 - Crédito Fiscal</option>
                  <option value="B02">B02 - Consumidor Final</option>
                  <option value="B15">B15 - Gubernamental</option>
                </optgroup>
                <optgroup label="Electrónicos (e-CF)">
                  <option value="E31">E31 - Crédito Fiscal Electrónico</option>
                  <option value="E32">E32 - Consumo Electrónico</option>
                  <option value="E34">E34 - Nota de Crédito Electrónica</option>
                </optgroup>
              </select>
            </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento {['E31', 'E32', 'E34'].includes(formNcfElec.tipo_ncf) ? '*' : '(opcional)'}
              </label>
              <input type="date" value={formNcfElec.fecha_vencimiento} onChange={e => setFormNcfElec({...formNcfElec, fecha_vencimiento: e.target.value})}
                required={['E31', 'E32', 'E34'].includes(formNcfElec.tipo_ncf)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secuencia Desde *</label>
              <input type="number" min="1" value={formNcfElec.secuencia_desde} onChange={e => setFormNcfElec({...formNcfElec, secuencia_desde: parseInt(e.target.value) || 1})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secuencia Hasta *</label>
              <input type="number" min="2" value={formNcfElec.secuencia_hasta} onChange={e => setFormNcfElec({...formNcfElec, secuencia_hasta: parseInt(e.target.value) || 1000})} required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
              <strong>📋 Vista previa:</strong> {formNcfElec.tipo_ncf}{String(formNcfElec.secuencia_desde).padStart(['E31', 'E32', 'E34'].includes(formNcfElec.tipo_ncf) ? 10 : 8, '0')} → {formNcfElec.tipo_ncf}{String(formNcfElec.secuencia_hasta).padStart(['E31', 'E32', 'E34'].includes(formNcfElec.tipo_ncf) ? 10 : 8, '0')}
              <br />
              <strong>Total disponibles:</strong> {(parseInt(formNcfElec.secuencia_hasta) - parseInt(formNcfElec.secuencia_desde) + 1).toLocaleString()} NCF
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{editando ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla Vendedores */}
      {tab === 'vendedores' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Cédula</th>
                <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
                <th className="px-4 py-3 text-left text-gray-600">Zona</th>
                <th className="px-4 py-3 text-left text-gray-600">Comisión</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No hay vendedores registrados</td></tr>
              ) : vendedores.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.nombre}</td>
                  <td className="px-4 py-3">{v.cedula || '-'}</td>
                  <td className="px-4 py-3">{v.telefono || '-'}</td>
                  <td className="px-4 py-3">{v.zona_nombre || '-'}</td>
                  <td className="px-4 py-3">{v.comision_pct}%</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(v)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(v.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Zonas */}
      {tab === 'zonas' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zonas.length === 0 ? (
                <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">No hay zonas registradas</td></tr>
              ) : zonas.map(z => (
                <tr key={z.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{z.nombre}</td>
                  <td className="px-4 py-3">{z.descripcion || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(z)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(z.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Choferes */}
      {tab === 'choferes' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Cédula</th>
                <th className="px-4 py-3 text-left text-gray-600">Licencia</th>
                <th className="px-4 py-3 text-left text-gray-600">Teléfono</th>
                <th className="px-4 py-3 text-left text-gray-600">Vehículo</th>
                <th className="px-4 py-3 text-left text-gray-600">Placa</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {choferes.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay choferes registrados</td></tr>
              ) : choferes.map(c => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3">{c.cedula || '-'}</td>
                  <td className="px-4 py-3">{c.licencia || '-'}</td>
                  <td className="px-4 py-3">{c.telefono || '-'}</td>
                  <td className="px-4 py-3">{c.vehiculo || '-'}</td>
                  <td className="px-4 py-3">{c.placa || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(c.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla Usuarios (Operadores) */}
      {tab === 'usuarios' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left text-gray-600">Usuario</th>
                <th className="px-4 py-3 text-left text-gray-600">Módulos</th>
                <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {operadores.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No hay usuarios registrados</td></tr>
              ) : operadores.map(op => (
                <tr key={op.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{op.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs">{op.username}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      {(op.modulos_permitidos || []).length} módulos
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${op.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {op.activo ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(op)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={async () => {
                      try {
                        await API.put(`/operadores/${op.id}/toggle-activo`)
                        fetchData()
                      } catch (err) { console.error(err) }
                    }} className={`${op.activo ? 'text-orange-600' : 'text-green-600'} hover:underline text-xs`}>
                      {op.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => handleEliminar(op.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla NCF Electrónicas */}
      {tab === 'ncf_electronicas' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left text-gray-600">Desde</th>
                <th className="px-4 py-3 text-left text-gray-600">Hasta</th>
                <th className="px-4 py-3 text-left text-gray-600">Actual</th>
                <th className="px-4 py-3 text-left text-gray-600">Disponibles</th>
                <th className="px-4 py-3 text-left text-gray-600">Usados</th>
                <th className="px-4 py-3 text-left text-gray-600">Vencimiento</th>
                <th className="px-4 py-3 text-left text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ncfElectronicas.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">No hay secuencias NCF registradas</td></tr>
              ) : ncfElectronicas.map(n => (
                <tr key={n.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                      {n.tipo_ncf}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{n.prefijo}{String(n.secuencia_desde).padStart(10, '0')}</td>
                  <td className="px-4 py-3 font-mono text-xs">{n.prefijo}{String(n.secuencia_hasta).padStart(10, '0')}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{n.prefijo}{String(n.secuencia_actual).padStart(10, '0')}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                      {parseInt(n.disponibles).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {parseInt(n.usados).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{n.fecha_vencimiento ? new Date(n.fecha_vencimiento).toLocaleDateString('es-DO') : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${n.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {n.activo ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(n)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleEliminar(n.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista Clave Descuento */}
      {tab === 'clave' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 max-w-2xl">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">🔐 Clave de Autorización de Descuentos</h3>
            <p className="text-sm text-gray-600">Esta clave permite autorizar la venta de productos por debajo del precio oficial. Comparta esta clave solo con personal autorizado (administradores, contabilidad, gerentes).</p>
          </div>

          {mensajeClave && (
            <div className={`p-3 rounded mb-4 text-sm ${mensajeClave.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {mensajeClave}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-blue-900 mb-2">Clave Actual</label>
            <div className="flex items-center gap-3">
              <input type={mostrarClave ? 'text' : 'password'} value={claveDescuento} readOnly
                className="flex-1 border border-blue-300 rounded px-3 py-2 text-sm bg-white font-mono tracking-wider" />
              <button onClick={() => setMostrarClave(!mostrarClave)}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                {mostrarClave ? '🙈 Ocultar' : '👁️ Ver'}
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-800 mb-3">Cambiar Clave</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Clave (mínimo 4 caracteres)</label>
                <input type="text" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)}
                  placeholder="Escriba la nueva clave..."
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={async () => {
                if (nuevaClave.trim().length < 4) {
                  setMensajeClave('❌ La clave debe tener al menos 4 caracteres')
                  return
                }
                if (!confirm(`¿Cambiar la clave de descuento a "${nuevaClave}"?`)) return
                try {
                  await API.put('/mantenimiento/clave-descuento', { nueva_clave: nuevaClave })
                  setClaveDescuento(nuevaClave)
                  setNuevaClave('')
                  setMensajeClave('✅ Clave actualizada correctamente')
                } catch(e) {
                  setMensajeClave('❌ ' + (e.response?.data?.mensaje || 'Error al actualizar'))
                }
              }}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap">
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}