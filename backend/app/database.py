from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Ouvre la connexion Motor (appelée au démarrage via lifespan)."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    # Vérifie la connectivité sans bloquer
    await _client.admin.command("ping")


async def close_db() -> None:
    """Ferme proprement la connexion Motor (appelée à l'arrêt via lifespan)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    """Dépendance FastAPI – retourne l'instance de la base de données."""
    if _client is None:
        raise RuntimeError("Database client is not initialized")
    return _client[settings.MONGO_DB_NAME]
