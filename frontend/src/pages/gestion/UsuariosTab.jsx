import { useEffect, useState } from 'react'
import api from '../../api/axios'

const ROLES = [['ADMIN', 'Administrador'], ['TECNICO', 'Técnico'], ['CLIENTE', 'Cliente']]
const ROL_ESTILO = {
  ADMIN:   'bg-blue-50 text-[#036494] border border-blue-200',
  TECNICO: 'bg-green-50 text-[#4caf82] border border-green-200',
  CLIENTE: 'bg-gray-100 text-[#60626a] border border-gray-200',
}

const FORM_VACIO = {
  username: '', first_name: '', last_name: '', email: '',
  rol: 'TECNICO', telefono: '', password: '', is_active: true,
}

export default function UsuariosTab() {
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = () => api.get('/api/accounts/usuarios/').then(({ data }) => setUsuarios(data.results ?? data))
  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setForm(FORM_VACIO); setEditId(null); setError(''); setModal(true) }

  const abrirEditar = (u) => {
    setForm({
      username: u.username, first_name: u.first_name || '', last_name: u.last_name || '',
      email: u.email || '', rol: u.rol, telefono: u.telefono || '', password: '', is_active: u.is_active,
    })
    setEditId(u.id); setError(''); setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      const payload = { ...form }
      if (editId && !payload.password) delete payload.password  // no cambiar contraseña si va vacía
      if (editId) await api.patch(`/api/accounts/usuarios/${editId}/`, payload)
      else await api.post('/api/accounts/usuarios/', payload)
      setModal(false); cargar()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Error al guardar.')
    } finally { setEnviando(false) }
  }

  const desactivar = async (id) => {
    try { await api.delete(`/api/accounts/usuarios/${id}/`); cargar() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo desactivar.') }
  }

  const reactivar = async (u) => {
    try { await api.patch(`/api/accounts/usuarios/${u.id}/`, { is_active: true }); cargar() }
    catch { setError('No se pudo reactivar.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[#40484f] text-sm">{usuarios.length} usuarios</p>
        <button onClick={abrirNuevo} className="bg-[#036494] hover:bg-[#004b71] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors">
          Nuevo usuario
        </button>
      </div>

      {error && !modal && <p className="text-[#e05252] text-sm mb-3">{error}</p>}

      <div className="space-y-2">
        {usuarios.map(u => (
          <div key={u.id} className={`bg-white border border-[#c0c7d0] rounded-xl px-5 py-3 flex justify-between items-center ${!u.is_active ? 'opacity-60' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-[#191c1e] text-sm">{u.first_name || u.username} {u.last_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ROL_ESTILO[u.rol] || ''}`}>{u.rol}</span>
                {!u.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-[#e05252] border border-red-200">Inactivo</span>}
              </div>
              <p className="text-[#b0b1b3] text-xs mt-0.5">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirEditar(u)} className="text-xs border border-[#c0c7d0] hover:border-[#036494] hover:text-[#036494] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Editar</button>
              {u.is_active ? (
                <button onClick={() => desactivar(u.id)} className="text-xs border border-[#c0c7d0] hover:border-[#ba1a1a] hover:text-[#ba1a1a] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Desactivar</button>
              ) : (
                <button onClick={() => reactivar(u)} className="text-xs border border-[#c0c7d0] hover:border-[#4caf82] hover:text-[#4caf82] text-[#40484f] px-3 py-1.5 rounded-lg transition-all">Reactivar</button>
              )}
            </div>
          </div>
        ))}
        {usuarios.length === 0 && <p className="text-[#b0b1b3] text-sm text-center py-6">Sin usuarios registrados</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50 overflow-y-auto">
          <form onSubmit={guardar} className="bg-white border border-[#c0c7d0] rounded-xl p-6 w-full max-w-md my-4">
            <p className="font-semibold text-[#191c1e] mb-5">{editId ? 'Editar usuario' : 'Nuevo usuario'}</p>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre"><input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="inp" /></Campo>
              <Campo label="Apellido"><input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="inp" /></Campo>
              <Campo label="Usuario *"><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="inp" /></Campo>
              <Campo label="Email"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="inp" /></Campo>
              <Campo label="Rol">
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className="inp">
                  {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Teléfono"><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="inp" /></Campo>
            </div>

            <div className="mt-3">
              <Campo label={editId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  required={!editId} minLength={8} placeholder="Mínimo 8 caracteres" className="inp" />
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
        .inp { width:100%; border:1px solid #c0c7d0; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; color:#191c1e; outline:none; background:white; }
        .inp:focus { border-color:#036494; }
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
