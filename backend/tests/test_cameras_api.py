import pytest
from fastapi import status
from unittest.mock import AsyncMock

from app.services.mediamtx import mediamtx_service


@pytest.mark.asyncio
async def test_list_cameras_returns_empty_list(client):
    response = client.get("/api/cameras")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_camera_success(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "add_path", AsyncMock())

    response = client.post(
        "/api/cameras",
        json={"name": "Caméra 1", "url": "rtsp://example.com/stream", "active": True},
    )

    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["name"] == "Caméra 1"
    assert payload["active"] is True
    mediamtx_service.add_path.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_camera_invalid_url_returns_201_with_raw_string(client):
    response = client.post(
        "/api/cameras",
        json={"name": "Caméra 2", "url": "bad-url", "active": True},
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["url"] == "bad-url"


@pytest.mark.asyncio
async def test_get_camera_not_found_returns_404(client):
    response = client.get("/api/cameras/507f1f77bcf86cd799439011")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_get_camera_invalid_id_returns_400(client):
    response = client.get("/api/cameras/not-a-valid-object-id")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_update_camera_not_found_returns_404(client):
    response = client.put(
        "/api/cameras/507f1f77bcf86cd799439011",
        json={"name": "X"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_update_camera_with_no_fields_returns_existing(client):
    created = client.post(
        "/api/cameras",
        json={"name": "Caméra 3", "url": "rtsp://example.com/stream", "active": True},
    )
    camera_id = created.json()["id"]

    response = client.put(f"/api/cameras/{camera_id}", json={})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == "Caméra 3"


@pytest.mark.asyncio
async def test_update_camera_reactivates_and_re_registers_path(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "add_path", AsyncMock())
    monkeypatch.setattr(mediamtx_service, "delete_path", AsyncMock())

    created = client.post(
        "/api/cameras",
        json={"name": "Caméra 5", "url": "rtsp://example.com/stream", "active": False},
    )
    camera_id = created.json()["id"]

    response = client.put(f"/api/cameras/{camera_id}", json={"active": True})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["active"] is True
    assert mediamtx_service.add_path.await_count >= 1


@pytest.mark.asyncio
async def test_update_camera_url_changes_active_stream(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "add_path", AsyncMock())
    monkeypatch.setattr(mediamtx_service, "delete_path", AsyncMock())

    created = client.post(
        "/api/cameras",
        json={"name": "Caméra 6", "url": "rtsp://example.com/stream", "active": True},
    )
    camera_id = created.json()["id"]

    response = client.put(
        f"/api/cameras/{camera_id}",
        json={"url": "rtsp://example.com/new-stream"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["url"] == "rtsp://example.com/new-stream"
    mediamtx_service.delete_path.assert_awaited_once()
    assert mediamtx_service.add_path.await_count >= 1


@pytest.mark.asyncio
async def test_sync_cameras_endpoint(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "add_path", AsyncMock())

    client.post(
        "/api/cameras",
        json={"name": "Caméra 7", "url": "rtsp://example.com/stream", "active": True},
    )

    response = client.post("/api/cameras/sync")

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["synced_count"] == 1


@pytest.mark.asyncio
async def test_update_camera_success(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "add_path", AsyncMock())
    monkeypatch.setattr(mediamtx_service, "delete_path", AsyncMock())

    created = client.post(
        "/api/cameras",
        json={"name": "Caméra 3", "url": "rtsp://example.com/stream", "active": True},
    )
    camera_id = created.json()["id"]

    response = client.put(
        f"/api/cameras/{camera_id}",
        json={"active": False},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["active"] is False
    mediamtx_service.delete_path.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_camera_success(client, monkeypatch):
    monkeypatch.setattr(mediamtx_service, "delete_path", AsyncMock())

    created = client.post(
        "/api/cameras",
        json={"name": "Caméra 4", "url": "rtsp://example.com/stream", "active": True},
    )
    camera_id = created.json()["id"]

    response = client.delete(f"/api/cameras/{camera_id}")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    mediamtx_service.delete_path.assert_awaited_once()
