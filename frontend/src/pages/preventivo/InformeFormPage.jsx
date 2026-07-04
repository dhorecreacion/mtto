import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'

const SCORE_LABEL = {
  1: { texto: 'Excelente', bg: 'bg-[#4caf82] text-white' },
  2: { texto: 'Bueno',     bg: 'bg-[#7bc47f] text-white' },
  3: { texto: 'Regular',   bg: 'bg-[#e8a838] text-white' },
  4: { texto: 'Malo',      bg: 'bg-[#e07a38] text-white' },
  5: { texto: 'Falla',     bg: 'bg-[#e05252] text-white' },
}

const ESTADO_INFORME = {
  BORRADOR: 'bg-yellow-50 text-[#e8a838] border border-yellow-200',
  ENVIADO:  'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  APROBADO: 'bg-green-50 text-[#4caf82] border border-green-200',
}

const ESTADO_PROGRAMA = {
  PLANIFICADO: 'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  EJECUTADO:   'bg-green-50 text-[#4caf82] border border-green-200',
  ATRASADO:    'bg-red-50 text-[#e05252] border border-red-200',
  STANDBY:     'bg-gray-100 text-[#6b7280] border border-gray-300',
}

const MESES_NOMBRE = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Evaluación nueva de un componente (estado local)
const evalNueva = () => ({
  id: null,             // id del score en BD (null = aún no guardado)
  score_inicial: 3,
  intervencion: false,
  detalle_intervencion: '',
  score_final: 3,
  requiere_tercero: false,
  observacion: '',
  derivado: false,
})

export default function InformeFormPage() {
  const { programaId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMIN'

  const [programa, setPrograma] = useState(null)
  const [equipo, setEquipo] = useState(null)
  const [informeExistente, setInformeExistente] = useState(null)
  // { [componenteId]: evalNueva() } — SOLO los componentes que el técnico inspecciona
  const [evals, setEvals] = useState({})
  const [hallazgos, setHallazgos] = useState('')
  const [nuevoComponente, setNuevoComponente] = useState('')
  const [fotos, setFotos] = useState({ ANTES: [], DESPUES: [] })
  const [fotosPreview, setFotosPreview] = useState({ ANTES: [], DESPUES: [] })
  const [fotosGuardadasIds, setFotasGuardadasIds] = useState({ ANTES: [], DESPUES: [] })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [modalRechazo, setModalRechazo] = useState(false)
  const [comentarioRechazo, setComentarioRechazo] = useState('')
  const [derivando, setDerivando] = useState({})   // { [componenteId]: true } mientras deriva

  const MAX_FOTOS = 5

  const puedeEditar = !informeExistente || informeExistente.estado_informe === 'BORRADOR'

  const setEval = (cId, cambios) =>
    setEvals(prev => ({ ...prev, [cId]: { ...prev[cId], ...cambios } }))

  // ------- Carga de datos -------
  const cargarDatos = useCallback(async () => {
    try {
      const { data: prog } = await api.get(`/api/preventivo/programas/${programaId}/`)
      setPrograma(prog)
      const { data: eq } = await api.get(`/api/activos/equipos/${prog.equipo}/`)
      setEquipo(eq)

      const { data: listaInformes } = await api.get(`/api/preventivo/informes/?programa=${programaId}`)
      const lista = listaInformes.results ?? listaInformes
      if (lista.length === 0) return

      const informe = lista[0]
      setInformeExistente(informe)
      if (informe.hallazgos_generales) setHallazgos(informe.hallazgos_generales)

      // Reconstruir evaluaciones desde los scores guardados
      const cargadas = {}
      informe.detalles_score.forEach(d => {
        cargadas[d.componente] = {
          id: d.id,
          score_inicial: d.score_inicial ?? d.score_valor,
          intervencion: d.intervencion || false,
          detalle_intervencion: d.detalle_intervencion || '',
          score_final: d.score_valor,
          requiere_tercero: d.requiere_tercero || false,
          observacion: d.observacion_tecnica || '',
          derivado: d.derivado || false,
        }
      })
      setEvals(cargadas)

      const evA = informe.evidencias.filter(e => e.tipo === 'ANTES')
      const evD = informe.evidencias.filter(e => e.tipo === 'DESPUES')
      setFotosPreview({ ANTES: evA.map(e => e.foto), DESPUES: evD.map(e => e.foto) })
      setFotasGuardadasIds({ ANTES: evA.map(e => e.id), DESPUES: evD.map(e => e.id) })
    } catch { setError('No se pudo cargar el programa') }
  }, [programaId])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // ------- Fotos -------
  const handleFoto = (tipo, archivos) => {
    const lista = Array.from(archivos)
    const disponibles = MAX_FOTOS - fotosPreview[tipo].length
    const nuevas = lista.slice(0, disponibles)
    if (nuevas.length === 0) return
    setFotos(prev => ({ ...prev, [tipo]: [...prev[tipo], ...nuevas] }))
    setFotosPreview(prev => ({ ...prev, [tipo]: [...prev[tipo], ...nuevas.map(f => URL.createObjectURL(f))] }))
  }

  const eliminarFoto = async (tipo, index) => {
    const fotoId = fotosGuardadasIds[tipo][index]
    if (fotoId && informeExistente) {
      try {
        await api.delete(`/api/preventivo/informes/${informeExistente.id}/fotos/${fotoId}/`)
        setFotasGuardadasIds(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, i) => i !== index) }))
      } catch { setError('No se pudo eliminar la foto.'); return }
    } else {
      const idx = index - fotosGuardadasIds[tipo].length
      setFotos(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, i) => i !== idx) }))
    }
    setFotosPreview(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, i) => i !== index) }))
  }

  // ------- Componentes del equipo -------
  const agregarComponente = async () => {
    if (!nuevoComponente.trim()) return
    try {
      const { data } = await api.post(`/api/activos/equipos/${equipo.id}/componentes/`, { nombre_componente: nuevoComponente.trim() })
      setEquipo(prev => ({ ...prev, componentes: [...prev.componentes, data] }))
      setNuevoComponente('')
    } catch { setError('No se pudo agregar el componente.') }
  }

  const eliminarComponente = async (componenteId) => {
    try {
      await api.delete(`/api/activos/equipos/${equipo.id}/componentes/${componenteId}/`)
      setEquipo(prev => ({ ...prev, componentes: prev.componentes.filter(c => c.id !== componenteId) }))
      setEvals(prev => { const e = { ...prev }; delete e[componenteId]; return e })
    } catch (e) { setError(e.response?.data?.error || 'No se pudo eliminar.') }
  }

  // ------- Evaluación por componente -------
  const quitarEvaluacion = async (cId) => {
    const ev = evals[cId]
    if (ev?.id && informeExistente) {
      try { await api.delete(`/api/preventivo/informes/${informeExistente.id}/scores/${ev.id}/`) }
      catch { setError('No se pudo quitar la evaluación.'); return }
    }
    setEvals(prev => { const e = { ...prev }; delete e[cId]; return e })
  }

  // Derivación INMEDIATA a correctivo (no espera aprobación)
  const derivarComponente = async (cId) => {
    const ev = evals[cId]
    if (!ev?.id || !informeExistente) return
    setDerivando(prev => ({ ...prev, [cId]: true }))
    setError('')
    try {
      await api.post(`/api/preventivo/informes/${informeExistente.id}/derivar-componente/`, { score_id: ev.id })
      setEval(cId, { derivado: true })
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo derivar a correctivo.')
    } finally {
      setDerivando(prev => ({ ...prev, [cId]: false }))
    }
  }

  // ------- Estados del informe -------
  const cambiarEstado = async (nuevoEstado, comentario = '') => {
    if (!informeExistente) return
    try {
      const { data } = await api.post(`/api/preventivo/informes/${informeExistente.id}/cambiar-estado/`, { estado: nuevoEstado, comentario })
      setInformeExistente({ ...informeExistente, estado_informe: data.estado_informe, comentario_rechazo: data.comentario_rechazo })
      setModalRechazo(false)
      setComentarioRechazo('')
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cambiar estado')
    }
  }

  // ------- Guardar -------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      let informeId
      if (informeExistente) {
        await api.patch(`/api/preventivo/informes/${informeExistente.id}/`, { hallazgos_generales: hallazgos })
        informeId = informeExistente.id
      } else {
        const { data } = await api.post('/api/preventivo/informes/', { programa: programaId, hallazgos_generales: hallazgos })
        informeId = data.id
      }

      // Guardar solo los componentes evaluados
      await Promise.all(Object.entries(evals).map(([cId, ev]) => {
        const payload = {
          componente: cId,
          score_inicial: ev.score_inicial,
          intervencion: ev.intervencion,
          detalle_intervencion: ev.intervencion ? ev.detalle_intervencion : '',
          score_valor: ev.intervencion ? ev.score_final : ev.score_inicial,
          requiere_tercero: (ev.intervencion ? ev.score_final : ev.score_inicial) >= 4 ? ev.requiere_tercero : false,
          observacion_tecnica: ev.observacion || '',
        }
        return ev.id
          ? api.patch(`/api/preventivo/informes/${informeId}/scores/${ev.id}/`, payload)
          : api.post(`/api/preventivo/informes/${informeId}/scores/`, payload)
      }))

      const subidas = []
      for (const tipo of ['ANTES', 'DESPUES']) {
        for (const archivo of fotos[tipo]) {
          const fd = new FormData()
          fd.append('foto', archivo)
          fd.append('tipo', tipo)
          subidas.push(api.post(`/api/preventivo/informes/${informeId}/fotos/`, fd))
        }
      }
      if (subidas.length > 0) await Promise.all(subidas)
      setFotos({ ANTES: [], DESPUES: [] })
      setGuardadoOk(true)
    } catch { setError('Error al guardar el informe.') } finally { setEnviando(false) }
  }

  const continuarEditando = async () => {
    setGuardadoOk(false)
    await cargarDatos()   // refresca ids de scores para poder derivar
  }

  // ================= RENDER =================

  if (modalRechazo) return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl border border-[#e2e4e8] shadow-lg p-6 w-full max-w-md">
        <p className="font-semibold text-[#1a1d23] mb-1">Devolver informe</p>
        <p className="text-[#b0b1b3] text-sm mb-4">Indica el motivo para que el técnico pueda corregirlo.</p>
        <textarea
          value={comentarioRechazo}
          onChange={(e) => setComentarioRechazo(e.target.value)}
          rows={4}
          placeholder="Describe qué debe corregirse..."
          className="w-full border border-[#e2e4e8] rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-[#5aa0d3] resize-none text-sm text-[#1a1d23]"
        />
        <div className="flex gap-3">
          <button onClick={() => setModalRechazo(false)} className="flex-1 border border-[#e2e4e8] hover:border-[#b0b1b3] text-[#1a1d23] py-2.5 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => cambiarEstado('BORRADOR', comentarioRechazo)}
            disabled={!comentarioRechazo.trim()}
            className="flex-1 bg-[#e05252] hover:bg-[#cc4444] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Devolver
          </button>
        </div>
      </div>
    </div>
  )

  if (guardadoOk) return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-[#e2e4e8] shadow-sm p-8 w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-5 h-5 rounded-full bg-[#4caf82]" />
        </div>
        <p className="text-lg font-semibold text-[#1a1d23] mb-2">Informe guardado</p>
        <p className="text-[#b0b1b3] text-sm mb-6">Los datos fueron registrados correctamente.</p>
        <div className="space-y-2">
          <button onClick={continuarEditando} className="w-full bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            Continuar en el informe
          </button>
          <button onClick={() => navigate('/preventivo')} className="w-full border border-[#e2e4e8] hover:border-[#b0b1b3] text-[#1a1d23] py-2.5 rounded-lg text-sm transition-colors">
            Volver a la lista
          </button>
        </div>
      </div>
    </div>
  )

  if (!programa || !equipo) return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">
      <p className="text-[#b0b1b3] text-sm">{error || 'Cargando...'}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-white border-b border-[#e2e4e8] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/preventivo')} className="text-[#b0b1b3] hover:text-[#1a1d23] text-sm transition-colors">Volver</button>
        <span className="text-xs font-semibold tracking-widest uppercase text-[#b0b1b3]">Informe de Inspección</span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-4">

        {/* Cabecera equipo */}
        <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
          <p className="font-semibold text-[#1a1d23]">{equipo.nombre}</p>
          <p className="text-[#b0b1b3] text-sm mt-1">{equipo.codigo_activo} — {MESES_NOMBRE[programa.mes_planificado]} {programa.anio}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_PROGRAMA[programa.estado] || 'bg-gray-100 text-[#b0b1b3]'}`}>
              {programa.estado.replace('_', ' ')}
            </span>
          </div>

          {informeExistente && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e2e4e8]">
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_INFORME[informeExistente.estado_informe]}`}>
                {informeExistente.estado_informe}
              </span>
              {informeExistente.estado_informe === 'APROBADO' && (
                <div className="flex gap-2">
                  {[
                    { ruta: 'generar-excel', ext: 'xlsx', etiqueta: 'FORM-DHO-061' },
                    { ruta: 'generar-pdf', ext: 'pdf', etiqueta: 'PDF' },
                  ].map(({ ruta, ext, etiqueta }) => (
                    <button
                      key={ruta}
                      type="button"
                      className="text-xs bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white px-3 py-1.5 rounded-lg transition-colors"
                      onClick={async () => {
                        try {
                          const { data: blob } = await api.get(
                            `/api/preventivo/informes/${informeExistente.id}/${ruta}/`,
                            { responseType: 'blob' }
                          )
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${ruta === 'generar-excel' ? 'FORM-DHO-061_' : 'informe_'}${informeExistente.id.slice(0, 8)}.${ext}`
                          a.click()
                          URL.revokeObjectURL(url)
                        } catch {
                          setError(`No se pudo generar el ${etiqueta}.`)
                        }
                      }}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {esAdmin && informeExistente.estado_informe === 'APROBADO' && (
                  <button onClick={() => cambiarEstado('ENVIADO')} className="text-xs border border-[#e2e4e8] hover:border-[#e8a838] hover:text-[#e8a838] text-[#b0b1b3] px-3 py-1.5 rounded-lg transition-all">
                    Desaprobar
                  </button>
                )}
                {esAdmin && informeExistente.estado_informe === 'ENVIADO' && (
                  <>
                    <button onClick={() => setModalRechazo(true)} className="text-xs border border-[#e2e4e8] hover:border-[#e05252] hover:text-[#e05252] text-[#b0b1b3] px-3 py-1.5 rounded-lg transition-all">
                      Devolver
                    </button>
                    <button onClick={() => cambiarEstado('APROBADO')} className="text-xs bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white px-3 py-1.5 rounded-lg transition-colors">
                      Aprobar
                    </button>
                  </>
                )}
                {!esAdmin && informeExistente.estado_informe === 'BORRADOR' && (
                  <button onClick={() => cambiarEstado('ENVIADO')} className="text-xs bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white px-3 py-1.5 rounded-lg transition-colors">
                    Enviar a revisión
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Banner rechazo */}
        {informeExistente?.comentario_rechazo && informeExistente.estado_informe === 'BORRADOR' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#e05252] mb-2">Devuelto por administrador</p>
            <p className="text-[#1a1d23] text-sm">{informeExistente.comentario_rechazo}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Componentes del equipo */}
          {puedeEditar && (
            <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3] mb-4">Componentes del equipo</p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={nuevoComponente}
                  onChange={(e) => setNuevoComponente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarComponente())}
                  placeholder="Nombre del componente"
                  className="flex-1 border border-[#e2e4e8] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#5aa0d3] transition-colors"
                />
                <button type="button" onClick={agregarComponente} className="bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {equipo.componentes.map(c => (
                  <div key={c.id} className="flex items-center gap-2 border border-[#e2e4e8] rounded-lg px-3 py-1.5 text-sm bg-[#f5f6f8]">
                    <span className="text-[#1a1d23]">{c.nombre_componente}</span>
                    <button type="button" onClick={() => eliminarComponente(c.id)} className="text-[#b0b1b3] hover:text-[#e05252] transition-colors text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluación por componente */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3]">Evaluación de componentes</p>
              <p className="text-xs text-[#b0b1b3]">{Object.keys(evals).length} de {equipo.componentes.length} evaluados</p>
            </div>

            {equipo.componentes.map((c) => {
              const ev = evals[c.id]

              // ---- Componente NO evaluado ----
              if (!ev) {
                return (
                  <div key={c.id} className="bg-white border border-dashed border-[#e2e4e8] rounded-xl px-5 py-3 flex justify-between items-center">
                    <p className="text-sm text-[#b0b1b3]">{c.nombre_componente} <span className="text-xs">— no inspeccionado</span></p>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => setEvals(prev => ({ ...prev, [c.id]: evalNueva() }))}
                        className="text-xs border border-[#5aa0d3] text-[#5aa0d3] hover:bg-[#5aa0d3] hover:text-white px-3 py-1.5 rounded-lg transition-all"
                      >
                        Evaluar
                      </button>
                    )}
                  </div>
                )
              }

              const scoreFinal = ev.intervencion ? ev.score_final : ev.score_inicial
              const sinResolver = scoreFinal >= 4

              // ---- Componente evaluado ----
              return (
                <div key={c.id} className="bg-white border border-[#e2e4e8] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-[#1a1d23]">{c.nombre_componente}</p>
                    <div className="flex items-center gap-2">
                      {ev.derivado && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-[#e07a38] border border-orange-200">
                          Derivado a correctivo
                        </span>
                      )}
                      {puedeEditar && !ev.derivado && (
                        <button type="button" onClick={() => quitarEvaluacion(c.id)} className="text-xs text-[#b0b1b3] hover:text-[#e05252] transition-colors">
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estado encontrado */}
                  <div>
                    <p className="text-xs text-[#b0b1b3] mb-2">Estado encontrado</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={!puedeEditar}
                          onClick={() => setEval(c.id, { score_inicial: n, ...(ev.intervencion ? {} : {}) })}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            ev.score_inicial === n ? SCORE_LABEL[n].bg : 'border border-[#e2e4e8] text-[#b0b1b3] hover:border-[#5aa0d3]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#b0b1b3] mt-1">{SCORE_LABEL[ev.score_inicial]?.texto}</p>
                  </div>

                  {/* ¿Intervino? */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ev.intervencion}
                      disabled={!puedeEditar}
                      onChange={(e) => setEval(c.id, { intervencion: e.target.checked, score_final: ev.score_inicial })}
                      className="w-4 h-4 accent-[#5aa0d3]"
                    />
                    <span className="text-sm text-[#1a1d23]">Realicé una intervención en el momento</span>
                  </label>

                  {ev.intervencion && (
                    <>
                      <textarea
                        value={ev.detalle_intervencion}
                        disabled={!puedeEditar}
                        onChange={(e) => setEval(c.id, { detalle_intervencion: e.target.value })}
                        rows={2}
                        placeholder="¿Qué se hizo? (limpieza, ajuste, cambio de pieza...)"
                        className="w-full border border-[#e2e4e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5aa0d3] resize-none transition-colors"
                      />
                      <div>
                        <p className="text-xs text-[#b0b1b3] mb-2">Estado final (después de la intervención)</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              disabled={!puedeEditar}
                              onClick={() => setEval(c.id, { score_final: n })}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                ev.score_final === n ? SCORE_LABEL[n].bg : 'border border-[#e2e4e8] text-[#b0b1b3] hover:border-[#5aa0d3]'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-[#b0b1b3] mt-1">{SCORE_LABEL[ev.score_final]?.texto}</p>
                      </div>
                    </>
                  )}

                  <input
                    type="text"
                    placeholder="Observación técnica (opcional)"
                    value={ev.observacion}
                    disabled={!puedeEditar}
                    onChange={(e) => setEval(c.id, { observacion: e.target.value })}
                    className="w-full border border-[#e2e4e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5aa0d3] transition-colors"
                  />

                  {/* Sin resolver (final 4-5): tercero + derivación inmediata */}
                  {sinResolver && !ev.derivado && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#e07a38]">
                        Componente sin resolver ({SCORE_LABEL[scoreFinal]?.texto})
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ev.requiere_tercero}
                          onChange={(e) => setEval(c.id, { requiere_tercero: e.target.checked })}
                          className="w-4 h-4 accent-[#e07a38]"
                        />
                        <span className="text-sm text-[#1a1d23]">Requiere proveedor tercero</span>
                      </label>
                      {ev.id ? (
                        <button
                          type="button"
                          onClick={() => derivarComponente(c.id)}
                          disabled={derivando[c.id]}
                          className="w-full border border-[#e07a38] text-[#e07a38] hover:bg-[#e07a38] hover:text-white disabled:opacity-40 py-2 rounded-lg text-sm transition-all"
                        >
                          {derivando[c.id] ? 'Derivando...' : `Derivar a correctivo ahora (${ev.requiere_tercero ? 'tercero' : 'interno'})`}
                        </button>
                      ) : (
                        <p className="text-xs text-[#b0b1b3]">Guarda el informe para poder derivar este componente.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Hallazgos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3] mb-3">Hallazgos generales</p>
            <textarea
              value={hallazgos}
              onChange={(e) => setHallazgos(e.target.value)}
              rows={4}
              placeholder="Describe el estado general del equipo..."
              className="w-full bg-white border border-[#e2e4e8] rounded-xl px-4 py-3 text-sm text-[#1a1d23] focus:outline-none focus:border-[#5aa0d3] resize-none transition-colors"
            />
          </div>

          {/* Fotos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3] mb-4">Evidencias fotográficas</p>
            {['ANTES', 'DESPUES'].map((tipo) => (
              <div key={tipo} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#b0b1b3] text-xs">{tipo} — {fotosPreview[tipo].length}/{MAX_FOTOS}</p>
                  {fotosPreview[tipo].length < MAX_FOTOS && (
                    <label className="cursor-pointer text-xs text-[#5aa0d3] hover:text-[#4a8fc2] transition-colors border border-[#e2e4e8] hover:border-[#5aa0d3] px-3 py-1 rounded-lg bg-white">
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFoto(tipo, e.target.files)} />
                      Agregar
                    </label>
                  )}
                </div>
                {fotosPreview[tipo].length === 0 ? (
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFoto(tipo, e.target.files)} />
                    <div className="h-24 border border-dashed border-[#e2e4e8] rounded-xl flex items-center justify-center hover:border-[#5aa0d3] transition-colors bg-white">
                      <p className="text-[#b0b1b3] text-sm">Agregar fotos {tipo.toLowerCase()}</p>
                    </div>
                  </label>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotosPreview[tipo].map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`${tipo}-${i}`} className="w-full h-24 object-cover rounded-lg border border-[#e2e4e8]" />
                        <button type="button" onClick={() => eliminarFoto(tipo, i)} className="absolute top-1 right-1 bg-white/90 hover:bg-[#e05252] hover:text-white text-[#b0b1b3] rounded w-5 h-5 text-xs flex items-center justify-center border border-[#e2e4e8] transition-all">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-[#e05252] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={enviando || Object.keys(evals).length === 0}
            className="w-full bg-[#5aa0d3] hover:bg-[#4a8fc2] disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {enviando ? 'Guardando...' : Object.keys(evals).length === 0 ? 'Evalúa al menos un componente' : 'Guardar informe'}
          </button>

        </form>
      </main>
    </div>
  )
}
