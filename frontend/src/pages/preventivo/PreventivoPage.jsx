import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const ESTADO_ESTILO = {
  PLANIFICADO:       'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  EJECUTADO:         'bg-green-50 text-[#4caf82] border border-green-200',
  ATRASADO:          'bg-red-50 text-[#e05252] border border-red-200',
  PENDIENTE_TERCERO: 'bg-yellow-50 text-[#e8a838] border border-yellow-200',
}

export default function PreventivoPage() {
  const navigate = useNavigate()
  const [programas, setProgramas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/preventivo/programas/')
      .then(({ data }) => setProgramas(data.results ?? data))
      .catch(() => setError('No se pudieron cargar los programas'))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#191c1e]">Mantenimiento Preventivo</h1>
        <p className="text-[#40484f] text-sm mt-1">Programas de inspección y evaluación de equipos</p>
      </div>

      {cargando && <p className="text-[#b0b1b3] text-sm">Cargando...</p>}
      {error    && <p className="text-[#e05252] text-sm">{error}</p>}

      {!cargando && !error && programas.length === 0 && (
        <div className="bg-white border border-[#c0c7d0] rounded-2xl p-8 text-center">
          <p className="text-[#b0b1b3] text-sm">No hay programas registrados.</p>
        </div>
      )}

      <div className="space-y-2">
          {programas.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/preventivo/informe/${p.id}`)}
              className="bg-white border border-[#e2e4e8] hover:border-[#5aa0d3] hover:shadow-sm rounded-xl px-5 py-4 cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-[#1a1d23] text-sm">{p.equipo_nombre}</p>
                  <p className="text-[#b0b1b3] text-xs mt-0.5">{p.anio} — Mes {p.mes_planificado}</p>
                  {p.proveedor_nombre && (
                    <p className="text-[#5aa0d3] text-xs mt-1">{p.proveedor_nombre}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_ESTILO[p.estado] || 'bg-gray-100 text-[#b0b1b3]'}`}>
                    {p.estado.replace('_', ' ')}
                  </span>
                  {p.score_salud_ultimo && (
                    <span className="text-xs text-[#b0b1b3]">Score {parseFloat(p.score_salud_ultimo).toFixed(1)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
