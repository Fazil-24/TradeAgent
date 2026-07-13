from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List


@dataclass
class AIResponse:
    content: str
    provider: str  # "gemini" or "cerebras" — never shown to user
    success: bool


class AIProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str) -> AIResponse:
        ...

    @abstractmethod
    async def analyze_images(self, image_paths: List[str], prompt: str) -> AIResponse:
        ...
