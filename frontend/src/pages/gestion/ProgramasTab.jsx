import { useEffect, useState } from 'react'
import api from '../../api/axios'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ProgramasTab() {
  const [programas, setProgramas] = useState([])
  const [equipos, setEquipos] = useState([])
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ equipo: '', anio: new Date().getFullYear(), mes_planificado: 1, estado: 'PLANIFICADO' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = () => api.get('/api/preventivo/programas/').then(({ data }) => setProgramas(data.results ?? data))

  useEffect(() => {
    cargar()
    // Solo equipos INDUSTRIAL pueden tener programa preventivo
    api.get('/api/activos/equipos/?categoria=INDUSTRIAL').then(({ data }) => setEquipos(data.results ?? data))
  }, [])

  const abrirNuevo = () => {
    setForm({ equipo: '', anio: new Date().getFullYear(), mes_planificado: 1, estado: 'PLANIFICADO' })
    setEditId(null); setError(''); setModal(true)
  }

  const abrirEditar = (p) => {
    setForm({ equipo: p.equipo, anio: p.anio, mes_planificado: p.mes_planificado, estado: p.estado })
    setEditId(p.id); setError(''); setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      if (editId) await api.patch(`/api/preventivo/programas/${editId}/`, form)
      else await api.post('/api/preventivo/programas/', form)
      setModal(false)
      cargar()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Error al guardar.')
    } finally { setEnviando(false) }
  }

  const eliminar = async (id) => {
    try { await api.delete(`/api/preventivo/programas/${id}/`); cargar() }
    catch { setError('No se pudo eliminar.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[#40484f] text-sm">{programas.length} programas registrados</p>
        <button onClick={abrirNuevo} className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors">
          Nuevo programa
        </button>
      </div>

      {error && !modal && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

      <div className="space-y-2">
        {programas.map(p => (
          <div key={p.id} className="bg-white border border-[#c0c7d0] rounded-xl px-5 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-[#191c1e] text-sm">{p.equipo_nombre}</p>
              <p className="text-[#b0b1b3] text-xs mt-0.5">{MESES[p.mes_planificado]} {p.anio} · {p.estado.replace('_', ' ')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirEditar(p)} className="text-xs border border-[#c0c7d0] hover:border-[#036494] hover:text-[#036494] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Editar</button>
              <button onClick={() => eliminar(p.id)} className="text-xs border border-[#c0c7d0] hover:border-[#ba1a1a] hover:text-[#ba1a1a] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Eliminar</button>
            </div>
          </div>
        ))}
        {programas.length === 0 && <p className="text-[#b0b1b3] text-sm text-center py-6">Sin programas registrados</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <form onSubmit={guardar} className="bg-white border border-[#c0c7d0] rounded-xl p-6 w-full max-w-md">
            <p className="font-semibold text-[#191c1e] mb-5">{editId ? 'Editar programa' : 'Nuevo programa de mantenimiento'}</p>

            <label className="block mb-3">
              <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Equipo (solo Industrial)</span>
              <select value={form.equipo} onChange={e => setForm({ ...form, equipo: e.target.value })} required
                className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
                <option value="">Seleccionar equipo</option>
                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.codigo_activo})</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Año</span>
                <input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })} required
                  className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]" />
              </label>
              <label className="block">
                <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Mes</span>
                <select value={form.mes_planificado} onChange={e => setForm({ ...form, mes_planificado: e.target.value })}
                  className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </label>
            </div>

            {editId && (
              <label className="block mt-3">
                <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">Estado</span>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#036494]">
                  <option value="PLANIFICADO">Planificado</option>
                  <option value="EJECUTADO">Ejecutado</option>
                  <option value="ATRASADO">Atrasado</option>
                  <option value="PENDIENTE_TERCERO">Pendiente de Tercero</option>
                </select>
              </label>
            )}

            {error && <p className="text-[#e05252] text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setModal(false)} className="flex-1 border border-[#c0c7d0] hover:border-[#b0b1b3] text-[#191c1e] py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
              <button type="submit" disabled={enviando} className="flex-1 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {enviando ? 'Guardando...' : 'Crear programa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
