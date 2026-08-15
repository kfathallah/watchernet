from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FireAlertPayload(BaseModel):
    model_version: Literal["yolov26"]
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: list[float] = Field(min_length=4, max_length=4)
    timestamp: datetime
    camera_id: str | None = None
