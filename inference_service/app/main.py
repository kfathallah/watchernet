from __future__ import annotations

import asyncio
import logging
import signal
from contextlib import suppress

import httpx
import numpy as np

from app.core.config import settings
from app.core.nats_client import nats_client
from app.core.onnx_engine import onnx_engine
from app.services.stream_worker import StreamWorker


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("watchernet.inference")

BACKEND_API_URL = "http://backend:8000"


async def _load_active_camera_ids() -> list[str]:
    async with httpx.AsyncClient(base_url=BACKEND_API_URL, timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0)) as client:
        response = await client.get("/api/cameras")
        response.raise_for_status()
        cameras = response.json()

    return [camera["id"] for camera in cameras if camera.get("active")]


async def _warm_up_engine() -> None:
    warmup_frame = np.zeros((640, 640, 3), dtype=np.uint8)
    await asyncio.to_thread(onnx_engine.predict, warmup_frame)


async def _start_workers(camera_ids: list[str]) -> list[asyncio.Task[None]]:
    tasks: list[asyncio.Task[None]] = []
    for camera_id in camera_ids:
        task = asyncio.create_task(StreamWorker(camera_id).run(), name=f"stream-worker:{camera_id}")
        tasks.append(task)
        logger.info("Stream worker scheduled for camera %s", camera_id)
    return tasks


async def _shutdown_workers(tasks: list[asyncio.Task[None]]) -> None:
    for task in tasks:
        task.cancel()

    for task in tasks:
        with suppress(asyncio.CancelledError):
            await task


async def main() -> None:
    logger.info(
        "Inference service started with model=%s type=%s nats=%s rtsp=%s fps=%s threshold=%s",
        settings.MODEL_PATH,
        settings.MODEL_TYPE,
        settings.NATS_URL,
        settings.MEDIAMTX_RTSP_URL,
        settings.FPS_SAMPLING,
        settings.CONFIDENCE_THRESHOLD,
    )

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    workers: list[asyncio.Task[None]] = []

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            pass

    await nats_client.connect()
    logger.info("NATS client connected")

    await _warm_up_engine()
    logger.info("ONNX engine warmed up")

    try:
        camera_ids = await _load_active_camera_ids()
        logger.info("%d active camera(s) loaded from backend", len(camera_ids))
        workers = await _start_workers(camera_ids)

        await stop_event.wait()
    finally:
        await _shutdown_workers(workers)
        await nats_client.close()


if __name__ == "__main__":
    asyncio.run(main())