import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import ProveedoresModal from '../../components/ProveedoresModal'
import ReemplazosTab from './ReemplazosTab'

const ESTADO_ESTILO = {
  PENDIENTE:          'bg-yellow-50 text-[#e8a838] border border-yellow-200',
  EN_PROCESO:         'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  ESPERANDO_REPUESTO: 'bg-orange-50 text-orange-500 border border-orange-200',
  ESPERANDO_TERCERO:  'bg-purple-50 text-purple-500 border border-purple-200',
  COMPLETADO:         'bg-green-50 text-[#4caf82] border border-green-200',
  CANCELADO:          'bg-gray-100 text-[#b0b1b3] border border-gray-200',
}

export default function CorrectivoPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarProveedores, setMostrarProveedores] = useState(false)
  const [ordenSel, setOrdenSel] = useState(null)
  const [tab, setTab] = useState('ordenes')

  const cargarOrdenes = () => {
    setCargando(true)
    api.get('/api/correctivo/ordenes/')
      .then(({ data }) => setOrdenes(data.results ?? data))
      .catch(() => setError('No se pudieron cargar las órdenes'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarOrdenes() }, [])

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#191c1e]">Mantenimiento Correctivo</h1>
          <p className="text-[#40484f] text-sm mt-1">Órdenes de trabajo, incidentes y reemplazos</p>
        </div>
        {tab === 'ordenes' && (
          <div className="flex gap-2 shrink-0">
            {esAdmin && (
              <button onClick={() => setMostrarProveedores(true)} className="border border-[#c0c7d0] hover:border-[#036494] text-[#40484f] hover:text-[#036494] px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all bg-white">
                Proveedores
              </button>
            )}
            <button onClick={() => setMostrarForm(true)} className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors">
              Nueva orden
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#c0c7d0] mb-6">
        {[['ordenes', 'Órdenes'], ['reemplazos', 'Reemplazos']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px ${
              tab === id ? 'border-[#036494] text-[#036494]' : 'border-transparent text-[#40484f] hover:text-[#036494]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'reemplazos' ? <ReemplazosTab /> : (
        <>
          {cargando && <p className="text-[#b0b1b3] text-sm">Cargando...</p>}
          {error    && <p className="text-[#e05252] text-sm">{error}</p>}

          {!cargando && !error && ordenes.length === 0 && (
            <div className="bg-white border border-[#c0c7d0] rounded-2xl p-8 text-center">
              <p className="text-[#b0b1b3] text-sm">No hay órdenes correctivas registradas.</p>
            </div>
          )}

          <div className="space-y-2">
            {ordenes.map((o) => (
              <div key={o.id} onClick={() => setOrdenSel(o)} className="bg-white border border-[#e2e4e8] hover:border-[#5aa0d3] hover:shadow-sm rounded-xl px-5 py-4 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-[#1a1d23] text-sm">{o.equipo_nombre}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_ESTILO[o.estado] || 'bg-gray-100 text-[#b0b1b3]'}`}>
                    {o.estado.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[#b0b1b3] text-sm">{o.descripcion_falla}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-[#b0b1b3]">{o.tipo_ejecucion === 'TERCERO' ? 'Externo' : 'Interno'}</span>
                  {o.costo_total > 0 && <span className="text-xs text-[#b0b1b3]">S/ {o.costo_total}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mostrarForm && <NuevaOrdenModal onClose={() => setMostrarForm(false)} onGuardado={() => { setMostrarForm(false); cargarOrdenes() }} />}
      {mostrarProveedores && esAdmin && <ProveedoresModal onClose={() => setMostrarProveedores(false)} />}
      {ordenSel && (
        <DetalleOrdenModal
          orden={ordenSel}
          esAdmin={esAdmin}
          onClose={() => setOrdenSel(null)}
          onGuardado={() => { setOrdenSel(null); cargarOrdenes() }}
        />
      )}
    </div>
  )
}

const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'ESPERANDO_TERCERO', 'COMPLETADO', 'CANCELADO']

function DetalleOrdenModal({ orden, esAdmin, onClose, onGuardado }) {
  const [tecnicos, setTecnicos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState({
    estado: orden.estado,
    tipo_ejecucion: orden.tipo_ejecucion,
    tecnico_interno: orden.tecnico_interno || '',
    proveedor: orden.proveedor || '',
    diagnostico_tecnico: orden.diagnostico_tecnico || '',
    repuestos_utilizados: orden.repuestos_utilizados || '',
    costo_total: orden.costo_total || '0.00',
    fecha_resolucion: orden.fecha_resolucion ? orden.fecha_resolucion.slice(0, 10) : '',
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (esAdmin) api.get('/api/accounts/usuarios/').then(({ data }) => setTecnicos(data.results ?? data)).catch(() => {})
    api.get('/api/correctivo/proveedores/').then(({ data }) => setProveedores(data.results ?? data))
  }, [esAdmin])

  const guardar = async (e) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      const payload = { ...form }
      payload.tecnico_interno = payload.tecnico_interno || null
      payload.proveedor = payload.proveedor || null
      payload.fecha_resolucion = payload.fecha_resolucion || null
      await api.patch(`/api/correctivo/ordenes/${orden.id}/`, payload)
      onGuardado()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Error al guardar.')
    } finally { setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
      <form onSubmit={guardar} className="bg-white border border-[#c0c7d0] rounded-xl p-6 w-full max-w-md my-4">
        <p className="font-semibold text-[#191c1e]">{orden.equipo_nombre}</p>
        <p className="text-[#b0b1b3] text-sm mb-5">{orden.descripcion_falla}</p>

        {/* Tipo de ejecución — admin puede cambiar interno/tercero */}
        {esAdmin && (
          <label className="block mb-3">
            <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Tipo de ejecución</span>
            <div className="grid grid-cols-2 gap-2">
              {[['INTERNO', 'Personal Interno'], ['TERCERO', 'Proveedor Externo']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    tipo_ejecucion: val,
                    // limpia la asignación y el estado contradictorio al cambiar de tipo
                    tecnico_interno: val === 'TERCERO' ? '' : form.tecnico_interno,
                    proveedor: val === 'INTERNO' ? '' : form.proveedor,
                    estado: (val !== 'TERCERO' && form.estado === 'ESPERANDO_TERCERO') ? 'PENDIENTE' : form.estado,
                  })}
                  className={`py-2 rounded-lg text-sm transition-all ${
                    form.tipo_ejecucion === val ? 'bg-[#036494] text-white' : 'border border-[#c0c7d0] text-[#40484f] hover:border-[#036494]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
        )}

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Estado</span>
          <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
            {ESTADOS.filter(s => s !== 'ESPERANDO_TERCERO' || form.tipo_ejecucion === 'TERCERO')
              .map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </label>

        {form.tipo_ejecucion === 'INTERNO' && esAdmin && (
          <label className="block mb-3">
            <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Técnico asignado</span>
            <select value={form.tecnico_interno} onChange={e => setForm({ ...form, tecnico_interno: e.target.value })}
              className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
              <option value="">Sin asignar</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.first_name || t.username} {t.last_name}</option>)}
            </select>
          </label>
        )}

        {form.tipo_ejecucion === 'TERCERO' && (
          <label className="block mb-3">
            <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Proveedor</span>
            <select value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}
              className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
              <option value="">Sin asignar</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </label>
        )}

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Diagnóstico técnico</span>
          <textarea value={form.diagnostico_tecnico} onChange={e => setForm({ ...form, diagnostico_tecnico: e.target.value })} rows={2}
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494] resize-none" />
        </label>

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Repuestos utilizados</span>
          <textarea value={form.repuestos_utilizados} onChange={e => setForm({ ...form, repuestos_utilizados: e.target.value })} rows={2}
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494] resize-none" />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Costo total (S/)</span>
            <input type="number" step="0.01" value={form.costo_total} onChange={e => setForm({ ...form, costo_total: e.target.value })}
              className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]" />
          </label>
          <label className="block">
            <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Fecha resolución</span>
            <input type="date" value={form.fecha_resolucion} onChange={e => setForm({ ...form, fecha_resolucion: e.target.value })}
              className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]" />
          </label>
        </div>

        {error && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-[#c0c7d0] hover:border-[#b0b1b3] text-[#191c1e] py-2.5 rounded-lg text-sm transition-colors">Cerrar</button>
          <button type="submit" disabled={enviando} className="flex-1 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function NuevaOrdenModal({ onClose, onGuardado }) {
  const [equipos, setEquipos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState({ equipo: '', descripcion_falla: '', tipo_ejecucion: 'INTERNO', proveedor: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/activos/equipos/').then(({ data }) => setEquipos(data.results ?? data))
    api.get('/api/correctivo/proveedores/').then(({ data }) => setProveedores(data.results ?? data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const payload = { ...form }
      if (payload.tipo_ejecucion === 'INTERNO') delete payload.proveedor
      await api.post('/api/correctivo/ordenes/', payload)
      onGuardado()
    } catch { setError('Error al crear la orden.') } finally { setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
      <div className="bg-white border border-[#e2e4e8] rounded-xl shadow-lg p-6 w-full max-w-md my-4">
        <p className="font-semibold text-[#1a1d23] mb-5">Nueva Orden Correctiva</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#b0b1b3] text-xs uppercase tracking-wider font-medium mb-2 block">Equipo</label>
            <select value={form.equipo} onChange={(e) => setForm({ ...form, equipo: e.target.value })} required
              className="w-full border border-[#e2e4e8] rounded-lg px-4 py-2.5 text-sm text-[#1a1d23] focus:outline-none focus:border-[#5aa0d3] transition-colors">
              <option value="">Seleccionar equipo</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.codigo_activo})</option>)}
            </select>
          </div>

          <div>
            <label className="text-[#b0b1b3] text-xs uppercase tracking-wider font-medium mb-2 block">Descripción de la falla</label>
            <textarea value={form.descripcion_falla} onChange={(e) => setForm({ ...form, descripcion_falla: e.target.value })} required rows={3}
              placeholder="Describe la falla..."
              className="w-full border border-[#e2e4e8] rounded-lg px-4 py-2.5 text-sm text-[#1a1d23] focus:outline-none focus:border-[#5aa0d3] resize-none transition-colors" />
          </div>

          <div>
            <label className="text-[#b0b1b3] text-xs uppercase tracking-wider font-medium mb-2 block">Tipo de ejecución</label>
            <div className="grid grid-cols-2 gap-2">
              {[['INTERNO', 'Personal Interno'], ['TERCERO', 'Proveedor Externo']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm({ ...form, tipo_ejecucion: val, proveedor: '' })}
                  className={`py-2.5 rounded-lg text-sm transition-all ${form.tipo_ejecucion === val ? 'bg-[#5aa0d3] text-white' : 'border border-[#e2e4e8] text-[#b0b1b3] hover:border-[#5aa0d3] hover:text-[#5aa0d3]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.tipo_ejecucion === 'TERCERO' && (
            <div>
              <label className="text-[#b0b1b3] text-xs uppercase tracking-wider font-medium mb-2 block">Proveedor</label>
              {proveedores.length === 0 ? (
                <p className="text-[#b0b1b3] text-sm border border-[#e2e4e8] rounded-lg px-4 py-3">Sin proveedores registrados.</p>
              ) : (
                <select value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} required
                  className="w-full border border-[#e2e4e8] rounded-lg px-4 py-2.5 text-sm text-[#1a1d23] focus:outline-none focus:border-[#5aa0d3] transition-colors">
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social} — {p.especialidad}</option>)}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-[#e05252] text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#e2e4e8] hover:border-[#b0b1b3] text-[#1a1d23] py-2.5 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="flex-1 bg-[#5aa0d3] hover:bg-[#4a8fc2] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {enviando ? 'Guardando...' : 'Crear orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
