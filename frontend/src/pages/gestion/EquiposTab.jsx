import { useEffect, useState } from 'react'
import api from '../../api/axios'

const CONDICION = [['BUENA', 'Buena'], ['INTERMEDIA', 'Intermedia'], ['MALA', 'Mala']]
const CRITICIDAD = [['ALTA', 'Alta'], ['MEDIA', 'Media'], ['BAJA', 'Baja']]
const CATEGORIA = [['INDUSTRIAL', 'Industrial (Predictivo)'], ['REEMPLAZABLE', 'Reemplazable (Swaps)']]
const ESTADO = [['EN_USO', 'En Uso'], ['EN_ALMACEN', 'En Almacén'], ['DADO_DE_BAJA', 'Dado de Baja']]
const FRECUENCIA = [['', 'Sin frecuencia'], ['MENSUAL', 'Mensual'], ['BIMENSUAL', 'Bimensual'], ['TRIMESTRAL', 'Trimestral']]

const ESTADO_OP_ESTILO = {
  EN_USO:       'bg-green-50 text-[#4caf82] border border-green-200',
  EN_ALMACEN:   'bg-blue-50 text-[#5aa0d3] border border-blue-200',
  DADO_DE_BAJA: 'bg-red-50 text-[#e05252] border border-red-200',
}

const FORM_VACIO = {
  codigo_activo: '', nombre: '', serie: '', marca: '', modelo: '',
  seccion: '', condicion: 'BUENA', criticidad: 'MEDIA',
  categoria_mantenimiento: 'INDUSTRIAL', estado_operativo: 'EN_USO', frecuencia: '',
  observaciones: '',
}

