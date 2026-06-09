import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../api/axios'

export default function DashboardPage() {
  const { usuario } = useAuth()

  const [metricas, setMetricas] = useState({
    correctivosPendientes: null,
    equiposCriticos: null,
    programasAtrasados: null,
  })

  useEffect(() => {
    const cargarMetricas = async () => {
      try {
        const [correctivos, criticos, atrasados] = await Promise.all([
          api.get('/api/correctivo/ordenes/?estado=PENDIENTE&page_size=1'),
          api.get('/api/preventivo/programas/?score_min=4&page_size=1'),
          api.get('/api/preventivo/programas/?estado=ATRASADO&page_size=1'),
        ])
        setMetricas({
          correctivosPendientes: correctivos.data.count ?? (correctivos.data.results ?? correctivos.data).length,
          equiposCriticos: criticos.data.count ?? (criticos.data.results ?? criticos.data).length,
          programasAtrasados: atrasados.data.count ?? (atrasados.data.results ?? atrasados.data).length,
        })
      } catch {
        setMetricas({ correctivosPendientes: 0, equiposCriticos: 0, programasAtrasados: 0 })
      }
    }
    cargarMetricas()
  }, [])

  const fmt = (n) => (n === null ? '—' : n < 10 ? `0${n}` : n)

  const nombreUsuario = usuario?.first_name || usuario?.username || 'Usuario'
  const rolUsuario = usuario?.rol || 'Administrador'

  return (
    <div className="animate-in fade-in duration-500">

      {/* Hero de bienvenida */}
      <section className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-bold text-[#191c1e]">Bienvenido, {nombreUsuario}</h1>
          <p className="text-base text-[#40484f] flex items-center justify-center md:justify-start gap-2">
            Rol: <span className="bg-[#5aa0d3]/20 text-[#003551] px-2 py-1 rounded-lg font-bold capitalize text-sm">{rolUsuario.toLowerCase()}</span>
          </p>
        </div>

      </section>

      {/* Métricas rápidas conectadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-[#c0c7d0] flex items-center gap-4">
          <div className="bg-[#e8a838]/15 p-2 rounded-full">
            <span className="material-symbols-outlined text-[#e8a838]">pending_actions</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[#40484f]">Órdenes Correctivas Pendientes</p>
            <p className="text-2xl font-semibold text-[#191c1e]">{fmt(metricas.correctivosPendientes)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#c0c7d0] flex items-center gap-4">
          <div className="bg-[#ba1a1a]/10 p-2 rounded-full">
            <span className="material-symbols-outlined text-[#ba1a1a]">warning</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[#40484f]">Equipos con Score ≥ 4</p>
            <p className="text-2xl font-semibold text-[#ba1a1a]">{fmt(metricas.equiposCriticos)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#c0c7d0] flex items-center gap-4">
          <div className="bg-[#036494]/10 p-2 rounded-full">
            <span className="material-symbols-outlined text-[#036494]">event_busy</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[#40484f]">Programas Atrasados</p>
            <p className="text-2xl font-semibold text-[#191c1e]">{fmt(metricas.programasAtrasados)}</p>
          </div>
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Preventivo */}
        <div className="group relative overflow-hidden bg-white border border-[#c0c7d0] rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#036494] p-2 rounded-xl">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <h2 className="text-xl font-semibold text-[#191c1e]">Mantenimiento Preventivo</h2>
            </div>
            <p className="text-[#40484f] text-sm">Inspecciones y evaluación de equipos para garantizar la operatividad continua y reducir fallas imprevistas.</p>
            <div className="pt-2">
              <Link to="/preventivo" className="w-full inline-flex justify-center items-center gap-2 bg-[#036494] text-white text-xs font-semibold tracking-wider uppercase py-4 rounded-lg hover:bg-[#004b71] transition-colors active:scale-95 duration-100">
                Acceder a inspecciones
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Correctivo */}
        <div className="group relative overflow-hidden bg-white border border-[#c0c7d0] rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#af2e32] p-2 rounded-xl">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
              </div>
              <h2 className="text-xl font-semibold text-[#191c1e]">Mantenimiento Correctivo</h2>
            </div>
            <p className="text-[#40484f] text-sm">Gestión de órdenes de trabajo e incidentes reportados para la reparación inmediata de activos críticos.</p>
            <div className="pt-2">
              <Link to="/correctivo" className="w-full inline-flex justify-center items-center gap-2 bg-[#af2e32] text-white text-xs font-semibold tracking-wider uppercase py-4 rounded-lg hover:bg-[#8d131d] transition-colors active:scale-95 duration-100">
                Gestionar órdenes
                <span className="material-symbols-outlined text-sm">assignment</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div className="group relative overflow-hidden bg-white border border-[#c0c7d0] rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#5c5e65] p-2 rounded-xl">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <h2 className="text-xl font-semibold text-[#191c1e]">Mi Perfil</h2>
            </div>
            <p className="text-[#40484f] text-sm">Acceso a tu firma digital, datos personales y configuración de seguridad del sistema.</p>
            <div className="pt-2">
              <Link to="/perfil" className="w-full inline-flex justify-center items-center gap-2 border-2 border-[#c0c7d0] text-[#191c1e] text-xs font-semibold tracking-wider uppercase py-3.5 rounded-lg hover:bg-[#edeef0] transition-colors active:scale-95 duration-100">
                Ver mi perfil
                <span className="material-symbols-outlined text-sm">draw</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Estado del sistema */}
      <div className="mt-12 bg-[#e7e8ea] border border-[#c0c7d0] p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-lg font-semibold text-[#191c1e]">Estado del Sistema</h3>
          <p className="text-[#40484f] text-sm">Todos los módulos operan con normalidad.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#036494]/10 text-[#036494] rounded-full text-xs font-semibold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-[#036494] animate-pulse"></span>
          Sistema Online
        </span>
      </div>

    </div>
  )
}
