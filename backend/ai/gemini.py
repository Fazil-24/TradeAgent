import asyncio
import base64
import os
from pathlib import Path
from typing import List

import google.generativeai as genai

from ai.provider import AIProvider, AIResponse


class GeminiProvider(AIProvider):
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.text_model = genai.GenerativeModel("gemini-2.5-flash")
        self.vision_model = genai.GenerativeModel("gemini-2.5-flash")

    async def generate_text(self, prompt: str) -> AIResponse:
        try:
            response = await asyncio.to_thread(
                self.text_model.generate_content, prompt
            )
            return AIResponse(content=response.text, provider="gemini", success=True)
        except Exception:
            return AIResponse(content="", provider="gemini", success=False)

    async def analyze_images(self, image_paths: List[str], prompt: str) -> AIResponse:
        try:
            parts = [prompt]
            for path in image_paths:
                with open(path, "rb") as f:
                    img_data = base64.b64encode(f.read()).decode()
                ext = Path(path).suffix.lower().replace(".", "")
                mime = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
                parts.append({"mime_type": mime, "data": img_data})
            response = await asyncio.to_thread(
                self.vision_model.generate_content, parts
            )
            return AIResponse(content=response.text, provider="gemini", success=True)
        except Exception:
            return AIResponse(content="", provider="gemini", success=False)