export default function EquiposTab() {
  const [equipos, setEquipos] = useState([])
  const [secciones, setSecciones] = useState([])
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const cargar = (estado = filtroEstado) => {
    const url = estado ? `/api/activos/equipos/?estado=${estado}` : '/api/activos/equipos/'
    api.get(url).then(({ data }) => setEquipos(data.results ?? data))
  }

  useEffect(() => {
    cargar()
    api.get('/api/activos/secciones/').then(({ data }) => setSecciones(data.results ?? data))
  }, [])

  const abrirNuevo = () => { setForm(FORM_VACIO); setEditId(null); setError(''); setModal(true) }

  const abrirEditar = (eq) => {
    setForm({
      codigo_activo: eq.codigo_activo, nombre: eq.nombre, serie: eq.serie || '',
      marca: eq.marca || '', modelo: eq.modelo || '', seccion: eq.seccion || '',
      condicion: eq.condicion, criticidad: eq.criticidad,
      categoria_mantenimiento: eq.categoria_mantenimiento, estado_operativo: eq.estado_operativo,
      frecuencia: eq.frecuencia || '', observaciones: eq.observaciones || '',
    })
    setEditId(eq.id); setError(''); setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      const payload = { ...form }
      if (!payload.seccion) payload.seccion = null
      if (!payload.frecuencia) payload.frecuencia = null
      if (editId) await api.patch(`/api/activos/equipos/${editId}/`, payload)
      else await api.post('/api/activos/equipos/', payload)
      setModal(false); cargar()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Error al guardar.')
    } finally { setEnviando(false) }
  }

  const eliminar = async (id) => {
    try { await api.delete(`/api/activos/equipos/${id}/`); cargar() }
    catch { setError('No se pudo eliminar.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); cargar(e.target.value) }}
            className="border border-[#c0c7d0] rounded-lg px-3 py-2 text-sm text-[#191c1e] focus:outline-none focus:border-[#036494] bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="EN_USO">En Uso</option>
            <option value="EN_ALMACEN">En Almacén</option>
            <option value="DADO_DE_BAJA">Dado de Baja</option>
          </select>
          <p className="text-[#40484f] text-sm">{equipos.length} equipos</p>
        </div>
        <button onClick={abrirNuevo} className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors shrink-0">
          Nuevo equipo
        </button>
      </div>

      {error && !modal && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

      <div className="space-y-2">
        {equipos.map(eq => (
          <div key={eq.id} className="bg-white border border-[#c0c7d0] rounded-xl px-5 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-[#191c1e] text-sm">{eq.nombre}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#b0b1b3] text-xs">{eq.codigo_activo} · {eq.categoria_mantenimiento}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_OP_ESTILO[eq.estado_operativo] || 'bg-gray-100 text-[#b0b1b3]'}`}>
                  {eq.estado_operativo.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirEditar(eq)} className="text-xs border border-[#c0c7d0] hover:border-[#036494] hover:text-[#036494] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Editar</button>
              <button onClick={() => eliminar(eq.id)} className="text-xs border border-[#c0c7d0] hover:border-[#ba1a1a] hover:text-[#ba1a1a] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Eliminar</button>
            </div>
          </div>
        ))}
        {equipos.length === 0 && <p className="text-[#b0b1b3] text-sm text-center py-6">Sin equipos en este filtro</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <form onSubmit={guardar} className="bg-white border border-[#c0c7d0] rounded-xl p-6 w-full max-w-lg my-4">
            <p className="font-semibold text-[#191c1e] mb-5">{editId ? 'Editar equipo' : 'Nuevo equipo'}</p>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Código de activo *">
                <input value={form.codigo_activo} onChange={e => setForm({ ...form, codigo_activo: e.target.value })} required className="input" />
              </Campo>
              <Campo label="Nombre *">
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="input" />
              </Campo>
              <Campo label="Serie"><input value={form.serie} onChange={e => setForm({ ...form, serie: e.target.value })} className="input" /></Campo>
              <Campo label="Marca"><input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="input" /></Campo>
              <Campo label="Modelo"><input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className="input" /></Campo>
              <Campo label="Sección">
                <select value={form.seccion} onChange={e => setForm({ ...form, seccion: e.target.value })} className="input">
                  <option value="">Sin asignar</option>
                  {secciones.map(s => <option key={s.id} value={s.id}>{s.lugar_nombre} — {s.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Condición"><Select v={form.condicion} set={v => setForm({ ...form, condicion: v })} opts={CONDICION} /></Campo>
              <Campo label="Criticidad"><Select v={form.criticidad} set={v => setForm({ ...form, criticidad: v })} opts={CRITICIDAD} /></Campo>
              <Campo label="Categoría"><Select v={form.categoria_mantenimiento} set={v => setForm({ ...form, categoria_mantenimiento: v })} opts={CATEGORIA} /></Campo>
              <Campo label="Estado operativo"><Select v={form.estado_operativo} set={v => setForm({ ...form, estado_operativo: v })} opts={ESTADO} /></Campo>
              <Campo label="Frecuencia"><Select v={form.frecuencia} set={v => setForm({ ...form, frecuencia: v })} opts={FRECUENCIA} /></Campo>
            </div>

            <div className="mt-3">
              <Campo label="Observaciones">
                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="input resize-none" />
              </Campo>
            </div>

            {error && <p className="text-[#e05252] text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setModal(false)} className="flex-1 border border-[#c0c7d0] hover:border-[#b0b1b3] text-[#191c1e] py-2.5 rounded-lg text-sm transition-colors">Cancelar</button>
              <button type="submit" disabled={enviando} className="flex-1 bg-[#036494] hover:bg-[#004b71] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {enviando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .input { width:100%; border:1px solid #c0c7d0; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; color:#191c1e; outline:none; background:white; }
        .input:focus { border-color:#036494; }
      `}</style>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="text-[#40484f] text-xs uppercase tracking-wider block mb-1">{label}</span>
      {children}
    </label>
  )
}

function Select({ v, set, opts }) {
  return (
    <select value={v} onChange={e => set(e.target.value)} className="input">
      {opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
    </select>
  )
}
