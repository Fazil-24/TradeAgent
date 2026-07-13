import json
import re
from typing import List, Optional

from ai.cerebras import CerebrasProvider
from ai.gemini import GeminiProvider


class AIRouter:
    def __init__(self):
        self.primary = GeminiProvider()
        self.fallback = CerebrasProvider()

    async def run(self, prompt: str, images: Optional[List[str]] = None) -> str:
        if images:
            result = await self.primary.analyze_images(images, prompt)
        else:
            result = await self.primary.generate_text(prompt)

        if result.success:
            return result.content

        print("[AI] Gemini failed, switching to Cerebras")  # server log only
        result = await self.fallback.generate_text(prompt)

        if result.success:
            return result.content

        raise Exception("Both AI providers failed")


def _extract_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(raw)


# ── AGENT 1: Photo Analyzer ─────────────────────────────────
PHOTO_ANALYSIS_PROMPT = """
You are an expert electrician estimator. Analyze these job site photos.

Return ONLY valid JSON (no markdown, no explanation):
{{
  "job_type": "string describing the electrical job",
  "observations": ["list", "of", "what", "you", "see"],
  "items": [
    {{
      "description": "item description",
      "quantity": 1,
      "unit": "unit/hr/piece/set",
      "unit_price": 0,
      "total": 0
    }}
  ],
  "labor_hours": 0,
  "complexity": "low/medium/high",
  "safety_notes": ["list of safety considerations"],
  "disclaimer": "These are AI estimates. Please review before sending."
}}

Job description provided: {job_description}
Language: Respond with descriptions in {language}
Currency: Prices in {currency}
"""


async def analyze_photos(
    router: AIRouter,
    image_paths: list,
    job_desc: str,
    language: str,
    currency: str,
) -> dict:
    prompt = PHOTO_ANALYSIS_PROMPT.format(
        job_description=job_desc, language=language, currency=currency
    )
    result = await router.run(prompt, images=image_paths)
    return _extract_json(result)


# ── AGENT 2: Text-Only Quote Generator ──────────────────────
QUOTE_TEXT_PROMPT = """
You are an expert electrician estimator.
Generate a detailed quotation based on this job description.

Job: {job_title}
Description: {job_description}
Customer location: {location}

Return ONLY valid JSON:
{{
  "items": [
    {{
      "description": "item description",
      "quantity": 1,
      "unit": "unit/hr/piece",
      "unit_price": 0,
      "total": 0
    }}
  ],
  "labor_hours": 0,
  "complexity": "low/medium/high",
  "notes": "any important notes",
  "disclaimer": "AI estimates — please review before sending"
}}

Language: {language}
Currency: {currency}
"""


async def generate_quote_from_text(
    router: AIRouter,
    title: str,
    description: str,
    location: str,
    language: str,
    currency: str,
) -> dict:
    prompt = QUOTE_TEXT_PROMPT.format(
        job_title=title,
        job_description=description,
        location=location or "not specified",
        language=language,
        currency=currency,
    )
    result = await router.run(prompt)
    return _extract_json(result)


# ── AGENT 3: WhatsApp Message Generator ─────────────────────
WA_PROMPT = """
Write a professional WhatsApp message in {language} for sending a quotation.
Business: {business_name}
Customer: {customer_name}
Quote #: {quote_number}
Total: {total} {currency}
Valid until: {valid_until}

Keep it short, friendly, professional. Under 150 words.
End with asking them to approve by replying "YES" or "APPROVED".
"""


async def generate_whatsapp_message(router: AIRouter, **kwargs) -> str:
    prompt = WA_PROMPT.format(**kwargs)
    return await router.run(prompt)


# ── AGENT 4: Invoice Message Generator ──────────────────────
INVOICE_PROMPT = """
Write a short payment reminder WhatsApp message in {language}.
Business: {business_name}
Customer: {customer_name}
Invoice #: {invoice_number}
Amount due: {amount} {currency}
Due date: {due_date}

Professional, polite, clear. Under 100 words.
"""


async def generate_invoice_message(router: AIRouter, **kwargs) -> str:
    prompt = INVOICE_PROMPT.format(**kwargs)
    return await router.run(prompt)
