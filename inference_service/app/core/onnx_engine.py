from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from app.core.config import settings


class ONNXEngine:
    """Singleton wrapper around a single ONNX Runtime inference session."""

    _instance: ONNXEngine | None = None
    _lock = threading.Lock()

    def __new__(cls) -> ONNXEngine:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        model_path = Path(settings.MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(f"ONNX model not found at {model_path}")

        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self._session = ort.InferenceSession(
            str(model_path),
            sess_options=session_options,
            providers=["CPUExecutionProvider"],
        )
        self._input_name = self._session.get_inputs()[0].name
        self._output_names = [output.name for output in self._session.get_outputs()]
        self._input_height = 640
        self._input_width = 640
        self._confidence_threshold = float(settings.CONFIDENCE_THRESHOLD)
        self._initialized = True

    @property
    def session(self) -> ort.InferenceSession:
        return self._session

    def preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Convert a BGR OpenCV frame into a normalized batch tensor."""
        if frame is None:
            raise ValueError("frame cannot be None")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized_frame = cv2.resize(rgb_frame, (self._input_width, self._input_height), interpolation=cv2.INTER_LINEAR)
        normalized_frame = resized_frame.astype(np.float32) / 255.0
        chw_frame = np.transpose(normalized_frame, (2, 0, 1))
        return np.expand_dims(chw_frame, axis=0)

    def postprocess(self, outputs: Any, w_orig: int, h_orig: int) -> list[dict[str, Any]]:
        """Decode YOLOv26 [1, 300, 6] output into structured detections."""
        tensor = self._extract_tensor(outputs)
        if tensor.size == 0:
            return []

        if tensor.ndim == 3 and tensor.shape[0] == 1:
            tensor = tensor[0]

        detections: list[dict[str, Any]] = []
        scale_x = w_orig / float(self._input_width)
        scale_y = h_orig / float(self._input_height)

        for row in tensor:
            if row.shape[0] < 6:
                continue

            xmin, ymin, xmax, ymax, confidence, class_id = row[:6]
            confidence_value = float(confidence)
            if confidence_value < self._confidence_threshold:
                continue

            x1 = max(0.0, min(float(w_orig), float(xmin) * scale_x))
            y1 = max(0.0, min(float(h_orig), float(ymin) * scale_y))
            x2 = max(0.0, min(float(w_orig), float(xmax) * scale_x))
            y2 = max(0.0, min(float(h_orig), float(ymax) * scale_y))

            detections.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "confidence": confidence_value,
                    "class_id": int(class_id),
                }
            )

        return detections

    def predict(self, frame: np.ndarray) -> list[dict[str, Any]]:
        """Run the complete preprocessing, inference and postprocessing pipeline."""
        original_height, original_width = frame.shape[:2]
        input_tensor = self.preprocess(frame)
        raw_outputs = self._session.run(self._output_names, {self._input_name: input_tensor})
        return self.postprocess(raw_outputs, original_width, original_height)

    @staticmethod
    def _extract_tensor(outputs: Any) -> np.ndarray:
        if isinstance(outputs, np.ndarray):
            return outputs

        if isinstance(outputs, (list, tuple)):
            if not outputs:
                return np.empty((0, 6), dtype=np.float32)
            first_output = outputs[0]
            if isinstance(first_output, np.ndarray):
                return first_output
            return np.asarray(first_output)

        if isinstance(outputs, dict):
            first_value = next(iter(outputs.values()), None)
            if first_value is None:
                return np.empty((0, 6), dtype=np.float32)
            return np.asarray(first_value)

        return np.asarray(outputs)


onnx_engine = ONNXEngine()
