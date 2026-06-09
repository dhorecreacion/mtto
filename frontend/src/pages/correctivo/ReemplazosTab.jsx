import { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function ReemplazosTab() {
  const [swaps, setSwaps] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)

  const cargar = () => {
    setCargando(true)
    api.get('/api/correctivo/swaps/')
      .then(({ data }) => setSwaps(data.results ?? data))
      .catch(() => setError('No se pudieron cargar los reemplazos'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setModal(true)} className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors">
          Nuevo reemplazo
        </button>
      </div>

      {cargando && <p className="text-[#b0b1b3] text-sm">Cargando...</p>}
      {error    && <p className="text-[#e05252] text-sm">{error}</p>}

      {!cargando && !error && swaps.length === 0 && (
        <div className="bg-white border border-[#c0c7d0] rounded-2xl p-8 text-center">
          <p className="text-[#b0b1b3] text-sm">No hay reemplazos registrados.</p>
        </div>
      )}

      <div className="space-y-2">
        {swaps.map((s) => (
          <div key={s.id} className="bg-white border border-[#e2e4e8] rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#e05252] line-through">{s.equipo_saliente_codigo}</span>
              <span className="text-[#b0b1b3]">→</span>
              <span className="text-[#4caf82] font-medium">{s.equipo_entrante_codigo}</span>
            </div>
            <p className="text-[#b0b1b3] text-xs mt-1">{s.seccion_nombre}</p>
            <p className="text-[#40484f] text-sm mt-1">{s.motivo_cambio}</p>
            <p className="text-[#b0b1b3] text-xs mt-1">{new Date(s.fecha_reemplazo).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      {modal && <NuevoSwapModal onClose={() => setModal(false)} onGuardado={() => { setModal(false); cargar() }} />}
    </div>
  )
}

function NuevoSwapModal({ onClose, onGuardado }) {
  const [secciones, setSecciones] = useState([])
  const [salientes, setSalientes] = useState([])
  const [entrantes, setEntrantes] = useState([])
  const [form, setForm] = useState({ seccion: '', equipo_saliente: '', equipo_entrante: '', motivo_cambio: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/activos/secciones/').then(({ data }) => setSecciones(data.results ?? data))
    // Equipos entrantes: REEMPLAZABLE en almacén (no dependen de sección)
    api.get('/api/activos/equipos/?categoria=REEMPLAZABLE&estado=EN_ALMACEN')
      .then(({ data }) => setEntrantes(data.results ?? data))
  }, [])

  // Al elegir sección, cargar equipos REEMPLAZABLE en uso de esa sección (candidatos a salir)
  useEffect(() => {
    if (!form.seccion) { setSalientes([]); return }
    api.get(`/api/activos/equipos/?categoria=REEMPLAZABLE&estado=EN_USO&seccion=${form.seccion}`)
      .then(({ data }) => setSalientes(data.results ?? data))
  }, [form.seccion])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      await api.post('/api/correctivo/swaps/', form)
      onGuardado()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Error al registrar el reemplazo.')
    } finally { setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white border border-[#c0c7d0] rounded-xl p-6 w-full max-w-md my-4">
        <p className="font-semibold text-[#191c1e] mb-1">Registrar reemplazo (Swap)</p>
        <p className="text-[#b0b1b3] text-sm mb-5">El equipo saliente se da de baja y el entrante queda en uso automáticamente.</p>

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Sección (cuarto)</span>
          <select value={form.seccion} onChange={e => setForm({ ...form, seccion: e.target.value, equipo_saliente: '' })} required
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
            <option value="">Seleccionar sección</option>
            {secciones.map(s => <option key={s.id} value={s.id}>{s.lugar_nombre} — {s.nombre}</option>)}
          </select>
        </label>

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Equipo saliente (en uso)</span>
          <select value={form.equipo_saliente} onChange={e => setForm({ ...form, equipo_saliente: e.target.value })} required disabled={!form.seccion}
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494] disabled:bg-[#f3f4f6]">
            <option value="">{form.seccion ? 'Seleccionar equipo' : 'Elige una sección primero'}</option>
            {salientes.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.codigo_activo})</option>)}
          </select>
          {form.seccion && salientes.length === 0 && (
            <p className="text-[#e8a838] text-xs mt-1">No hay equipos reemplazables en uso en esta sección.</p>
          )}
        </label>

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Equipo entrante (en almacén)</span>
          <select value={form.equipo_entrante} onChange={e => setForm({ ...form, equipo_entrante: e.target.value })} required
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
            <option value="">Seleccionar equipo</option>
            {entrantes.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.codigo_activo})</option>)}
          </select>
          {entrantes.length === 0 && (
            <p className="text-[#e8a838] text-xs mt-1">No hay equipos reemplazables en almacén.</p>
          )}
        </label>

        <label className="block mb-3">
          <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Motivo del cambio</span>
          <textarea value={form.motivo_cambio} onChange={e => setForm({ ...form, motivo_cambio: e.target.value })} required rows={2}
            placeholder="Ej: Resistencia quemada, cambio total"
            className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494] resize-none" />
        </label>

        {error && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-[#c0c7d0] hover:border-[#b0b1b3] text-[#191c1e] py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
          <button type="submit" disabled={enviando} className="flex-1 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {enviando ? 'Registrando...' : 'Registrar reemplazo'}
          </button>
        </div>
      </form>
    </div>
  )
}
