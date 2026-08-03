import { useState } from 'react'
import CameraPlayer from './CameraPlayer'

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-300',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

// ─── Camera Card ──────────────────────────────────────────────────────────────

/**
 * Carte d'une caméra : affiche les métadonnées, le lecteur WebRTC si active,
 * et les contrôles (toggle, édition, suppression).
 *
 * @param {object}   camera   - Objet caméra { id, name, url, active }
 * @param {Function} onEdit   - Ouvre le formulaire d'édition
 * @param {Function} onDelete - Supprime la caméra (reçoit l'id)
 * @param {Function} onToggle - Inverse active (reçoit l'objet camera)
 * @param {string}   toggling - id de la caméra en cours de toggle
 */
export default function CameraCard({ camera, onEdit, onDelete, onToggle, toggling }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isToggling = toggling === camera.id

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* ── Lecteur vidéo WebRTC (affiché uniquement si active) ───────────── */}
      {camera.active && (
        <CameraPlayer cameraId={camera.id} />
      )}

      {/* ── Placeholder caméra inactive ───────────────────────────────────── */}
      {!camera.active && (
        <div className="flex aspect-video w-full items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span className="text-xs">Caméra inactive</span>
          </div>
        </div>
      )}

      {/* ── Informations et contrôles ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-4">

        {/* En-tête : nom + badge statut */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900" title={camera.name}>
            {camera.name}
          </h3>
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
              camera.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
            ].join(' ')}
          >
            {camera.active ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {/* URL RTSP */}
        <p className="truncate text-xs text-gray-400" title={camera.url}>
          {camera.url}
        </p>

        {/* Pied : toggle + actions */}
        <div className="flex items-center justify-between pt-1">

          {/* Toggle active */}
          <div className="flex items-center gap-2">
            <ToggleSwitch
              checked={camera.active}
              onChange={() => onToggle(camera)}
              disabled={isToggling}
            />
            <span className="text-xs text-gray-500">
              {isToggling ? 'Mise à jour…' : camera.active ? 'Désactiver' : 'Activer'}
            </span>
          </div>

          {/* Boutons édition / suppression */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(camera)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Modifier
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(camera.id) }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 focus:outline-none"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
