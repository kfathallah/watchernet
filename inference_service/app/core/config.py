from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    NATS_URL: str = Field(default="nats://watchernet_nats:4222")
    MEDIAMTX_RTSP_URL: str = Field(default="rtsp://mediamtx:8554")
    MODEL_PATH: str = Field(default="/app/models/best_mlops.onnx")
    MODEL_TYPE: str = Field(default="yolov26")
    CONFIDENCE_THRESHOLD: float = Field(default=0.5)
    FPS_SAMPLING: int = Field(default=5, ge=1)


settings = Settings()