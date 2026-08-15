from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database

router = APIRouter(prefix="/v1/alerts", tags=["alerts"])


@router.get("", summary="Historique paginé des alertes incendie")
async def list_alerts(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    camera_id: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    skip = (page - 1) * limit
    query: dict = {}
    if camera_id:
        query["camera_id"] = camera_id

    total = await db.alerts.count_documents(query)
    docs = await db.alerts.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)

    items = []
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "items": items,
    }
