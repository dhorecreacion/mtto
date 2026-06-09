import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import FirmaCanvas from '../components/FirmaCanvas'
import api from '../api/axios'

export default function PerfilPage() {
  const navigate = useNavigate()
  const { usuario, refreshUser } = useAuth()
  const firmaRef = useRef(null)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (firmaRef.current?.isEmpty()) {
      setError('Dibuja tu firma antes de guardar.')
      return
    }
    setGuardando(true)
    setOk(false)
    setError('')
    try {
      const trazos = firmaRef.current.getTrazos()

      // Guarda los trazos en el backend
      await api.patch('/api/accounts/perfil/', { firma_trazos: trazos })
      await refreshUser()
      setOk(true)
    } catch (e) {
      setError('No se pudo guardar la firma.')
    } finally {
      setGuardando(false)
    }
  }

  const limpiar = () => {
    firmaRef.current?.clear()
    setOk(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-white border-b border-[#e2e4e8] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-[#b0b1b3] hover:text-[#1a1d23] text-sm transition-colors">Volver</button>
        <span className="text-xs font-semibold tracking-widest uppercase text-[#b0b1b3]">Perfil</span>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-4">

        {/* Info usuario */}
        <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
          <p className="font-semibold text-[#1a1d23]">{usuario?.first_name} {usuario?.last_name}</p>
          <p className="text-[#b0b1b3] text-sm mt-1">{usuario?.username}</p>
          <p className="text-xs uppercase tracking-wider text-[#b0b1b3] mt-2">{usuario?.rol}</p>
        </div>

        {/* Firma actual */}
        {usuario?.firma_trazos?.length > 0 && (
          <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3] mb-4">Firma registrada</p>
            <FirmaPreview trazos={usuario.firma_trazos} />
          </div>
        )}

        {/* Canvas nueva firma */}
        <div className="bg-white border border-[#e2e4e8] rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#b0b1b3] mb-4">
            {usuario?.firma_trazos?.length ? 'Actualizar firma' : 'Registrar firma'}
          </p>
          <p className="text-[#b0b1b3] text-xs mb-3">Dibuja tu firma en el recuadro</p>

          <div className="border border-[#e2e4e8] rounded-lg overflow-hidden">
            <FirmaCanvas ref={firmaRef} width={500} height={160} />
          </div>

          <button onClick={limpiar} className="mt-2 text-xs text-[#b0b1b3] hover:text-[#1a1d23] transition-colors">
            Limpiar
          </button>

          {error && <p className="text-[#e05252] text-sm mt-3">{error}</p>}
          {ok    && <p className="text-[#4caf82] text-sm mt-3">Firma guardada correctamente.</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full mt-4 bg-[#5aa0d3] hover:bg-[#4a8fc2] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar firma'}
          </button>
        </div>

      </main>
    </div>
  )
}

// Renderiza los trazos guardados como preview (solo lectura)
function FirmaPreview({ trazos }) {
  const canvasRef = useRef(null)

  const renderizar = () => {
    const canvas = canvasRef.current
    if (!canvas || !trazos?.length) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#1a1d23'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    trazos.forEach(trazo => {
      if (trazo.length < 2) return
      ctx.beginPath()
      ctx.moveTo(trazo[0][0] * w, trazo[0][1] * h)
      trazo.slice(1).forEach(([x, y]) => ctx.lineTo(x * w, y * h))
      ctx.stroke()
    })
  }

  return (
    <canvas
      ref={el => { canvasRef.current = el; if (el) renderizar() }}
      width={400}
      height={120}
      className="w-full rounded-lg border border-[#e2e4e8] bg-white"
    />
  )
}
