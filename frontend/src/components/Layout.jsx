import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const NAV_LINKS = [
  { label: 'Dashboard',  path: '/' },
  { label: 'Preventivo', path: '/preventivo' },
  { label: 'Correctivo', path: '/correctivo' },
  { label: 'Gestión',    path: '/gestion', soloAdmin: true },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, logout } = useAuth()

  const nombreUsuario = usuario?.first_name || usuario?.username || 'Usuario'
  const rolUsuario = usuario?.rol || ''
  const esAdmin = usuario?.rol === 'ADMIN'

  const esActivo = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="bg-[#f8f9fb] font-sans text-[#191c1e] min-h-screen flex flex-col">

      {/* TopNavBar */}
      <header className="bg-[#f8f9fb] sticky top-0 border-b border-[#c0c7d0] z-50">
        <div className="flex justify-between items-center w-full px-6 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/')}
              className="text-xl font-bold text-[#036494]"
            >
              Sistema de Mantenimiento - DHO
            </button>
            <nav className="hidden md:flex gap-2">
              {NAV_LINKS.filter(l => !l.soloAdmin || esAdmin).map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className={`text-xs font-semibold tracking-wider uppercase rounded px-2 pb-1 transition-colors ${
                    esActivo(path)
                      ? 'text-[#036494] border-b-2 border-[#036494]'
                      : 'text-[#40484f] hover:bg-[#f3f4f6]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="material-symbols-outlined text-[#036494] cursor-pointer p-2 rounded-full hover:bg-[#f3f4f6] transition-colors outline-none focus:ring-2 focus:ring-[#5aa0d3]">
                account_circle
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-[#f8f9fb] border border-[#c0c7d0] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-4 border-b border-[#c0c7d0]">
                  <p className="font-bold text-sm truncate">{nombreUsuario}</p>
                  <p className="text-xs text-[#40484f] capitalize">{rolUsuario.toLowerCase()}</p>
                </div>
                <Link to="/perfil" className="block px-4 py-2 hover:bg-[#f3f4f6] text-sm transition-colors">
                  Mi Perfil
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left block px-4 py-2 hover:bg-[#f3f4f6] text-sm text-[#ba1a1a] transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e4e8] px-6 py-4 text-center">
        <p className="text-xs text-[#b0b1b3]">
          Calidad de Vida · Dirección de Desarrollo Humano y Organizacional — {new Date().getFullYear()}
        </p>
      </footer>

    </div>
  )
}
