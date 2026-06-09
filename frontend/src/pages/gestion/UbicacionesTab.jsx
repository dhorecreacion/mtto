import { useEffect, useState } from 'react'
import api from '../../api/axios'

function Columna({ titulo, items, selId, onSel, nuevo, setNuevo, onAgregar, onEliminar, disabled, placeholder }) {
  return (
    <div className="bg-white border border-[#c0c7d0] rounded-2xl p-4 flex flex-col">
      <p className="text-xs font-semibold tracking-wider uppercase text-[#40484f] mb-3">{titulo}</p>
      {!disabled && (
        <div className="flex gap-2 mb-3">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAgregar() } }}
            placeholder={placeholder}
            className="flex-1 border border-[#c0c7d0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#036494]"
          />
          <button type="button" onClick={onAgregar} className="bg-[#036494] hover:bg-[#004b71] text-white px-3 py-1.5 rounded-lg text-sm transition-colors">+</button>
        </div>
      )}
      <div className="space-y-1 overflow-y-auto max-h-72">
        {disabled && <p className="text-[#b0b1b3] text-xs">Selecciona un elemento de la columna anterior</p>}
        {!disabled && items.length === 0 && <p className="text-[#b0b1b3] text-xs">Sin registros</p>}
        {items.map(it => (
          <div
            key={it.id}
            onClick={() => onSel && onSel(it.id)}
            className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-colors ${onSel ? 'cursor-pointer' : ''} ${
              selId === it.id ? 'bg-[#036494]/10 text-[#036494]' : 'hover:bg-[#f3f4f6] text-[#191c1e]'
            }`}
          >
            <span>{it.nombre}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onEliminar(it.id) }} className="text-[#b0b1b3] hover:text-[#ba1a1a]">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UbicacionesTab() {
  const [zonas, setZonas] = useState([])
  const [lugares, setLugares] = useState([])
  const [secciones, setSecciones] = useState([])

  const [zonaSel, setZonaSel] = useState(null)
  const [lugarSel, setLugarSel] = useState(null)

  const [nuevaZona, setNuevaZona] = useState('')
  const [nuevoLugar, setNuevoLugar] = useState('')
  const [nuevaSeccion, setNuevaSeccion] = useState('')
  const [error, setError] = useState('')

  const cargarZonas = () => api.get('/api/activos/zonas/').then(({ data }) => setZonas(data.results ?? data))
  const cargarLugares = (zonaId) => api.get(`/api/activos/lugares/?zona=${zonaId}`).then(({ data }) => setLugares(data.results ?? data))
  const cargarSecciones = (lugarId) => api.get(`/api/activos/secciones/?lugar=${lugarId}`).then(({ data }) => setSecciones(data.results ?? data))

  useEffect(() => { cargarZonas() }, [])

  useEffect(() => {
    if (!zonaSel) { setLugares([]); setLugarSel(null); setSecciones([]); return }
    cargarLugares(zonaSel)
    setLugarSel(null)
    setSecciones([])
  }, [zonaSel])

  useEffect(() => {
    if (!lugarSel) { setSecciones([]); return }
    cargarSecciones(lugarSel)
  }, [lugarSel])

  const agregarZona = async () => {
    if (!nuevaZona.trim()) return
    try { await api.post('/api/activos/zonas/', { nombre: nuevaZona.trim() }); setNuevaZona(''); cargarZonas() }
    catch { setError('No se pudo crear la zona (¿nombre duplicado?).') }
  }

  const agregarLugar = async () => {
    if (!nuevoLugar.trim() || !zonaSel) return
    try { await api.post('/api/activos/lugares/', { nombre: nuevoLugar.trim(), zona: zonaSel }); setNuevoLugar(''); cargarLugares(zonaSel) }
    catch { setError('No se pudo crear el lugar.') }
  }

  const agregarSeccion = async () => {
    if (!nuevaSeccion.trim() || !lugarSel) return
    try { await api.post('/api/activos/secciones/', { nombre: nuevaSeccion.trim(), lugar: lugarSel }); setNuevaSeccion(''); cargarSecciones(lugarSel) }
    catch { setError('No se pudo crear la sección.') }
  }

  const eliminar = async (tipo, id, recargar) => {
    try { await api.delete(`/api/activos/${tipo}/${id}/`); recargar() }
    catch { setError('No se pudo eliminar (puede tener registros asociados).') }
  }

  return (
    <div>
      {error && <p className="text-[#e05252] text-sm mb-3">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Columna
          titulo="Zonas" items={zonas} selId={zonaSel} onSel={setZonaSel}
          nuevo={nuevaZona} setNuevo={setNuevaZona} onAgregar={agregarZona}
          onEliminar={(id) => eliminar('zonas', id, cargarZonas)}
          placeholder="Nueva zona"
        />
        <Columna
          titulo="Lugares" items={lugares} selId={lugarSel} onSel={setLugarSel}
          nuevo={nuevoLugar} setNuevo={setNuevoLugar} onAgregar={agregarLugar}
          onEliminar={(id) => eliminar('lugares', id, () => cargarLugares(zonaSel))}
          disabled={!zonaSel}
          placeholder="Nuevo lugar"
        />
        <Columna
          titulo="Secciones" items={secciones} onSel={null}
          nuevo={nuevaSeccion} setNuevo={setNuevaSeccion} onAgregar={agregarSeccion}
          onEliminar={(id) => eliminar('secciones', id, () => cargarSecciones(lugarSel))}
          disabled={!lugarSel}
          placeholder="Nueva sección"
        />
      </div>
    </div>
  )
}
