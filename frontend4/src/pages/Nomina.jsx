import { useState } from 'react'
import Empleados from './Empleados'
import NominaPeriodos from './NominaPeriodos'
import NominaMovimientos from './NominaMovimientos'
import NominaPrestamos from './NominaPrestamos'
import NominaRegalia from './NominaRegalia'
import NominaLiquidacion from './NominaLiquidacion'
import NominaConfig from './NominaConfig'

export default function Nomina() {
  const [tab, setTab] = useState('empleados')

  const tabs = [
    { id: 'empleados', label: 'Empleados' },
    { id: 'periodos', label: 'Periodos' },
           { id: 'movimientos', label: 'Movimientos' },
    { id: 'prestamos', label: 'Prestamos' },
    { id: 'regalia', label: 'Regalia Pascual' },
    { id: 'liquidacion', label: 'Liquidaciones' },
    { id: 'config', label: 'Configuracion' },
  ]

  return (
    <div>
      <div className="px-6 pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Nomina</h2>
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

      {tab === 'empleados' && <Empleados />}
      {tab === 'periodos' && <NominaPeriodos />}
      {tab === 'movimientos' && <NominaMovimientos />}
      {tab === 'prestamos' && <NominaPrestamos />}
      {tab === 'regalia' && <NominaRegalia />}
      {tab === 'liquidacion' && <NominaLiquidacion />}
      {tab === 'config' && <NominaConfig />}
    </div>
  )
}