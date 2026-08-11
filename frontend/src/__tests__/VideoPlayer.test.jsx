import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import CameraPlayer from '../components/CameraPlayer'

const useWhepStreamMock = vi.fn()
vi.mock('../hooks/useWhepStream', () => ({
  useWhepStream: (...args) => useWhepStreamMock(...args),
}))

describe('CameraPlayer', () => {
  it('shows error overlay when the stream fails', () => {
    useWhepStreamMock.mockReturnValue({
      videoRef: { current: null },
      status: 'error',
      error: 'WHEP 404 – Not Found',
    })

    render(<CameraPlayer cameraId="cam1" active={true} />)
    expect(screen.getByText(/WHEP 404/i)).toBeInTheDocument()
  })

  it('shows loading overlay while connecting', () => {
    useWhepStreamMock.mockReturnValue({
      videoRef: { current: null },
      status: 'connecting',
      error: null,
    })

    render(<CameraPlayer cameraId="cam1" active={true} />)
    expect(screen.getByText(/Connexion en cours/i)).toBeInTheDocument()
  })
})
