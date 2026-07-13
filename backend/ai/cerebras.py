import os
from typing import List

import httpx
import truststore

# Windows + corporate proxy environments often intercept TLS with a root CA
# that isn't in the certifi bundle httpx uses by default. truststore routes
# certificate verification through the OS trust store instead.
truststore.inject_into_ssl()

from ai.provider import AIProvider, AIResponse


class CerebrasProvider(AIProvider):
    def __init__(self):
        self.api_key = os.getenv("CEREBRAS_API_KEY")
        self.base_url = "https://api.cerebras.ai/v1"
        self.model = "gpt-oss-120b"

    async def generate_text(self, prompt: str) -> AIResponse:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 2000,
                    },
                    timeout=30.0,
                )
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return AIResponse(content=content, provider="cerebras", success=True)
        except Exception:
            return AIResponse(content="", provider="cerebras", success=False)

    async def analyze_images(self, image_paths: List[str], prompt: str) -> AIResponse:
        # Cerebras has no vision — analyze with text description only
        text_prompt = (
            f"{prompt}\n\nNote: {len(image_paths)} photos were uploaded but vision "
            "analysis is unavailable. Generate estimates based on job description only."
        )
        return await self.generate_text(text_prompt)
