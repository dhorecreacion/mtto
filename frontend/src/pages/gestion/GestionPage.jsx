import { useState } from 'react'
import UbicacionesTab from './UbicacionesTab'
import EquiposTab from './EquiposTab'
import ProgramasTab from './ProgramasTab'
import UsuariosTab from './UsuariosTab'

const TABS = [
  { id: 'usuarios',    label: 'Usuarios' },
  { id: 'ubicaciones', label: 'Ubicaciones' },
  { id: 'equipos',     label: 'Equipos' },
  { id: 'programas',   label: 'Programas' },
]

export default function GestionPage() {
  const [tab, setTab] = useState('usuarios')

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#191c1e]">Gestión</h1>
        <p className="text-[#40484f] text-sm mt-1">Administración de catálogos maestros y programación</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#c0c7d0] mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-[#036494] text-[#036494]'
                : 'border-transparent text-[#40484f] hover:text-[#036494]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'usuarios'    && <UsuariosTab />}
      {tab === 'ubicaciones' && <UbicacionesTab />}
      {tab === 'equipos'     && <EquiposTab />}
      {tab === 'programas'   && <ProgramasTab />}
    </div>
  )
}
