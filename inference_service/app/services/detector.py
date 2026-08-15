from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
from pydantic import BaseModel, Field

from app.core.onnx_engine import onnx_engine


class Detection(BaseModel):
    bbox: list[float] = Field(min_length=4, max_length=4)
    confidence: float
    class_id: int
    label: str = "fire"
    model_version: str = "yolov26"
    timestamp: str


class DetectorService:
    """Encapsulates raw frame inference and returns structured detections."""

    def __init__(self) -> None:
        self._engine = onnx_engine

    def detect(self, frame: np.ndarray) -> list[dict[str, Any]]:
        detections = self._engine.predict(frame)
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        structured_detections = [
            Detection(
                bbox=detection["bbox"],
                confidence=detection["confidence"],
                class_id=detection["class_id"],
                timestamp=timestamp,
            ).model_dump()
            for detection in detections
        ]

        return structured_detections


detector_service = DetectorService()
