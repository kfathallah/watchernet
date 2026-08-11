import os
import sys
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGO_DB_NAME", "watchernet_test")
os.environ.setdefault("MEDIAMTX_API_URL", "http://mediamtx:9997")


@pytest_asyncio.fixture
async def db_mock():
    client = AsyncMongoMockClient()
    db = client["watchernet_test"]
    yield db


@pytest.fixture
def client(monkeypatch):
    import app.main as app_main
    from app import database
    from app.main import app as fastapi_app
    from app.routers import cameras

    async def fake_connect_db():
        database._client = AsyncMongoMockClient()

    async def fake_close_db():
        database._client = None

    def fake_get_database():
        return database._client["watchernet_test"]

    monkeypatch.setattr(database, "connect_db", fake_connect_db)
    monkeypatch.setattr(database, "close_db", fake_close_db)
    monkeypatch.setattr(database, "get_database", fake_get_database)
    monkeypatch.setattr(cameras, "get_database", fake_get_database)
    monkeypatch.setattr(app_main, "connect_db", fake_connect_db)
    monkeypatch.setattr(app_main, "close_db", fake_close_db)
    monkeypatch.setattr(app_main, "get_database", fake_get_database)

    with TestClient(fastapi_app) as test_client:
        yield test_client
