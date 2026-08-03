import { useState, useEffect, useCallback } from 'react'
import { camerasApi } from './services/api'
import CameraList from './components/CameraList'
import CameraForm from './components/CameraForm'

export default function App() {
  // ─── État global ──────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // id de la caméra dont le toggle est en cours (évite les doubles clics)
  const [toggling, setToggling] = useState(null)

  // Modale : null = fermée, {} = création, { ...camera } = édition
  const [editingCamera, setEditingCamera] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ─── Chargement initial ───────────────────────────────────────────────────
  const fetchCameras = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await camerasApi.getAll()
      setCameras(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCameras() }, [fetchCameras])

  // ─── Ouvrir/fermer la modale ──────────────────────────────────────────────
  function openCreate() {
    setEditingCamera(null)
    setIsFormOpen(true)
  }

  function openEdit(camera) {
    setEditingCamera(camera)
    setIsFormOpen(true)
  }

  function closeForm() {
    if (submitting) return
    setIsFormOpen(false)
    setEditingCamera(null)
  }

  // ─── Création / Mise à jour ───────────────────────────────────────────────
  async function handleSubmit(formData) {
    setSubmitting(true)
    setError(null)
    try {
      if (editingCamera) {
        const updated = await camerasApi.update(editingCamera.id, formData)
        setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const created = await camerasApi.create({ ...formData, active: true })
        setCameras((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Suppression ──────────────────────────────────────────────────────────
  async function handleDelete(id) {
    setError(null)
    try {
      await camerasApi.remove(id)
      setCameras((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  // ─── Toggle active ────────────────────────────────────────────────────────
  async function handleToggle(camera) {
    setToggling(camera.id)
    setError(null)
    try {
      const updated = await camerasApi.update(camera.id, { active: !camera.active })
      setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling(null)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre de navigation */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">WatcherNet</span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une caméra
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Bandeau d'erreur */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Erreur</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 focus:outline-none"
              aria-label="Fermer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* En-tête de section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Caméras</h1>
            {!loading && (
              <p className="mt-0.5 text-sm text-gray-500">
                {cameras.length} caméra{cameras.length !== 1 ? 's' : ''} configurée{cameras.length !== 1 ? 's' : ''}
                {' · '}
                {cameras.filter((c) => c.active).length} active{cameras.filter((c) => c.active).length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={fetchCameras}
            disabled={loading}
            title="Actualiser"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-40"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <CameraList
          cameras={cameras}
          loading={loading}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          toggling={toggling}
        />
      </main>

      {/* Modale création / édition */}
      {isFormOpen && (
        <CameraForm
          camera={editingCamera}
          onSubmit={handleSubmit}
          onClose={closeForm}
          submitting={submitting}
        />
      )}
    </div>
  )
}
