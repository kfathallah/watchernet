const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/**
 * Wrapper fetch centralisé.
 * - Injecte le header Content-Type JSON.
 * - Lève une Error avec le message `detail` de FastAPI en cas d'échec.
 * - Retourne null pour les réponses 204 No Content.
 */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body.detail ?? detail
    } catch {
      // pas de corps JSON – on garde statusText
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

// ─── API Caméras ──────────────────────────────────────────────────────────────

export const camerasApi = {
  /** GET /api/cameras → Camera[] */
  getAll: () => request('/api/cameras'),

  /** POST /api/cameras → Camera */
  create: (data) =>
    request('/api/cameras', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /api/cameras/:id → Camera */
  update: (id, data) =>
    request(`/api/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/cameras/:id → null */
  remove: (id) => request(`/api/cameras/${id}`, { method: 'DELETE' }),
}
