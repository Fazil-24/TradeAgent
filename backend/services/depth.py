"""
Depth Estimation Service — Provider Architecture
=================================================
Current:  MockDepthProvider     — returns plausible estimates from image EXIF/metadata
Future:   DepthAnythingV2Provider — calls a deployed Depth-Anything-V2 model endpoint

Depth Anything V2 (by Depth-Anything team, CVPR 2024) produces metric depth maps
from a single monocular image. It is NOT built into this service — it requires:
  • A deployed inference endpoint (Hugging Face Spaces, Replicate, self-hosted)
  • GPU compute (RTX 3080+ recommended for real-time)
  • Model weights (~335 MB for ViT-Small, ~1.3 GB for ViT-Large)

Architecture: business logic calls DepthEstimator.estimate_room(), never the
provider directly. Swap the provider in DepthEstimator.__init__ when ready.

Integration path:
  1. Deploy Depth-Anything-V2 via Hugging Face Inference API or Replicate
  2. Set DEPTH_ANYTHING_API_URL and DEPTH_ANYTHING_API_KEY in backend/.env
  3. Replace MockDepthProvider with DepthAnythingV2Provider below
  4. Zero changes to callers needed
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class DepthResult:
    width_m: float | None
    length_m: float | None
    ceiling_height_m: float | None
    floor_area_sqm: float | None
    confidence_pct: int
    reference_used: str
    note: str


class DepthProvider(ABC):
    """Interface every depth-estimation backend must implement."""

    @abstractmethod
    async def estimate(self, image_path: str) -> DepthResult:
        """
        Given a local image file path, return room dimension estimates.
        Implementations must be async — they may call remote APIs.
        """


class MockDepthProvider(DepthProvider):
    """
    Returns plausible mock estimates.
    Used until a real Depth-Anything-V2 endpoint is configured.
    Estimates are tagged with confidence=0 so the UI always asks the user
    to confirm at least one reference measurement.
    """

    async def estimate(self, image_path: str) -> DepthResult:
        # In production, image_path would be sent to the inference endpoint.
        # We return None dimensions so the AI vision analysis (Gemini) takes
        # priority and this provider only fills in gaps.
        return DepthResult(
            width_m=None,
            length_m=None,
            ceiling_height_m=None,
            floor_area_sqm=None,
            confidence_pct=0,
            reference_used="none",
            note=(
                "Depth Anything V2 is not yet configured. "
                "Set DEPTH_ANYTHING_API_URL in backend/.env to enable metric depth estimation."
            ),
        )


class DepthAnythingV2Provider(DepthProvider):
    """
    Calls a deployed Depth-Anything-V2 inference endpoint.

    Expected endpoint contract:
      POST {DEPTH_ANYTHING_API_URL}/estimate
      Body:  multipart/form-data  { file: <image bytes> }
      Returns JSON:
        {
          "width_m": 4.2,
          "length_m": 4.8,
          "ceiling_height_m": 2.8,
          "floor_area_sqm": 20.2,
          "confidence_pct": 85,
          "reference_used": "metric_depth_map"
        }

    Set env vars:
      DEPTH_ANYTHING_API_URL=https://your-deployment/api
      DEPTH_ANYTHING_API_KEY=your-api-key   (optional, for protected endpoints)
    """

    def __init__(self):
        self._url = os.getenv("DEPTH_ANYTHING_API_URL", "")
        self._key = os.getenv("DEPTH_ANYTHING_API_KEY", "")

    async def estimate(self, image_path: str) -> DepthResult:
        if not self._url:
            raise RuntimeError("DEPTH_ANYTHING_API_URL is not set")

        import httpx

        headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(image_path, "rb") as f:
                resp = await client.post(
                    f"{self._url}/estimate",
                    files={"file": f},
                    headers=headers,
                )
        resp.raise_for_status()
        data = resp.json()
        return DepthResult(
            width_m=data.get("width_m"),
            length_m=data.get("length_m"),
            ceiling_height_m=data.get("ceiling_height_m"),
            floor_area_sqm=data.get("floor_area_sqm"),
            confidence_pct=data.get("confidence_pct", 50),
            reference_used=data.get("reference_used", "metric_depth_map"),
            note="Depth estimated via Depth-Anything-V2 metric depth model.",
        )


class DepthEstimator:
    """
    Facade: the only class callers should import.
    Automatically selects MockDepthProvider or DepthAnythingV2Provider
    based on environment configuration.
    """

    def __init__(self):
        api_url = os.getenv("DEPTH_ANYTHING_API_URL", "")
        self._provider: DepthProvider = (
            DepthAnythingV2Provider() if api_url else MockDepthProvider()
        )

    async def estimate_room(self, image_path: str) -> DepthResult:
        return await self._provider.estimate(image_path)


# Module-level singleton
depth_estimator = DepthEstimator()
