import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

const FirmaCanvas = forwardRef(function FirmaCanvas({ width = 500, height = 180 }, ref) {
  const canvasRef = useRef(null)
  const trazosRef = useRef([])   // todos los trazos guardados
  const trazoActual = useRef([]) // trazo en progreso
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  useImperativeHandle(ref, () => ({
    isEmpty: () => vacio,
    clear: () => {
      trazosRef.current = []
      trazoActual.current = []
      setVacio(true)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, width, height)
    },
    getTrazos: () => trazosRef.current,
    // Renderiza los trazos guardados en un canvas offscreen y devuelve el blob
    toBlob: (callback) => {
      const off = document.createElement('canvas')
      off.width = width
      off.height = height
      renderizar(off.getContext('2d'), trazosRef.current, width, height)
      off.toBlob(callback, 'image/png')
    },
    // Carga trazos guardados previamente
    cargarTrazos: (trazos) => {
      if (!trazos?.length) return
      trazosRef.current = trazos
      setVacio(false)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) renderizar(ctx, trazos, width, height)
    },
  }))

  const renderizar = (ctx, trazos, w, h) => {
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

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return [
      Math.round(((clientX - rect.left) / rect.width) * 1000) / 1000,
      Math.round(((clientY - rect.top) / rect.height) * 1000) / 1000,
    ]
  }

  const iniciar = (e) => {
    e.preventDefault()
    dibujando.current = true
    trazoActual.current = [getPos(e, canvasRef.current)]
  }

  const mover = (e) => {
    e.preventDefault()
    if (!dibujando.current) return
    const punto = getPos(e, canvasRef.current)
    trazoActual.current.push(punto)
    const ctx = canvasRef.current.getContext('2d')
    const trazos = [...trazosRef.current, trazoActual.current]
    renderizar(ctx, trazos, width, height)
  }

  const terminar = (e) => {
    e.preventDefault()
    if (!dibujando.current) return
    dibujando.current = false
    if (trazoActual.current.length > 1) {
      trazosRef.current.push([...trazoActual.current])
      setVacio(false)
    }
    trazoActual.current = []
  }

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.addEventListener('touchstart', iniciar, { passive: false })
    canvas.addEventListener('touchmove', mover, { passive: false })
    canvas.addEventListener('touchend', terminar, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', iniciar)
      canvas.removeEventListener('touchmove', mover)
      canvas.removeEventListener('touchend', terminar)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={iniciar}
      onMouseMove={mover}
      onMouseUp={terminar}
      onMouseLeave={terminar}
      className="w-full bg-white cursor-crosshair"
      style={{ touchAction: 'none', height: `${height}px` }}
    />
  )
})

export default FirmaCanvas
