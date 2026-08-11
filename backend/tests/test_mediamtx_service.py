import pytest
import httpx
from unittest.mock import AsyncMock

from app.services.mediamtx import MediaMTXService, mediamtx_service


@pytest.mark.asyncio
async def test_add_path_success(monkeypatch):
    service = MediaMTXService()
    class DummyResponse:
        def raise_for_status(self):
            return None

    async def fake_post(self, url, json=None):
        return DummyResponse()

    service._client = type("DummyClient", (), {"post": fake_post})()
    await service.add_path("cam1", "rtsp://example.com/stream")


@pytest.mark.asyncio
async def test_list_paths_returns_empty_on_error(monkeypatch):
    service = MediaMTXService()

    async def fake_get(self, url):
        raise httpx.RequestError("boom")

    service._client = type("DummyClient", (), {"get": fake_get})()
    result = await service.list_paths()
    assert result == []
