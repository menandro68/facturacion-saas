import { useState, useEffect } from 'react'
import API from '../services/api'

export default function ValorInventario() {
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState({ totalCosto: 0, totalVenta: 0, totalProductos: 0 })

  const fetchData = async () => {
    try {
      const [inv, prod] = await Promise.all([
        API.get('/inventory'),
        API.get('/products')
      ])

      const inventario = inv.data.data
      const productos = prod.data.data

      const resultadoPromises = inventario.map(async item => {
        const producto = productos.find(p => p.id === item.product_id)
        let costo = parseFloat(producto?.costo || 0)

        if (costo === 0 && item.product_id) {
          try {
            const res = await API.get(`/purchase-orders/ultimo-precio/${item.product_id}`)
            if (res.data.data) {
              costo = parseFloat(res.data.data.precio || 0)
            }
          } catch (e) {}
        }

        const precio = parseFloat(producto?.precio || 0)
        const stock = parseFloat(item.stock_actual || 0)
        const valorCosto = costo * stock
        const valorVenta = precio * stock
        const beneficio = valorVenta - valorCosto

        return {
          id: item.id,
          producto: item.producto_nombre,
          stock,
          unidad: item.unidad,
          costo,
          precio,
          valorCosto,
          valorVenta,
          beneficio
        }
      })

      const resultado = await Promise.all(resultadoPromises)

      const totalCosto = resultado.reduce((s, r) => s + r.valorCosto, 0)
      const totalVenta = resultado.reduce((s, r) => s + r.valorVenta, 0)

      setDatos(resultado)
      setResumen({ totalCosto, totalVenta, totalProductos: resultado.length })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <p className="text-gray-500">Cargando valor de inventario...</p>

  const handlePrint = () => {
    const contenido = document.getElementById('valor-inventario-print').innerHTML
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html>
        <head>
          <title>Valor de Inventario</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
            th { background-color: #f5f5f5; }
            .card { border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 6px; }
            .total-row { font-weight: bold; background: #f9f9f9; }
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
          🖨️ Imprimir Valor de Inventario
        </button>
      </div>

      <div id="valor-inventario-print">
      <h2 style={{marginBottom:'16px', fontWeight:'bold', fontSize:'18px'}}>Valor de Inventario</h2>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Productos</p>
          <p className="text-2xl font-bold text-blue-600">{resumen.totalProductos}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">Valor a Costo</p>
          <p className="text-2xl font-bold text-orange-600">
            RD${resumen.totalCosto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lo que invertiste</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Valor a Precio de Venta</p>
          <p className="text-2xl font-bold text-green-600">
            RD${resumen.totalVenta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lo que puedes recibir</p>
        </div>
      </div>

      {/* Beneficio potencial */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 font-medium">💰 Beneficio Potencial del Inventario</p>
        <p className="text-3xl font-bold text-green-700 mt-1">
          RD${(resumen.totalVenta - resumen.totalCosto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500 mt-1">Diferencia entre valor de venta y costo de inventario</p>
      </div>

      {/* Tabla detalle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600">Producto</th>
              <th className="px-4 py-3 text-left text-gray-600">Stock</th>
              <th className="px-4 py-3 text-left text-gray-600">Costo Unit.</th>
              <th className="px-4 py-3 text-left text-gray-600">Precio Venta</th>
              <th className="px-4 py-3 text-left text-gray-600">Valor Costo</th>
              <th className="px-4 py-3 text-left text-gray-600">Valor Venta</th>
              <th className="px-4 py-3 text-left text-gray-600">Beneficio</th>
            </tr>
          </thead>
          <tbody>
            {datos.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No hay productos en inventario</td></tr>
            ) : datos.map(d => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.producto}</td>
                <td className="px-4 py-3">{d.stock} {d.unidad}</td>
                <td className="px-4 py-3">RD${d.costo.toLocaleString()}</td>
                <td className="px-4 py-3">RD${d.precio.toLocaleString()}</td>
                <td className="px-4 py-3 text-orange-600 font-medium">
                  RD${d.valorCosto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-green-600 font-medium">
                  RD${d.valorVenta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${d.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    RD${d.beneficio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {datos.length > 0 && (
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td colSpan="4" className="px-4 py-3 text-gray-700">TOTALES</td>
                <td className="px-4 py-3 text-orange-600">
                  RD${resumen.totalCosto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-green-600">
                  RD${resumen.totalVenta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-green-700">
                  RD${(resumen.totalVenta - resumen.totalCosto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div>
    </div>
  )
}