import { useEffect, useRef, useState } from 'react'

const WHEP_BASE_URL = import.meta.env.VITE_WHEP_BASE_URL ?? 'http://localhost:8889'

/**
 * Délai maximum (ms) pour attendre la fin de la collecte ICE.
 * Passé ce délai, l'offre SDP est envoyée avec les candidats disponibles.
 */
const ICE_GATHER_TIMEOUT_MS = 3000

/**
 * Hook personnalisé gérant la connexion WebRTC via le protocole WHEP.
 *
 * Protocole WHEP (WebRTC-HTTP Egress Protocol) avec MediaMTX :
 *   1. Créer une RTCPeerConnection avec des transceivers recvonly.
 *   2. Générer l'offre SDP locale, attendre la fin de la collecte ICE.
 *   3. POST {sdp offer} → http://localhost:8889/{cameraId}/whep
 *   4. Appliquer le SDP answer reçu en réponse.
 *
 * Nettoyage automatique :
 *   - Quand `active` passe à false ou que le composant est démonté.
 *   - La RTCPeerConnection est fermée et srcObject vidéo est libéré.
 *
 * @param {string|null} cameraId - ID de la caméra (= nom du path MediaMTX)
 * @param {boolean} active       - Déclenche/arrête la connexion
 * @returns {{ videoRef: React.RefObject, status: string, error: string|null }}
 *   status : 'idle' | 'connecting' | 'connected' | 'error'
 */
export function useWhepStream(cameraId, active) {
  const videoRef = useRef(null)
  const pcRef   = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error,  setError]  = useState(null)

  useEffect(() => {
    let cancelled = false

    /** Ferme la RTCPeerConnection et libère le srcObject vidéo. */
    function teardown() {
      if (pcRef.current) {
        pcRef.current.ontrack = null
        pcRef.current.onconnectionstatechange = null
        pcRef.current.onicegatheringstatechange = null
        pcRef.current.close()
        pcRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    // Caméra inactive ou id absent → nettoyage immédiat
    if (!active || !cameraId) {
      teardown()
      setStatus('idle')
      setError(null)
      return
    }

    /**
     * Attend que ICE gathering soit 'complete', avec timeout de sécurité.
     * Garantit que l'offre SDP contient tous les candidats ICE locaux.
     */
    function waitForIceGathering(pc) {
      if (pc.iceGatheringState === 'complete') return Promise.resolve()
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, ICE_GATHER_TIMEOUT_MS)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timer)
            resolve()
          }
        }
      })
    }

    async function connect() {
      setStatus('connecting')
      setError(null)

      const pc = new RTCPeerConnection({ iceServers: [] })
      pcRef.current = pc

      // Transceivers recvonly : le navigateur ne publie rien, il reçoit seulement
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      // Dès que MediaMTX envoie les tracks, les attacher à l'élément <video>
      pc.ontrack = ({ streams }) => {
        if (videoRef.current && streams[0]) {
          videoRef.current.srcObject = streams[0]
        }
      }

      // Suivi des transitions d'état de la connexion
      pc.onconnectionstatechange = () => {
        if (cancelled) return
        switch (pc.connectionState) {
          case 'connected':
            setStatus('connected')
            break
          case 'failed':
            setStatus('error')
            setError('Connexion WebRTC échouée. Désactivez puis réactivez la caméra.')
            break
          case 'disconnected':
            setStatus('error')
            setError('Connexion WebRTC interrompue.')
            break
          default:
            break
        }
      }

      try {
        // ── Étape 1 : Offre SDP ──────────────────────────────────────────────
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // ── Étape 2 : Attendre la collecte ICE ───────────────────────────────
        await waitForIceGathering(pc)
        if (cancelled) { teardown(); return }

        // ── Étape 3 : Négociation WHEP ───────────────────────────────────────
        const response = await fetch(`${WHEP_BASE_URL}/${cameraId}/whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription.sdp,
        })

        if (!response.ok) {
          throw new Error(`WHEP ${response.status} – ${response.statusText}`)
        }

        const sdpAnswer = await response.text()
        if (cancelled) { teardown(); return }

        // ── Étape 4 : Appliquer le SDP answer ───────────────────────────────
        await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer })
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(err.message)
        }
      }
    }

    connect()

    // Cleanup : appelé si cameraId/active changent ou si le composant se démonte
    return () => {
      cancelled = true
      teardown()
      setStatus('idle')
    }
  }, [cameraId, active])

  return { videoRef, status, error }
}
