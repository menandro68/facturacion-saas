import { useState, useEffect } from 'react'
import API from '../services/api'

export default function StockMinimo() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [inv, prod] = await Promise.all([
        API.get('/inventory'),
        API.get('/products')
      ])

      const inventario = inv.data.data
      const productosList = prod.data.data

      const resultado = inventario.map(item => {
        const producto = productosList.find(p => p.id === item.product_id)
        const stock_actual = parseFloat(item.stock_actual || 0)
        const stock_minimo = parseFloat(producto?.stock_minimo || item.stock_minimo || 0)
        const stock_maximo = parseFloat(producto?.stock_maximo || item.stock_maximo || 0)
        const estado = stock_actual <= stock_minimo ? 'critico' :
                       stock_actual <= stock_minimo * 1.5 ? 'bajo' : 'normal'
        return {
          id: item.id,
          nombre: item.producto_nombre,
          stock_actual,
          stock_minimo,
          stock_maximo,
          unidad: item.unidad,
          estado,
          suplidor: producto?.suplidor || '-'
        }
      }).filter(item => item.stock_minimo > 0)
        .sort((a, b) => {
          const orden = { critico: 0, bajo: 1, normal: 2 }
          return orden[a.estado] - orden[b.estado]
        })

      setProductos(resultado)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const criticos = productos.filter(p => p.estado === 'critico')
  const bajos = productos.filter(p => p.estado === 'bajo')
  const normales = productos.filter(p => p.estado === 'normal')

  if (loading) return <p className="text-gray-500">Cargando stock mínimo...</p>

  const handlePrint = () => {
    const contenido = document.getElementById('stock-minimo-print').innerHTML
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html>
        <head>
          <title>Stock Mínimo</title>
          <style>
            @page { size: landscape; margin: 15px; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
            th { background-color: #f5f5f5; }
            h2 { color: #333; }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `)
    ventana.document.close()
    ventana.print()
    ventana.close()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={handlePrint}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm flex items-center gap-2">
          🖨️ Imprimir Stock Mínimo
        </button>
      </div>
      <div id="stock-minimo-print">
      <h2 style={{marginBottom:'16px', fontWeight:'bold', fontSize:'18px'}}>Stock Mínimo</h2>
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">🔴 Stock Crítico</p>
          <p className="text-3xl font-bold text-red-600">{criticos.length}</p>
          <p className="text-xs text-red-500 mt-1">Por debajo del mínimo</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-700">🟡 Stock Bajo</p>
          <p className="text-3xl font-bold text-orange-600">{bajos.length}</p>
          <p className="text-xs text-orange-500 mt-1">Cerca del mínimo</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">🟢 Stock Normal</p>
          <p className="text-3xl font-bold text-green-600">{normales.length}</p>
          <p className="text-xs text-green-500 mt-1">Por encima del mínimo</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Producto</th>
              <th className="px-4 py-3 text-left text-gray-600">Stock Actual</th>
              <th className="px-4 py-3 text-left text-gray-600">Stock Mínimo</th>
              <th className="px-4 py-3 text-left text-gray-600">Stock Máximo</th>
              <th className="px-4 py-3 text-left text-gray-600">Diferencia</th>
              <th className="px-4 py-3 text-left text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left text-gray-600">Suplidor</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                No hay productos con stock mínimo definido
              </td></tr>
            ) : productos.map(p => (
              <tr key={p.id} className={`border-t hover:bg-gray-50 ${p.estado === 'critico' ? 'bg-red-50' : p.estado === 'bajo' ? 'bg-orange-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className={`px-4 py-3 font-bold ${p.estado === 'critico' ? 'text-red-600' : p.estado === 'bajo' ? 'text-orange-500' : 'text-green-600'}`}>
                  {p.stock_actual} {p.unidad}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.stock_minimo} {p.unidad}</td>
                <td className="px-4 py-3 text-gray-600">{p.stock_maximo > 0 ? `${p.stock_maximo} ${p.unidad}` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={p.stock_actual - p.stock_minimo < 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {p.stock_actual - p.stock_minimo > 0 ? '+' : ''}{(p.stock_actual - p.stock_minimo).toFixed(2)} {p.unidad}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.estado === 'critico' && <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">🔴 CRÍTICO</span>}
                  {p.estado === 'bajo' && <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">🟡 BAJO</span>}
                  {p.estado === 'normal' && <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">🟢 NORMAL</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.suplidor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}