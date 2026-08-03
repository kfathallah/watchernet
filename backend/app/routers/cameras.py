from __future__ import annotations

import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.models import CameraCreate, CameraResponse, CameraUpdate
from app.services.mediamtx import mediamtx_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cameras", tags=["cameras"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_object_id(id: str) -> ObjectId:
    """Convertit une chaîne en ObjectId ; lève HTTP 400 si invalide."""
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{id}' n'est pas un identifiant de caméra valide.",
        )
    return ObjectId(id)


def _serialize(doc: dict) -> CameraResponse:
    """Transforme un document MongoDB en CameraResponse (ObjectId → str id)."""
    return CameraResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        url=doc["url"],
        active=doc["active"],
    )


# ─── Endpoints CRUD ───────────────────────────────────────────────────────────

@router.get("", response_model=list[CameraResponse], summary="Lister toutes les caméras")
async def list_cameras(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[CameraResponse]:
    cameras: list[CameraResponse] = []
    async for doc in db.cameras.find():
        cameras.append(_serialize(doc))
    return cameras


@router.post(
    "",
    response_model=CameraResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter une caméra",
)
async def create_camera(
    data: CameraCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CameraResponse:
    result = await db.cameras.insert_one(data.model_dump())
    doc = await db.cameras.find_one({"_id": result.inserted_id})
    camera = _serialize(doc)
    await mediamtx_service.add_path(camera.id, camera.url)
    return camera


@router.post(
    "/sync",
    summary="Resynchroniser toutes les caméras dans MediaMTX (récupération après redémarrage)",
)
async def sync_cameras(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    cameras: list[dict] = await db.cameras.find().to_list(1000)
    for cam in cameras:
        await mediamtx_service.add_path(str(cam["_id"]), cam["url"])
    return {"status": "success", "synced_count": len(cameras)}


@router.get(
    "/{id}",
    response_model=CameraResponse,
    summary="Récupérer une caméra par son identifiant",
)
async def get_camera(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CameraResponse:
    doc = await db.cameras.find_one({"_id": _to_object_id(id)})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caméra introuvable.")
    return _serialize(doc)


@router.put(
    "/{id}",
    response_model=CameraResponse,
    summary="Mettre à jour une caméra",
)
async def update_camera(
    id: str,
    data: CameraUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CameraResponse:
    oid = _to_object_id(id)
    existing = await db.cameras.find_one({"_id": oid})
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caméra introuvable.")

    update_fields = data.model_dump(exclude_none=True)
    if not update_fields:
        return _serialize(existing)

    await db.cameras.update_one({"_id": oid}, {"$set": update_fields})
    updated = await db.cameras.find_one({"_id": oid})
    camera = _serialize(updated)

    # ── Synchronisation MediaMTX ────────────────────────────────────────────
    was_active: bool = existing["active"]
    now_active: bool = camera.active
    url_changed: bool = "url" in update_fields and update_fields["url"] != existing["url"]

    if not was_active and now_active:
        # Caméra réactivée → enregistrer dans MediaMTX
        await mediamtx_service.add_path(camera.id, camera.url)
    elif was_active and not now_active:
        # Caméra désactivée → retirer de MediaMTX
        await mediamtx_service.delete_path(camera.id)
    elif was_active and now_active and url_changed:
        # URL changée sur une caméra active → re-enregistrer
        await mediamtx_service.delete_path(camera.id)
        await mediamtx_service.add_path(camera.id, camera.url)

    return camera


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer une caméra",
)
async def delete_camera(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> None:
    oid = _to_object_id(id)
    existing = await db.cameras.find_one({"_id": oid})
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caméra introuvable.")

    await mediamtx_service.delete_path(id)
    await db.cameras.delete_one({"_id": oid})
