import { useState } from 'react'
import ContaAsientos from './ContaAsientos'
import ContaLibros from './ContaLibros'
import ContaBalanza from './ContaBalanza'
import ContaEstados from './ContaEstados'
import ContaPeriodos from './ContaPeriodos'
import ContaCuentas from './ContaCuentas'

export default function Contabilidad() {
  const [tab, setTab] = useState('asientos')

  const tabs = [
    { id: 'asientos', label: 'Asientos' },
    { id: 'libros', label: 'Libros' },
    { id: 'balanza', label: 'Balanza' },
    { id: 'estados', label: 'Estados Financieros' },
    { id: 'periodos', label: 'Cierre de Periodos' },
    { id: 'cuentas', label: 'Catalogo de Cuentas' },
  ]

  return (
    <div>
      <div className="px-6 pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Contabilidad</h2>
        <div className="flex gap-2 border-b border-gray-200 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'asientos' && <ContaAsientos />}
      {tab === 'libros' && <ContaLibros />}
      {tab === 'balanza' && <ContaBalanza />}
      {tab === 'estados' && <ContaEstados />}
      {tab === 'periodos' && <ContaPeriodos />}
      {tab === 'cuentas' && <ContaCuentas />}
    </div>
  )
}