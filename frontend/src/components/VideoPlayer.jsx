import { useEffect, useRef } from 'react'
import { useWhepStream } from '../hooks/useWhepStream'
import { useNatsSub } from '../hooks/useNatsSub'

function drawDetection(canvas, detection, videoEl) {
  if (!canvas || !videoEl) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = videoEl.clientWidth
  const height = videoEl.clientHeight
  if (width <= 0 || height <= 0) return

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  ctx.clearRect(0, 0, width, height)

  if (!detection || !Array.isArray(detection.bbox) || detection.bbox.length !== 4) {
    return
  }

  const [xMinRaw, yMinRaw, xMaxRaw, yMaxRaw] = detection.bbox.map(Number)
  const coords = [xMinRaw, yMinRaw, xMaxRaw, yMaxRaw]
  const isNormalized = coords.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)

  let x1 = xMinRaw
  let y1 = yMinRaw
  let x2 = xMaxRaw
  let y2 = yMaxRaw

  if (isNormalized) {
    x1 *= width
    y1 *= height
    x2 *= width
    y2 *= height
  } else {
    const nativeW = videoEl.videoWidth || width
    const nativeH = videoEl.videoHeight || height
    const scaleX = width / nativeW
    const scaleY = height / nativeH
    x1 *= scaleX
    y1 *= scaleY
    x2 *= scaleX
    y2 *= scaleY
  }

  const boxX = Math.max(0, Math.min(x1, x2))
  const boxY = Math.max(0, Math.min(y1, y2))
  const boxW = Math.max(0, Math.abs(x2 - x1))
  const boxH = Math.max(0, Math.abs(y2 - y1))

  if (boxW <= 0 || boxH <= 0) return

  const confidence = Number(detection.confidence) || 0
  const modelVersion = detection.model_version || 'yolov26'
  const label = `FIRE (${modelVersion}) ${Math.round(confidence * 100)}%`

  ctx.strokeStyle = '#FF0000'
  ctx.lineWidth = 3
  ctx.strokeRect(boxX, boxY, boxW, boxH)

  ctx.font = 'bold 13px sans-serif'
  const textWidth = ctx.measureText(label).width
  const textPaddingX = 8
  const textPaddingY = 4
  const labelH = 22
  const labelW = textWidth + textPaddingX * 2
  const labelX = Math.max(0, Math.min(boxX, width - labelW))
  const labelY = Math.max(0, boxY - labelH)

  ctx.fillStyle = '#FF0000'
  ctx.fillRect(labelX, labelY, labelW, labelH)

  ctx.fillStyle = '#FFFFFF'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, labelX + textPaddingX, labelY + labelH / 2)
}

/**
 * Video player with WebRTC stream and real-time NATS detection overlay.
 */
export default function VideoPlayer({ cameraId, active = true }) {
  const { videoRef, status, error } = useWhepStream(cameraId, active)
  const { detection, isConnected, isConnecting } = useNatsSub(active ? cameraId : null)
  const canvasRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const videoEl = videoRef.current
    const canvasEl = canvasRef.current
    if (!videoEl || !canvasEl) return

    const syncCanvasSize = () => {
      const w = videoEl.clientWidth
      const h = videoEl.clientHeight
      if (w > 0 && h > 0) {
        if (canvasEl.width !== w) canvasEl.width = w
        if (canvasEl.height !== h) canvasEl.height = h
      }
    }

    syncCanvasSize()
    const ro = new ResizeObserver(syncCanvasSize)
    ro.observe(videoEl)
    window.addEventListener('resize', syncCanvasSize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncCanvasSize)
    }
  }, [videoRef])

  useEffect(() => {
    const canvasEl = canvasRef.current
    const videoEl = videoRef.current
    if (!canvasEl || !videoEl) return

    if (!detection) {
      return
    }

    drawDetection(canvasEl, detection, videoEl)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const ctx = canvasEl.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    }, 500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [detection, videoRef])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      const canvasEl = canvasRef.current
      const ctx = canvasEl?.getContext('2d')
      if (ctx && canvasEl) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      }
    }
  }, [])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 h-full w-full pointer-events-none"
      />

      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
          <p className="mt-2 text-xs text-gray-400">Connexion en cours…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/90 px-4 text-center">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-xs text-red-400 leading-relaxed">
            {error ?? 'Flux video indisponible'}
          </p>
        </div>
      )}

      {status === 'connected' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-[11px] font-medium text-white tracking-wide">EN DIRECT</span>
        </div>
      )}

      <div className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium tracking-wide text-white">
        NATS {isConnected ? 'ON' : isConnecting ? 'CONNECTING' : 'OFF'}
      </div>
    </div>
  )
}
