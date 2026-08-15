import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import VideoPlayer from '../components/VideoPlayer'

const useWhepStreamMock = vi.fn()
const useNatsSubMock = vi.fn()
vi.mock('../hooks/useWhepStream', () => ({
  useWhepStream: (...args) => useWhepStreamMock(...args),
}))
vi.mock('../hooks/useNatsSub', () => ({
  useNatsSub: (...args) => useNatsSubMock(...args),
}))

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock

describe('VideoPlayer', () => {
  it('shows error overlay when the stream fails', () => {
    useWhepStreamMock.mockReturnValue({
      videoRef: { current: null },
      status: 'error',
      error: 'WHEP 404 – Not Found',
    })
    useNatsSubMock.mockReturnValue({ detection: null, isConnected: false })

    render(<VideoPlayer cameraId="cam1" active={true} />)
    expect(screen.getByText(/WHEP 404/i)).toBeInTheDocument()
  })

  it('shows loading overlay while connecting', () => {
    useWhepStreamMock.mockReturnValue({
      videoRef: { current: null },
      status: 'connecting',
      error: null,
    })
    useNatsSubMock.mockReturnValue({ detection: null, isConnected: false })

    render(<VideoPlayer cameraId="cam1" active={true} />)
    expect(screen.getByText(/Connexion en cours/i)).toBeInTheDocument()
  })

  it('renders NATS state badge', () => {
    useWhepStreamMock.mockReturnValue({
      videoRef: { current: null },
      status: 'connected',
      error: null,
    })
    useNatsSubMock.mockReturnValue({ detection: null, isConnected: true })

    render(<VideoPlayer cameraId="cam1" active={true} />)
    expect(screen.getByText(/NATS ON/i)).toBeInTheDocument()
  })
})
