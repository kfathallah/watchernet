from __future__ import annotations

import asyncio
import logging
import os
import time

import cv2

from app.core.config import settings
from app.core.nats_client import nats_client
from app.services.detector import detector_service

# Force TCP et applique un timeout de 5s pour débloquer OpenCV si le réseau fige
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
    "rtsp_transport;tcp|stimeout;5000000"
)

logger = logging.getLogger(__name__)


class StreamWorker:
    """Capture an RTSP stream, run inference, and publish detections to NATS."""

    def __init__(self, camera_id: str) -> None:
        self.camera_id = camera_id
        self.stream_url = (
            f"{settings.MEDIAMTX_RTSP_URL.rstrip('/')}/{camera_id}"
        )
        self.subject = f"watchernet.cameras.{camera_id}.detections"
        self._frame_interval = 1.0 / max(1, settings.FPS_SAMPLING)

    async def run(self) -> None:
        logger.info("Stream worker started for camera %s", self.camera_id)
        max_consecutive_failures = 5

        try:
            # 🔄 Boucle principale : gère la connexion et les reconnexions
            while True:
                logger.info(
                    "Connecting to RTSP stream for camera %s...", self.camera_id
                )
                capture = await asyncio.to_thread(
                    cv2.VideoCapture, self.stream_url
                )

                if not capture.isOpened():
                    logger.warning(
                        "Unable to open RTSP stream for camera %s. Retrying in 3s...",
                        self.camera_id,
                    )
                    await asyncio.to_thread(capture.release)
                    await asyncio.sleep(3.0)
                    continue

                logger.info(
                    "RTSP stream opened successfully for camera %s",
                    self.camera_id,
                )
                consecutive_failures = 0
                last_sample_time = 0.0

                # 🎬 Boucle secondaire : lecture des images du flux
                try:
                    while True:
                        now = time.monotonic()
                        if now - last_sample_time < self._frame_interval:
                            await asyncio.sleep(0.01)
                            continue

                        last_sample_time = now
                        ok, frame = await asyncio.to_thread(capture.read)

                        if not ok or frame is None:
                            consecutive_failures += 1
                            logger.warning(
                                "RTSP frame read failed for camera %s (%d/%d)",
                                self.camera_id,
                                consecutive_failures,
                                max_consecutive_failures,
                            )

                            # Si 5 échecs consécutifs : le flux est corrompu, on casse la boucle interne
                            if (
                                consecutive_failures
                                >= max_consecutive_failures
                            ):
                                logger.error(
                                    "Stream lost or corrupted for camera %s. Reconnecting...",
                                    self.camera_id,
                                )
                                break

                            await asyncio.sleep(0.1)
                            continue

                        # Remise à zéro dès qu'une image est lue correctement
                        consecutive_failures = 0

                        # Inférence
                        detections = await asyncio.to_thread(
                            detector_service.detect, frame
                        )
                        if not detections:
                            continue

                        for detection in detections:
                            payload = {
                                "camera_id": self.camera_id,
                                "event": "fire_detected",
                                "model_version": detection.get(
                                    "model_version", settings.MODEL_TYPE
                                ),
                                "confidence": detection["confidence"],
                                "bbox": detection["bbox"],
                                "label": detection.get("label", "fire"),
                                "timestamp": detection["timestamp"],
                            }
                            await nats_client.publish(self.subject, payload)

                finally:
                    # Toujours libérer le flux corrompu avant d'en rouvrir un neuf
                    await asyncio.to_thread(capture.release)

                # Petite pause avant de relancer une nouvelle tentative de connexion
                await asyncio.sleep(2.0)

        except asyncio.CancelledError:
            logger.info("Stream worker cancelled for camera %s", self.camera_id)
            raise
        finally:
            logger.info("Stream worker stopped for camera %s", self.camera_id)