import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const ESTADO_ESTILO = {
  PLANIFICADO: 'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  EJECUTADO:   'bg-green-50 text-[#4caf82] border border-green-200',
  ATRASADO:    'bg-red-50 text-[#e05252] border border-red-200',
  STANDBY:     'bg-gray-100 text-[#6b7280] border border-gray-300',
}

const ANIO_ACTUAL = new Date().getFullYear()
const MES_ACTUAL = new Date().getMonth() + 1
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const ESTADOS_FILTRO = [
  ['PENDIENTES', 'Pendientes'],
  ['', 'Todos'],
  ['PLANIFICADO', 'Planificado'],
  ['EJECUTADO', 'Ejecutado'],
  ['ATRASADO', 'Atrasado'],
  ['STANDBY', 'En Standby'],
]

export default function PreventivoPage() {
  const navigate = useNavigate()
  const [programas, setProgramas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState(false)

  // Filtros — por defecto: pendientes del mes actual
  const [zonas, setZonas] = useState([])
  const [lugares, setLugares] = useState([])
  const [secciones, setSecciones] = useState([])
  const [filtro, setFiltro] = useState({
    anio: ANIO_ACTUAL, mes: MES_ACTUAL, estado: 'PENDIENTES',
    zona: '', lugar: '', seccion: '',
  })

  const queryFiltros = () => {
    const q = new URLSearchParams()
    if (filtro.anio)    q.set('anio', filtro.anio)
    if (filtro.mes)     q.set('mes', filtro.mes)
    if (filtro.estado)  q.set('estado', filtro.estado)
    if (filtro.zona)    q.set('zona', filtro.zona)
    if (filtro.lugar)   q.set('lugar', filtro.lugar)
    if (filtro.seccion) q.set('seccion', filtro.seccion)
    return q.toString()
  }

  // Cargar zonas una vez
  useEffect(() => {
    api.get('/api/activos/zonas/').then(({ data }) => setZonas(data.results ?? data))
  }, [])

  // Cascada zona -> lugares
  useEffect(() => {
    if (!filtro.zona) { setLugares([]); return }
    api.get(`/api/activos/lugares/?zona=${filtro.zona}`).then(({ data }) => setLugares(data.results ?? data))
  }, [filtro.zona])

  // Cascada lugar -> secciones
  useEffect(() => {
    if (!filtro.lugar) { setSecciones([]); return }
    api.get(`/api/activos/secciones/?lugar=${filtro.lugar}`).then(({ data }) => setSecciones(data.results ?? data))
  }, [filtro.lugar])

  // Lista de programas segun filtros
  useEffect(() => {
    setCargando(true)
    api.get(`/api/preventivo/programas/?${queryFiltros()}`)
      .then(({ data }) => setProgramas(data.results ?? data))
      .catch(() => setError('No se pudieron cargar los programas'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const descargarProgramaAnual = async () => {
    setDescargando(true)
    setError('')
    try {
      const { data: blob } = await api.get(
        `/api/preventivo/programas/programa-anual-excel/?${queryFiltros()}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PROGRAMA_MANTTO_${filtro.anio}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el programa anual.')
    } finally {
      setDescargando(false)
    }
  }

  // ------- Exportación consolidada (modal con checks) -------
  const [modalExportar, setModalExportar] = useState(false)
  const [informesDisp, setInformesDisp] = useState([])
  const [cargandoInformes, setCargandoInformes] = useState(false)
  const [incluirPrograma, setIncluirPrograma] = useState(true)
  const [seleccion, setSeleccion] = useState({})
  const [exportando, setExportando] = useState(false)

  const abrirExportar = async () => {
    setModalExportar(true)
    setCargandoInformes(true)
    setSeleccion({})
    setIncluirPrograma(true)
    try {
      const { data } = await api.get(`/api/preventivo/informes/?${queryFiltros()}`)
      setInformesDisp(data.results ?? data)
    } catch {
      setInformesDisp([])
    } finally {
      setCargandoInformes(false)
    }
  }

  const toggleTodos = () => {
    const todosMarcados = informesDisp.length > 0 && informesDisp.every(i => seleccion[i.id])
    const nueva = {}
    if (!todosMarcados) informesDisp.forEach(i => { nueva[i.id] = true })
    setSeleccion(nueva)
  }

  const exportarConsolidado = async () => {
    setExportando(true)
    setError('')
    try {
      const { data: blob } = await api.post(
        '/api/preventivo/programas/exportar-consolidado/',
        {
          anio: filtro.anio,
          zona: filtro.zona || undefined,
          lugar: filtro.lugar || undefined,
          seccion: filtro.seccion || undefined,
          incluir_programa: incluirPrograma,
          informes: Object.keys(seleccion).filter(id => seleccion[id]),
        },
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MANTTO_CONSOLIDADO_${filtro.anio}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setModalExportar(false)
    } catch {
      setError('No se pudo generar el consolidado.')
    } finally {
      setExportando(false)
    }
  }

  const totalMarcados = Object.values(seleccion).filter(Boolean).length

  const selectCls = 'border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm text-[#191c1e] bg-white focus:outline-none focus:border-[#036494]'

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#191c1e]">Mantenimiento Preventivo</h1>
          <p className="text-[#40484f] text-sm mt-1">Programas de inspección y evaluación de equipos</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={descargarProgramaAnual}
            disabled={descargando}
            className="border border-[#c0c7d0] hover:border-[#036494] text-[#40484f] hover:text-[#036494] disabled:opacity-40 bg-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all"
          >
            {descargando ? 'Generando...' : 'Programa Anual'}
          </button>
          <button
            onClick={abrirExportar}
            className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            Exportar consolidado
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#c0c7d0] rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Año</span>
          <select value={filtro.anio} onChange={e => setFiltro({ ...filtro, anio: e.target.value })} className={selectCls + ' w-full'}>
            {[ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Mes</span>
          <select value={filtro.mes} onChange={e => setFiltro({ ...filtro, mes: e.target.value })} className={selectCls + ' w-full'}>
            <option value="">Todos</option>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Estado</span>
          <select value={filtro.estado} onChange={e => setFiltro({ ...filtro, estado: e.target.value })} className={selectCls + ' w-full'}>
            {ESTADOS_FILTRO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Zona</span>
          <select
            value={filtro.zona}
            onChange={e => setFiltro({ ...filtro, zona: e.target.value, lugar: '', seccion: '' })}
            className={selectCls + ' w-full'}
          >
            <option value="">Todas</option>
            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Lugar</span>
          <select
            value={filtro.lugar}
            onChange={e => setFiltro({ ...filtro, lugar: e.target.value, seccion: '' })}
            disabled={!filtro.zona}
            className={selectCls + ' w-full disabled:bg-[#f3f4f6]'}
          >
            <option value="">Todos</option>
            {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Sección</span>
          <select
            value={filtro.seccion}
            onChange={e => setFiltro({ ...filtro, seccion: e.target.value })}
            disabled={!filtro.lugar}
            className={selectCls + ' w-full disabled:bg-[#f3f4f6]'}
          >
            <option value="">Todas</option>
            {secciones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
      </div>

      {cargando && <p className="text-[#b0b1b3] text-sm">Cargando...</p>}
      {error    && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

      {!cargando && !error && programas.length === 0 && (
        <div className="bg-white border border-[#c0c7d0] rounded-2xl p-8 text-center">
          <p className="text-[#b0b1b3] text-sm">No hay programas con estos filtros.</p>
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
                <p className="text-[#b0b1b3] text-xs mt-0.5">{MESES[p.mes_planificado]} {p.anio}</p>
                {p.requiere_tercero && (
                  <p className="text-[#e07a38] text-xs mt-1">Requiere proveedor tercero</p>
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

      {/* Modal de exportación consolidada */}
      {modalExportar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white border border-[#c0c7d0] rounded-xl shadow-lg p-6 w-full max-w-lg my-4">
            <p className="font-semibold text-[#191c1e] mb-1">Exportar consolidado</p>
            <p className="text-[#b0b1b3] text-sm mb-4">
              Marca lo que quieres incluir en un solo Excel ({filtro.anio}{filtro.zona ? ', con los filtros aplicados' : ''}).
            </p>

            {/* Programa anual */}
            <label className="flex items-center gap-3 border border-[#e2e4e8] rounded-lg px-4 py-3 mb-3 cursor-pointer hover:border-[#036494] transition-colors">
              <input
                type="checkbox"
                checked={incluirPrograma}
                onChange={(e) => setIncluirPrograma(e.target.checked)}
                className="w-4 h-4 accent-[#036494]"
              />
              <div>
                <p className="text-sm font-medium text-[#191c1e]">Programa Anual (matriz de equipos)</p>
                <p className="text-[#b0b1b3] text-xs">Hoja "PROGR. MANTTO. EQ." con Planificado/Realizado</p>
              </div>
            </label>

            {/* Informes */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#40484f]">Reportes de equipos ({informesDisp.length})</p>
              {informesDisp.length > 0 && (
                <button onClick={toggleTodos} className="text-xs text-[#036494] hover:underline">
                  {informesDisp.every(i => seleccion[i.id]) ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>

            <div className="border border-[#e2e4e8] rounded-lg max-h-56 overflow-y-auto divide-y divide-[#f0f0f0] mb-4">
              {cargandoInformes && <p className="text-[#b0b1b3] text-sm p-3">Cargando informes...</p>}
              {!cargandoInformes && informesDisp.length === 0 && (
                <p className="text-[#b0b1b3] text-sm p-3">No hay informes con los filtros actuales.</p>
              )}
              {informesDisp.map(inf => (
                <label key={inf.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f8f9fb] transition-colors">
                  <input
                    type="checkbox"
                    checked={!!seleccion[inf.id]}
                    onChange={(e) => setSeleccion(prev => ({ ...prev, [inf.id]: e.target.checked }))}
                    className="w-4 h-4 accent-[#036494]"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-[#191c1e]">{inf.equipo_nombre || 'Sin equipo'}</p>
                    <p className="text-[#b0b1b3] text-xs">
                      {inf.mes ? MESES[inf.mes] : '—'} · {inf.fecha} · {inf.estado_informe}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalExportar(false)}
                className="flex-1 border border-[#c0c7d0] hover:border-[#b0b1b3] text-[#191c1e] py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={exportarConsolidado}
                disabled={exportando || (!incluirPrograma && totalMarcados === 0)}
                className="flex-1 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {exportando ? 'Generando...' : `Descargar (${(incluirPrograma ? 1 : 0) + totalMarcados} elementos)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
