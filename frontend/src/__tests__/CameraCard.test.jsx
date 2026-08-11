import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CameraCard from '../components/CameraCard'
import { vi } from 'vitest'

vi.mock('../components/CameraPlayer', () => ({
  default: () => <div data-testid="camera-player" />,
}))

describe('CameraCard', () => {
  it('renders camera metadata and toggles actions', () => {
    const camera = { id: '1', name: 'Entrée', url: 'rtsp://cam', active: true }
    render(<CameraCard camera={camera} onEdit={() => {}} onDelete={() => {}} onToggle={() => {}} toggling={null} />)

    expect(screen.getByText('Entrée')).toBeInTheDocument()
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('rtsp://cam')).toBeInTheDocument()
    expect(screen.getByTestId('camera-player')).toBeInTheDocument()
  })

  it('shows confirm delete controls', () => {
    const camera = { id: '1', name: 'Entrée', url: 'rtsp://cam', active: false }
    render(<CameraCard camera={camera} onEdit={() => {}} onDelete={() => {}} onToggle={() => {}} toggling={null} />)

    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeInTheDocument()
  })
})
