import { useEffect, useMemo, useState } from 'react'
import { connect, StringCodec } from 'nats.ws'

const DEFAULT_NATS_WS_URL = 'ws://localhost:9222'

/**
 * Subscribe to camera-specific detection events through NATS WebSocket.
 *
 * @param {string|null} cameraId
 * @returns {{ detection: object|null, isConnected: boolean }}
 */
export function useNatsSub(cameraId) {
  const [detection, setDetection] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const subject = useMemo(() => {
    if (!cameraId) return null
    return `watchernet.cameras.${cameraId}.detections`
  }, [cameraId])

  useEffect(() => {
    let cancelled = false
    let nc = null
    let sub = null

    setDetection(null)
    setIsConnected(false)
    setIsConnecting(false)

    if (!subject) {
      return
    }

    const sc = StringCodec()
    const natsWsUrl =
      import.meta.env.VITE_NATS_WS_URL ??
      import.meta.env.VITE_NATS_URL ??
      DEFAULT_NATS_WS_URL

    async function run() {
      try {
        setIsConnecting(true)
        nc = await connect({ servers: [natsWsUrl], name: `watchernet-ui-${cameraId}` })
        if (cancelled) {
          await nc.close()
          return
        }

        setIsConnected(true)
        setIsConnecting(false)
        sub = nc.subscribe(subject)

        for await (const msg of sub) {
          if (cancelled) break

          try {
            const raw = sc.decode(msg.data)
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') {
              setDetection(parsed)
            }
          } catch {
            // Ignore malformed messages and keep the subscription alive.
          }
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false)
          setIsConnecting(false)
        }
      } finally {
        if (!cancelled) {
          setIsConnected(false)
          setIsConnecting(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      setIsConnected(false)
      setIsConnecting(false)
      setDetection(null)

      if (sub) {
        sub.unsubscribe()
      }

      if (nc) {
        nc.drain().catch(() => {})
        nc.close().catch(() => {})
      }
    }
  }, [cameraId, subject])

  return { detection, isConnected, isConnecting }
}
