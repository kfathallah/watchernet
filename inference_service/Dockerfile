FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NATS_URL=nats://watchernet_nats:4222 \
    MEDIAMTX_RTSP_URL=rtsp://mediamtx:8554 \
    MODEL_PATH=/app/models/best_mlops.onnx \
    MODEL_TYPE=yolov26 \
    CONFIDENCE_THRESHOLD=0.5 \
    FPS_SAMPLING=5 \
    PATH="/usr/local/bin:${PATH}"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libsm6 libxext6 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1001 --shell /bin/bash appuser \
    && mkdir -p /app/models /app/app \
    && chown -R appuser:appuser /app

COPY --from=builder /install /usr/local
COPY app/ /app/app/
COPY models/ /app/models/

USER 1001

CMD ["python", "-m", "app.main"]