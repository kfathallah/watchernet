from __future__ import annotations

import json
import logging
from typing import Any

from nats.aio.client import Client as NATS

from app.core.config import settings


logger = logging.getLogger(__name__)


class NATSClient:
    """Persistent async NATS client with reconnect support."""

    def __init__(self) -> None:
        self._client = NATS()
        self._connected = False

    @property
    def client(self) -> NATS:
        return self._client

    @property
    def connected(self) -> bool:
        return self._connected and self._client.is_connected

    async def connect(self) -> None:
        if self.connected:
            return

        await self._client.connect(
            servers=[settings.NATS_URL],
            reconnect_time_wait=2,
            max_reconnect_attempts=-1,
            allow_reconnect=True,
            name="watchernet-inference",
        )
        self._connected = True
        logger.info("Connected to NATS at %s", settings.NATS_URL)

    async def close(self) -> None:
        if self._client.is_connected:
            await self._client.drain()
        self._connected = False

    async def publish(self, subject: str, payload: dict[str, Any]) -> None:
        if not self.connected:
            await self.connect()

        message = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        await self._client.publish(subject, message)


nats_client = NATSClient()
