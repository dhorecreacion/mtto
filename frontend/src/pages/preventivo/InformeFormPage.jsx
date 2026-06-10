import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import ProveedoresModal from '../../components/ProveedoresModal'

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
  PLANIFICADO:       'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  EJECUTADO:         'bg-green-50 text-[#4caf82] border border-green-200',
  ATRASADO:          'bg-red-50 text-[#e05252] border border-red-200',
  PENDIENTE_TERCERO: 'bg-yellow-50 text-[#e8a838] border border-yellow-200',
}

export default function InformeFormPage() {
  const { programaId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMIN'

  const [programa, setPrograma] = useState(null)
  const [equipo, setEquipo] = useState(null)
  const [informeExistente, setInformeExistente] = useState(null)
  const [scoresIds, setScoresIds] = useState({})
  const [scores, setScores] = useState({})
  const [observaciones, setObservaciones] = useState({})
  const [hallazgos, setHallazgos] = useState('')
  const [proveedores, setProveedores] = useState([])
  const [mostrarModalProveedores, setMostrarModalProveedores] = useState(false)
  const [errorTercero, setErrorTercero] = useState('')
  const [nuevoComponente, setNuevoComponente] = useState('')
  const [fotos, setFotos] = useState({ ANTES: [], DESPUES: [] })
  const [fotosPreview, setFotosPreview] = useState({ ANTES: [], DESPUES: [] })
  const [fotosGuardadasIds, setFotasGuardadasIds] = useState({ ANTES: [], DESPUES: [] })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [modalRechazo, setModalRechazo] = useState(false)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  // --- Asistente de voz ---
  const [grabando, setGrabando] = useState(false)
  const [procesandoVoz, setProcesandoVoz] = useState(false)
  const [resumenVoz, setResumenVoz] = useState(null)
  const [errorVoz, setErrorVoz] = useState('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const MAX_FOTOS = 5

  const handleFoto = (tipo, archivos) => {
    const lista = Array.from(archivos)
    const disponibles = MAX_FOTOS - fotosPreview[tipo].length
    const nuevas = lista.slice(0, disponibles)
    if (nuevas.length === 0) return
    setFotos(prev => ({ ...prev, [tipo]: [...prev[tipo], ...nuevas] }))
    setFotosPreview(prev => ({ ...prev, [tipo]: [...prev[tipo], ...nuevas.map(f => URL.createObjectURL(f))] }))
  }

  const agregarComponente = async () => {
    if (!nuevoComponente.trim()) return
    try {
      const { data } = await api.post(`/api/activos/equipos/${equipo.id}/componentes/`, { nombre_componente: nuevoComponente.trim() })
      setEquipo(prev => ({ ...prev, componentes: [...prev.componentes, data] }))
      setScores(prev => ({ ...prev, [data.id]: 1 }))
      setNuevoComponente('')
    } catch { setError('No se pudo agregar el componente.') }
  }

  const eliminarComponente = async (componenteId) => {
    try {
      await api.delete(`/api/activos/equipos/${equipo.id}/componentes/${componenteId}/`)
      setEquipo(prev => ({ ...prev, componentes: prev.componentes.filter(c => c.id !== componenteId) }))
      setScores(prev => { const s = { ...prev }; delete s[componenteId]; return s })
    } catch (e) { setError(e.response?.data?.error || 'No se pudo eliminar.') }
  }

  // --- Asistente de voz ---
  const iniciarGrabacion = async () => {
    setErrorVoz(''); setResumenVoz(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        enviarAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setGrabando(true)
    } catch {
      setErrorVoz('No se pudo acceder al micrófono. Verifica permisos (requiere HTTPS o localhost).')
    }
  }

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop()
      setGrabando(false)
      setProcesandoVoz(true)
    }
  }

  const enviarAudio = async (blob) => {
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'dictado.webm')
      const { data } = await api.post(`/api/preventivo/programas/${programaId}/asistente-voz/`, fd)
      await aplicarResultadoVoz(data)
    } catch (e) {
      setErrorVoz(e.response?.data?.error || 'No se pudo procesar el audio.')
    } finally {
      setProcesandoVoz(false)
    }
  }

  const aplicarResultadoVoz = async (data) => {
    const aplicados = []

    // Hallazgos generales
    if (data.hallazgos_generales) {
      setHallazgos(data.hallazgos_generales)
      aplicados.push('Hallazgos generales')
    }

    // Requiere tercero
    if (data.requiere_tercero) {
      setPrograma(prev => ({ ...prev, requiere_tercero: true }))
      try { await api.patch(`/api/preventivo/programas/${programaId}/`, { requiere_tercero: true }) } catch { /* noop */ }
      aplicados.push('Requiere tercero')
    }

    // Componentes y scores
    let compsActuales = [...equipo.componentes]
    for (const comp of (data.componentes || [])) {
      let existente = compsActuales.find(c => c.nombre_componente.toLowerCase() === comp.nombre.toLowerCase())
      // Crear el componente si no existe
      if (!existente) {
        try {
          const { data: nuevo } = await api.post(`/api/activos/equipos/${equipo.id}/componentes/`, { nombre_componente: comp.nombre })
          compsActuales.push(nuevo)
          existente = nuevo
        } catch { continue }
      }
      setScores(prev => ({ ...prev, [existente.id]: comp.score }))
      if (comp.observacion) setObservaciones(prev => ({ ...prev, [existente.id]: comp.observacion }))
      aplicados.push(`${existente.nombre_componente}: score ${comp.score}`)
    }
    setEquipo(prev => ({ ...prev, componentes: compsActuales }))

    setResumenVoz({ texto: data.texto, aplicados })
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

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: prog } = await api.get(`/api/preventivo/programas/${programaId}/`)
        setPrograma(prog)
        const { data: eq } = await api.get(`/api/activos/equipos/${prog.equipo}/`)
        setEquipo(eq)
        const iniciales = {}
        eq.componentes.forEach(c => { iniciales[c.id] = 1 })
        setScores(iniciales)
        if (usuario?.rol === 'ADMIN') {
          const { data: provs } = await api.get('/api/correctivo/proveedores/')
          setProveedores(provs.results ?? provs)
        }
        const { data: listaInformes } = await api.get(`/api/preventivo/informes/?programa=${programaId}`)
        const lista = listaInformes.results ?? listaInformes
        if (lista.length === 0) return
        const informe = lista[0]
        setInformeExistente(informe)
        if (informe.hallazgos_generales) setHallazgos(informe.hallazgos_generales)
        const sg = {}, og = {}, ig = {}
        informe.detalles_score.forEach(d => { sg[d.componente] = d.score_valor; og[d.componente] = d.observacion_tecnica || ''; ig[d.componente] = d.id })
        if (Object.keys(sg).length > 0) { setScores(sg); setObservaciones(og); setScoresIds(ig) }
        const evA = informe.evidencias.filter(e => e.tipo === 'ANTES')
        const evD = informe.evidencias.filter(e => e.tipo === 'DESPUES')
        setFotosPreview({ ANTES: evA.map(e => e.foto), DESPUES: evD.map(e => e.foto) })
        setFotasGuardadasIds({ ANTES: evA.map(e => e.id), DESPUES: evD.map(e => e.id) })
      } catch { setError('No se pudo cargar el programa') }
    }
    cargarDatos()
  }, [programaId])

  const cambiarEstado = async (nuevoEstado, comentario = '') => {
    if (!informeExistente) return
    try {
      const { data } = await api.post(`/api/preventivo/informes/${informeExistente.id}/cambiar-estado/`, { estado: nuevoEstado, comentario })
      setInformeExistente({ ...informeExistente, estado_informe: data.estado_informe, comentario_rechazo: data.comentario_rechazo })
      setModalRechazo(false)
      setComentarioRechazo('')
    } catch (e) {
      const data = e.response?.data
      if (data?.requiere_tercero) setErrorTercero(data.error)
      else setError(data?.error || 'Error al cambiar estado')
    }
  }

  const [derivando, setDerivando] = useState(false)
  const [derivadoMsg, setDerivadoMsg] = useState('')

  const derivarCorrectivo = async () => {
    if (!informeExistente) return
    setDerivando(true); setError('')
    try {
      await api.post(`/api/preventivo/informes/${informeExistente.id}/derivar-correctivo/`)
      setDerivadoMsg('Orden correctiva creada para los componentes en estado MALO.')
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo derivar a correctivo.')
    } finally { setDerivando(false) }
  }

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
      await Promise.all(Object.entries(scores).map(([cId, valor]) => {
        const sId = scoresIds[cId]
        const payload = { componente: cId, score_valor: valor, observacion_tecnica: observaciones[cId] || '' }
        return sId ? api.patch(`/api/preventivo/informes/${informeId}/scores/${sId}/`, payload) : api.post(`/api/preventivo/informes/${informeId}/scores/`, payload)
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

  if (mostrarModalProveedores) return (
    <ProveedoresModal onClose={() => setMostrarModalProveedores(false)} onProveedorCreado={(n) => { setProveedores(prev => [...prev, n]); setMostrarModalProveedores(false) }} />
  )

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
        <button onClick={() => navigate('/preventivo')} className="w-full bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
          Volver a la lista
        </button>
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
          <p className="text-[#b0b1b3] text-sm mt-1">{equipo.codigo_activo} — {programa.anio} / Mes {programa.mes_planificado}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_PROGRAMA[programa.estado] || 'bg-gray-100 text-[#b0b1b3]'}`}>
              {programa.estado.replace('_', ' ')}
            </span>
            {programa.proveedor_asignado && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#5aa0d3] border border-blue-200">
                {programa.proveedor_nombre}
              </span>
            )}
            {programa.estado === 'PENDIENTE_TERCERO' && !esAdmin && (
              <p className="w-full text-[#e8a838] text-xs mt-1">En espera de asignación de proveedor externo.</p>
            )}
          </div>

          {informeExistente && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e2e4e8]">
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_INFORME[informeExistente.estado_informe]}`}>
                {informeExistente.estado_informe}
              </span>
              {informeExistente.estado_informe === 'APROBADO' && (
                <button
                  type="button"
                  className="text-xs bg-[#5aa0d3] hover:bg-[#4a8fc2] text-white px-3 py-1.5 rounded-lg transition-colors"
                  onClick={async () => {
                    try {
                      const { data: blob } = await api.get(
                        `/api/preventivo/informes/${informeExistente.id}/generar-pdf/`,
                        { responseType: 'blob' }
                      )
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `informe_${informeExistente.id.slice(0, 8)}.pdf`
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch {
                      setError('No se pudo generar el PDF.')
                    }
                  }}
                >
                  Descargar PDF
                </button>
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

        {/* Derivación a correctivo — admin, informe aprobado */}
        {esAdmin && informeExistente?.estado_informe === 'APROBADO' && (() => {
          const score5 = informeExistente.detalles_score.filter(d => d.score_valor === 5)
          const score4 = informeExistente.detalles_score.filter(d => d.score_valor === 4)
          if (score5.length === 0 && score4.length === 0) return null
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#e07a38] mb-3">Derivación a Correctivo</p>

              {informeExistente.correctivo_auto_generado && (
                <p className="text-sm text-[#1a1d23] mb-3">
                  Se generó automáticamente una orden correctiva por componentes en falla (score 5).
                </p>
              )}

              {score5.length > 0 && !informeExistente.correctivo_auto_generado && (
                <p className="text-sm text-[#e05252] mb-3">
                  Componentes en falla (score 5): {score5.map(d => d.componente_nombre).join(', ')}
                </p>
              )}

              {score4.length > 0 && (
                <div>
                  <p className="text-sm text-[#1a1d23] mb-2">
                    Componentes en estado malo (score 4): {score4.map(d => d.componente_nombre).join(', ')}
                  </p>
                  {derivadoMsg ? (
                    <p className="text-sm text-[#4caf82]">{derivadoMsg}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={derivarCorrectivo}
                      disabled={derivando}
                      className="border border-[#e07a38] text-[#e07a38] hover:bg-[#e07a38] hover:text-white disabled:opacity-40 px-4 py-2 rounded-lg text-sm transition-all"
                    >
                      {derivando ? 'Derivando...' : 'Derivar a correctivo (score 4)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Proveedor tercero — admin */}
        {esAdmin && programa?.requiere_tercero && informeExistente?.estado_informe === 'ENVIADO' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5aa0d3] mb-3">Proveedor Tercero Requerido</p>
            <p className="text-[#1a1d23] text-sm mb-3">{programa.proveedor_asignado ? programa.proveedor_nombre : 'Sin proveedor asignado.'}</p>
            {errorTercero && <p className="text-[#e05252] text-sm mb-3">{errorTercero}</p>}
            <div className="flex gap-2 flex-wrap">
              <select
                defaultValue={programa.proveedor_asignado || ''}
                onChange={async (e) => {
                  const id = e.target.value || null
                  try {
                    await api.patch(`/api/preventivo/programas/${programaId}/`, { proveedor_asignado: id })
                    setPrograma(prev => ({ ...prev, proveedor_asignado: id }))
                    setErrorTercero('')
                  } catch { setError('No se pudo asignar.') }
                }}
                className="flex-1 bg-white border border-[#e2e4e8] text-[#1a1d23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5aa0d3]"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social} — {p.especialidad}</option>)}
              </select>
              <button type="button" onClick={() => setMostrarModalProveedores(true)} className="border border-[#e2e4e8] hover:border-[#5aa0d3] text-[#1a1d23] px-3 py-2 rounded-lg text-sm transition-all bg-white">
                Nuevo proveedor
              </button>
              {!programa.proveedor_asignado && (
                <button type="button" onClick={async () => {
                  try { await api.patch(`/api/preventivo/programas/${programaId}/`, { estado: 'PENDIENTE_TERCERO' }); setPrograma(prev => ({ ...prev, estado: 'PENDIENTE_TERCERO' })) }
                  catch { setError('No se pudo actualizar.') }
                }} className="border border-yellow-300 text-[#e8a838] hover:bg-yellow-50 px-3 py-2 rounded-lg text-sm transition-all bg-white">
                  Standby
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner rechazo */}
        {informeExistente?.comentario_rechazo && informeExistente.estado_informe === 'BORRADOR' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#e05252] mb-2">Devuelto por administrador</p>
            <p className="text-[#1a1d23] text-sm">{informeExistente.comentario_rechazo}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Asistente de voz */}
          {(!informeExistente || informeExistente.estado_informe === 'BORRADOR') && (
            <div className="bg-[#5aa0d3]/10 border border-[#5aa0d3]/40 rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#036494]">Asistente de voz</p>
                  <p className="text-[#40484f] text-xs mt-0.5">
                    Dicta los componentes, scores, hallazgos o si requiere tercero. Revisa el resultado antes de guardar.
                  </p>
                </div>
                {!grabando ? (
                  <button
                    type="button"
                    onClick={iniciarGrabacion}
                    disabled={procesandoVoz}
                    className="shrink-0 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    title="Grabar"
                  >
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={detenerGrabacion}
                    className="shrink-0 bg-[#ba1a1a] hover:bg-[#93000a] text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors animate-pulse"
                    title="Detener"
                  >
                    <span className="material-symbols-outlined">stop</span>
                  </button>
                )}
              </div>

              {procesandoVoz && <p className="text-[#036494] text-sm mt-3">Transcribiendo y analizando...</p>}
              {errorVoz && <p className="text-[#e05252] text-sm mt-3">{errorVoz}</p>}

              {resumenVoz && (
                <div className="mt-3 bg-white border border-[#c0c7d0] rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wider text-[#b0b1b3] mb-1">Lo que entendí</p>
                  <p className="text-[#40484f] text-xs italic mb-2">"{resumenVoz.texto}"</p>
                  {resumenVoz.aplicados.length > 0 ? (
                    <ul className="text-sm text-[#191c1e] list-disc list-inside">
                      {resumenVoz.aplicados.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  ) : (
                    <p className="text-[#e8a838] text-sm">No se pudo extraer datos. Revisa o intenta de nuevo.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Componentes */}
          {(!informeExistente || informeExistente.estado_informe === 'BORRADOR') && (
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

          {/* Scores */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3]">Evaluación de componentes</p>
            {equipo.componentes.map((c) => (
              <div key={c.id} className="bg-white border border-[#e2e4e8] rounded-xl p-5">
                <p className="text-sm font-medium text-[#1a1d23] mb-4">{c.nombre_componente}</p>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores({ ...scores, [c.id]: n })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        scores[c.id] === n ? SCORE_LABEL[n].bg : 'border border-[#e2e4e8] text-[#b0b1b3] hover:border-[#5aa0d3] hover:text-[#5aa0d3]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#b0b1b3] mb-3">{SCORE_LABEL[scores[c.id]]?.texto}</p>
                <input
                  type="text"
                  placeholder="Observación técnica (opcional)"
                  value={observaciones[c.id] || ''}
                  onChange={(e) => setObservaciones({ ...observaciones, [c.id]: e.target.value })}
                  className="w-full border border-[#e2e4e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5aa0d3] transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Requiere tercero */}
          <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={programa?.requiere_tercero || false}
                onChange={async (e) => {
                  const checked = e.target.checked
                  setPrograma(prev => ({ ...prev, requiere_tercero: checked }))
                  try { await api.patch(`/api/preventivo/programas/${programaId}/`, { requiere_tercero: checked }) }
                  catch { setPrograma(prev => ({ ...prev, requiere_tercero: !checked })); setError('No se pudo actualizar.') }
                }}
                className="w-4 h-4 accent-[#5aa0d3]"
              />
              <div>
                <p className="text-sm font-medium text-[#1a1d23]">Requiere intervención de tercero</p>
                <p className="text-[#b0b1b3] text-xs mt-0.5">El equipo necesita un proveedor externo</p>
              </div>
            </label>
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
            disabled={enviando}
            className="w-full bg-[#5aa0d3] hover:bg-[#4a8fc2] disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {enviando ? 'Guardando...' : 'Guardar informe'}
          </button>

        </form>
      </main>
    </div>
  )
}
