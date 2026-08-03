from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CameraBase(BaseModel):
    """Champs communs à toutes les vues de Camera."""
    name: str = Field(..., min_length=1, max_length=128, examples=["Caméra Entrée"])
    url: str = Field(..., min_length=7, examples=["rtsp://192.168.1.100:554/stream"])
    active: bool = Field(default=True)


class CameraCreate(CameraBase):
    """Payload pour POST /api/cameras."""
    pass


class CameraUpdate(BaseModel):
    """Payload pour PUT /api/cameras/{id} – tous les champs sont optionnels."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    url: Optional[str] = Field(default=None, min_length=7)
    active: Optional[bool] = None


class CameraResponse(BaseModel):
    """Réponse API – l'ObjectId MongoDB est exposé en tant que chaîne `id`."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., examples=["64f1a2b3c4d5e6f7a8b9c0d1"])
    name: str
    url: str
    active: bool
