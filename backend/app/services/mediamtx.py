from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class MediaMTXService:
    """
    Service asynchrone d'interfaçage avec l'API REST de MediaMTX.

    Cycle de vie :
        await mediamtx_service.start(base_url)   # dans le lifespan FastAPI
        await mediamtx_service.stop()            # dans le lifespan FastAPI

    Un seul AsyncClient HTTP est partagé pour toutes les requêtes
    (connection pooling, pas de reconnexion par appel).
    """

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    # ─── Cycle de vie ─────────────────────────────────────────────────────────

    async def start(self, base_url: str) -> None:
        """Initialise le client HTTP persistant. Appelé au démarrage du serveur."""
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0),
        )
        logger.info("MediaMTXService – client HTTP initialisé sur %s", base_url)

    async def stop(self) -> None:
        """Ferme proprement le client HTTP. Appelé à l'arrêt du serveur."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("MediaMTXService – client HTTP fermé")

    def _client_or_raise(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError(
                "MediaMTXService non initialisé – appelez start() avant toute opération."
            )
        return self._client

    # ─── Opérations sur les paths ─────────────────────────────────────────────

    async def add_path(self, camera_id: str, url: str) -> None:
        """
        Enregistre un flux RTSP dans MediaMTX.

        POST /v3/config/paths/add/{camera_id}
        Body : { "source": "<url>" }

        Tolère les erreurs de communication (non-bloquant pour MongoDB).
        """
        client = self._client_or_raise()
        endpoint = f"/v3/config/paths/add/{camera_id}"
        try:
            response = await client.post(endpoint, json={"source": url})
            response.raise_for_status()
            logger.info("MediaMTX – chemin ajouté : [%s] → %s", camera_id, url)
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "MediaMTX add_path [%s] – HTTP %s : %s",
                camera_id,
                exc.response.status_code,
                exc.response.text,
            )
        except httpx.RequestError as exc:
            logger.warning("MediaMTX add_path [%s] – connexion échouée : %s", camera_id, exc)

    async def delete_path(self, camera_id: str) -> None:
        """
        Supprime un flux RTSP de MediaMTX.

        DELETE /v3/config/paths/delete/{camera_id}

        Tolère les erreurs de communication (non-bloquant pour MongoDB).
        """
        client = self._client_or_raise()
        endpoint = f"/v3/config/paths/delete/{camera_id}"
        try:
            response = await client.delete(endpoint)
            response.raise_for_status()
            logger.info("MediaMTX – chemin supprimé : [%s]", camera_id)
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "MediaMTX delete_path [%s] – HTTP %s : %s",
                camera_id,
                exc.response.status_code,
                exc.response.text,
            )
        except httpx.RequestError as exc:
            logger.warning("MediaMTX delete_path [%s] – connexion échouée : %s", camera_id, exc)

    async def list_paths(self) -> list[dict[str, Any]]:
        """
        Retourne la liste des paths actifs dans MediaMTX.

        GET /v3/paths/list

        Utilisé pour la validation et les endpoints de debug/healthcheck.
        Retourne une liste vide en cas d'erreur.
        """
        client = self._client_or_raise()
        try:
            response = await client.get("/v3/paths/list")
            response.raise_for_status()
            return response.json().get("items", [])
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "MediaMTX list_paths – HTTP %s : %s",
                exc.response.status_code,
                exc.response.text,
            )
        except httpx.RequestError as exc:
            logger.warning("MediaMTX list_paths – connexion échouée : %s", exc)
        return []


# ─── Singleton ────────────────────────────────────────────────────────────────
# Instancié ici, initialisé dans le lifespan de app/main.py.
mediamtx_service = MediaMTXService()
