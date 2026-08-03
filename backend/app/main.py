from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_db, close_db, get_database
from app.routers import cameras
from app.services.mediamtx import mediamtx_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Gestion du cycle de vie : connexion MongoDB + initialisation MediaMTXService."""
    await connect_db()
    await mediamtx_service.start(settings.MEDIAMTX_API_URL)

    # Resynchronise toutes les caméras MongoDB dans la RAM de MediaMTX au démarrage
    db = get_database()
    cameras_docs = await db.cameras.find().to_list(1000)
    for cam in cameras_docs:
        await mediamtx_service.add_path(str(cam["_id"]), cam["url"])
    logger.info(
        "Startup resync – %d caméra(s) synchronisée(s) avec MediaMTX",
        len(cameras_docs),
    )

    yield

    await mediamtx_service.stop()
    await close_db()


app = FastAPI(
    title="WatcherNet API",
    description=(
        "API REST pour la gestion des caméras de vidéosurveillance.\n\n"
        "Chaque caméra est synchronisée avec MediaMTX pour la diffusion RTSP → WebRTC/WHEP."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS (accès depuis le frontend React en développement) ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(cameras.router, prefix="/api")


@app.get("/health", tags=["health"], summary="Vérification de l'état du service")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/mediamtx/paths", tags=["mediamtx"], summary="Lister les paths actifs dans MediaMTX")
async def list_mediamtx_paths() -> dict:
    items = await mediamtx_service.list_paths()
    return {"count": len(items), "items": items}
