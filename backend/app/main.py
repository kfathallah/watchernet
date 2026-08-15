from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from nats.aio.client import Client as NATS
from nats.aio.msg import Msg
from pydantic import ValidationError

from app.config import settings
from app.database import connect_db, close_db, get_database
from app.routers import alerts, cameras
from app.schemas.alert import FireAlertPayload
from app.services.mediamtx import mediamtx_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Gestion du cycle de vie : DB, MediaMTX et subscriber NATS."""
    await connect_db()
    await mediamtx_service.start(settings.MEDIAMTX_API_URL)
    nc = NATS()

    async def handle_fire_alert(msg: Msg) -> None:
        try:
            payload = json.loads(msg.data.decode("utf-8"))
            if not isinstance(payload, dict):
                logger.error("NATS payload invalide (non-objet JSON): sujet=%s", msg.subject)
                return

            subject_parts = msg.subject.split(".")
            camera_id_from_subject = subject_parts[2] if len(subject_parts) >= 4 else None

            if not payload.get("camera_id"):
                payload["camera_id"] = camera_id_from_subject

            if not payload.get("camera_id"):
                logger.error("camera_id introuvable dans payload/sujet: sujet=%s payload=%s", msg.subject, payload)
                return

            alert = FireAlertPayload.model_validate(payload)
            db = get_database()
            await db.alerts.insert_one(alert.model_dump())
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.error("Erreur de décodage NATS: sujet=%s erreur=%s", msg.subject, exc)
        except ValidationError as exc:
            logger.error("Payload NATS invalide: sujet=%s erreurs=%s", msg.subject, exc.errors())
        except Exception as exc:
            logger.exception("Erreur inattendue lors du traitement d'alerte NATS: %s", exc)

    await nc.connect(
        servers=[settings.NATS_URL],
        allow_reconnect=True,
        max_reconnect_attempts=-1,
        reconnect_time_wait=2,
        name="watchernet-backend-subscriber",
    )
    await nc.subscribe("watchernet.cameras.*.detections", cb=handle_fire_alert)
    app.state.nats_client = nc
    logger.info("Subscriber NATS connecté sur %s", settings.NATS_URL)

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

    nats_client: NATS | None = getattr(app.state, "nats_client", None)
    if nats_client is not None:
        try:
            await nats_client.drain()
        finally:
            await nats_client.close()

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
app.include_router(alerts.router, prefix="/api")


@app.get("/health", tags=["health"], summary="Vérification de l'état du service")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/mediamtx/paths", tags=["mediamtx"], summary="Lister les paths actifs dans MediaMTX")
async def list_mediamtx_paths() -> dict:
    items = await mediamtx_service.list_paths()
    return {"count": len(items), "items": items}
