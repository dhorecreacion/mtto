import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function ProveedoresModal({ onClose, onProveedorCreado }) {
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState({ razon_social: '', ruc: '', especialidad: '', telefono: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => api.get('/api/correctivo/proveedores/').then(({ data }) => setProveedores(data.results ?? data))
  useEffect(() => { cargar() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const { data } = await api.post('/api/correctivo/proveedores/', form)
      setForm({ razon_social: '', ruc: '', especialidad: '', telefono: '' })
      cargar()
      if (onProveedorCreado) onProveedorCreado(data)
    } catch { setError('Error al guardar el proveedor.') } finally { setGuardando(false) }
  }

  const eliminar = async (id) => {
    try { await api.delete(`/api/correctivo/proveedores/${id}/`); cargar() }
    catch { setError('No se pudo eliminar.') }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
      <div className="bg-white border border-[#e2e4e8] rounded-xl shadow-lg p-6 w-full max-w-lg my-4">
        <div className="flex justify-between items-center mb-5">
          <p className="font-semibold text-[#1a1d23]">Proveedores Terceros</p>
          <button onClick={onClose} className="text-[#b0b1b3] hover:text-[#1a1d23] text-sm transition-colors">Cerrar</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            {[['razon_social', 'Razón social'], ['ruc', 'RUC'], ['especialidad', 'Especialidad'], ['telefono', 'Teléfono']].map(([key, ph]) => (
              <input key={key} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                required={key !== 'telefono'} placeholder={ph}
                className="border border-[#e2e4e8] rounded-lg px-3 py-2 text-sm text-[#1a1d23] focus:outline-none focus:border-[#5aa0d3] transition-colors" />
            ))}
          </div>
          {error && <p className="text-[#e05252] text-sm">{error}</p>}
          <button type="submit" disabled={guardando} className="w-full bg-[#5aa0d3] hover:bg-[#4a8fc2] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {guardando ? 'Guardando...' : 'Agregar proveedor'}
          </button>
        </form>

        <div className="space-y-1">
          {proveedores.map(p => (
            <div key={p.id} className="flex justify-between items-center border border-[#e2e4e8] rounded-lg px-4 py-3 hover:border-[#b0b1b3] transition-colors">
              <div>
                <p className="text-sm font-medium text-[#1a1d23]">{p.razon_social}</p>
                <p className="text-[#b0b1b3] text-xs mt-0.5">{p.especialidad} — {p.ruc}</p>
              </div>
              <button onClick={() => eliminar(p.id)} className="text-[#b0b1b3] hover:text-[#e05252] text-sm transition-colors">×</button>
            </div>
          ))}
          {proveedores.length === 0 && <p className="text-[#b0b1b3] text-sm text-center py-4">Sin proveedores registrados</p>}
        </div>
      </div>
    </div>
  )
}
