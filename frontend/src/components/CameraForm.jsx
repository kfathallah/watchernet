import { useState, useEffect, useRef } from 'react'

const EMPTY_FORM = { name: '', url: '' }

export default function CameraForm({ camera, onSubmit, onClose, submitting }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const firstInputRef = useRef(null)
  const isEditing = Boolean(camera)

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    setForm(camera ? { name: camera.name, url: camera.url } : EMPTY_FORM)
    setErrors({})
    firstInputRef.current?.focus()
  }, [camera])

  // Fermer la modale sur Echap
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Le nom est requis.'
    if (!form.url.trim()) {
      next.url = "L'URL RTSP est requise."
    } else if (!/^rtsps?:\/\/.+/i.test(form.url.trim())) {
      next.url = "L'URL doit commencer par rtsp:// ou rtsps://"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Effacer l'erreur du champ modifié
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ name: form.name.trim(), url: form.url.trim() })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panneau modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="form-title" className="text-base font-semibold text-gray-900">
            {isEditing ? 'Modifier la caméra' : 'Ajouter une caméra'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">

            {/* Nom */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Nom de la caméra
              </label>
              <input
                ref={firstInputRef}
                id="name"
                name="name"
                type="text"
                autoComplete="off"
                placeholder="ex. Caméra Entrée"
                value={form.name}
                onChange={handleChange}
                disabled={submitting}
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                  submitting ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* URL RTSP */}
            <div>
              <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-gray-700">
                URL du flux RTSP
              </label>
              <input
                id="url"
                name="url"
                type="url"
                autoComplete="off"
                placeholder="rtsp://192.168.1.10:554/stream"
                value={form.url}
                onChange={handleChange}
                disabled={submitting}
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.url ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                  submitting ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              />
              {errors.url && (
                <p className="mt-1 text-xs text-red-600">{errors.url}</p>
              )}
            </div>
          </div>

          {/* Pied */}
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              )}
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
