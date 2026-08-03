import { useWhepStream } from '../hooks/useWhepStream'

/**
 * Lecteur vidéo WebRTC/WHEP.
 *
 * Monte une RTCPeerConnection via le hook `useWhepStream` et affiche :
 *  - Un spinner pendant la négociation WHEP.
 *  - Le flux vidéo live quand la connexion est établie.
 *  - Un message d'erreur si la connexion échoue.
 *
 * @param {string}  cameraId - ID de la caméra (= path MediaMTX)
 * @param {boolean} active   - Si false, la connexion est fermée proprement
 */
export default function CameraPlayer({ cameraId, active = true }) {
  const { videoRef, status, error } = useWhepStream(cameraId, active)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
      {/* Élément vidéo HTML5 natif */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {/* ── Overlay : connexion en cours ─────────────────────────────────── */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
          <p className="mt-2 text-xs text-gray-400">Connexion en cours…</p>
        </div>
      )}

      {/* ── Overlay : erreur ─────────────────────────────────────────────── */}
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
            {error ?? 'Flux vidéo indisponible'}
          </p>
        </div>
      )}

      {/* ── Badge « En direct » (connexion établie) ──────────────────────── */}
      {status === 'connected' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-[11px] font-medium text-white tracking-wide">EN DIRECT</span>
        </div>
      )}
    </div>
  )
}
