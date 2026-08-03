import CameraCard from './CameraCard'

// ─── Camera List ──────────────────────────────────────────────────────────────

export default function CameraList({ cameras, loading, onEdit, onDelete, onToggle, toggling }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
          />
        ))}
      </div>
    )
  }

  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
        <svg className="mb-3 h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-600">Aucune caméra configurée</p>
        <p className="mt-1 text-xs text-gray-400">Cliquez sur « Ajouter une caméra » pour commencer.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((camera) => (
        <CameraCard
          key={camera.id}
          camera={camera}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          toggling={toggling}
        />
      ))}
    </div>
  )
}
