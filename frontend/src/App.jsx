import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PerfilPage from './pages/PerfilPage'
import PreventivoPage from './pages/preventivo/PreventivoPage'
import InformeFormPage from './pages/preventivo/InformeFormPage'
import CorrectivoPage from './pages/correctivo/CorrectivoPage'
import GestionPage from './pages/gestion/GestionPage'

function RutaProtegida({ children, soloAdmin = false }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div className="flex items-center justify-center h-screen bg-[#f5f6f8]">
      <p className="text-[#b0b1b3] text-sm">Cargando...</p>
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  if (soloAdmin && usuario.rol !== 'ADMIN') return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RutaProtegida><DashboardPage /></RutaProtegida>} />
      <Route path="/perfil" element={<RutaProtegida><PerfilPage /></RutaProtegida>} />
      <Route path="/preventivo" element={<RutaProtegida><PreventivoPage /></RutaProtegida>} />
      <Route path="/preventivo/informe/:programaId" element={<RutaProtegida><InformeFormPage /></RutaProtegida>} />
      <Route path="/correctivo" element={<RutaProtegida><CorrectivoPage /></RutaProtegida>} />
      <Route path="/gestion" element={<RutaProtegida soloAdmin><GestionPage /></RutaProtegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
