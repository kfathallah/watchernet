from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Lit les variables d'environnement injectées par Docker Compose."""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    MONGO_URI: str
    MONGO_DB_NAME: str
    MEDIAMTX_API_URL: str = "http://mediamtx:9997"


settings = Settings()
