import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="flex h-screen w-full bg-[#f8f9fb] text-[#191c1e] m-0 p-0 overflow-hidden font-sans">
      {/* Panel Izquierdo: Visual / Branding */}
      <section className="hidden md:flex md:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#5aa0d3] to-[#036494]">

        {/* Logos institucionales arriba */}
        <div className="absolute top-0 left-0 right-0 z-20 p-10">
          <div className="inline-flex items-center gap-5 bg-white/95 rounded-xl px-6 py-4 shadow-sm">
            <img src="/logo-bateas.png" alt="Bateas" className="h-12 object-contain" />
            <div className="w-px h-10 bg-[#c0c7d0]"></div>
            <img src="/logo-dho.png" alt="DHO" className="h-12 object-contain" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-end p-12 h-full w-full text-white">
          <div className="max-w-md">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#cbe6ff] block mb-4">
              Sistema Integral
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              Sistema de Gestión de Mantenimiento
            </h1>

          </div>
        </div>
      </section>

      {/* Panel Derecho: Formulario de Login */}
      <section className="w-full md:w-1/2 flex flex-col bg-[#f8f9fb] h-full overflow-y-auto">
        {/* Header para vista Móvil */}
        <div className="md:hidden p-6 flex items-center justify-between border-b border-[#c0c7d0]">
          <div className="text-xl font-bold text-[#036494]">DHO</div>
          <span className="text-xs font-medium text-[#40484f]">Mantenimiento</span>
        </div>

        <div className="flex-grow flex items-center justify-center p-6">
          <div className="w-full max-w-[400px] animate-in fade-in duration-700">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-[#191c1e] mb-1">Iniciar sesión</h2>
              <p className="text-sm text-[#40484f]">Acceda al portal de mantenimiento DHO</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Usuario */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#191c1e] block" htmlFor="usuario">
                  USUARIO
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#707880] group-focus-within:text-[#036494] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">account_circle</span>
                  </div>
                  <input
                    id="usuario"
                    name="usuario"
                    type="text"
                    autoComplete="username"
                    placeholder="Nombre de usuario"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#c0c7d0] rounded-lg focus:ring-2 focus:ring-[#5aa0d3] focus:border-[#036494] outline-none transition-all placeholder:text-[#c0c7d0]"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold tracking-wider uppercase text-[#191c1e]" htmlFor="password">
                    CONTRASEÑA
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#707880] group-focus-within:text-[#036494] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white border border-[#c0c7d0] rounded-lg focus:ring-2 focus:ring-[#5aa0d3] focus:border-[#036494] outline-none transition-all placeholder:text-[#c0c7d0]"
                  />
                </div>
              </div>

              {/* Manejo de Errores con la paleta de diseño */}
              {error && (
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] text-sm rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              {/* Enlace Olvidaste tu contraseña */}
              <div className="flex justify-end">
                <a className="text-xs font-medium text-[#036494] hover:underline transition-all" href="#">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Botón de Login */}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#5aa0d3] disabled:bg-[#c0c7d0] text-white py-3 rounded-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>{cargando ? 'Ingresando...' : 'Ingresar'}</span>
                {!cargando && <span className="material-symbols-outlined text-[20px]">login</span>}
                {cargando && <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>}
              </button>
            </form>


          </div>
        </div>

        {/* Footer Institucional del Login */}
        <footer className="w-full py-4 px-6 border-t border-[#c0c7d0] bg-[#f3f4f6]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-[1440px] mx-auto">
            <p className="text-xs font-medium text-[#60626a] text-center md:text-left">
              Calidad de Vida · Dirección de Desarrollo Humano y Organizacional
            </p>
            <div className="flex gap-6">
              <a className="text-xs font-medium text-[#60626a] hover:text-[#036494] transition-colors" href="#">Privacidad</a>
              <a className="text-xs font-medium text-[#60626a] hover:text-[#036494] transition-colors" href="#">Soporte Técnico</a>
              <a className="text-xs font-medium text-[#60626a] hover:text-[#036494] transition-colors" href="#">Manual</a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  )
}