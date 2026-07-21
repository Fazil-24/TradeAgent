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

        print("[AI] Gemini failed, switching to Cerebras")
        result = await self.fallback.generate_text(prompt)

        if result.success:
            return result.content

        raise Exception("Both AI providers failed")


def _extract_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(raw)


# ── AGENT 1: Photo Analyzer (Enhanced with Component Detection) ──
PHOTO_ANALYSIS_PROMPT = """
You are an expert electrician estimator with computer vision capabilities.
Analyze these job site photos carefully and thoroughly.

STEP 1 — DETECT electrical components:
Look for: ceiling fan, wall switch, electrical socket/outlet, LED light / tube light / downlight,
distribution board / MCB box, PVC conduit / pipe, wiring / cables, exhaust fan,
water heater / geyser, air conditioner unit.

STEP 2 — ESTIMATE room dimensions using visual references:
- Standard door height = 7 ft / 2.1 m
- Standard floor tile = 600×600 mm or 800×800 mm (count tiles)
- Standard brick = 230×115 mm (if wall visible)
- Furniture proportions (sofa ~2m wide, bed ~1.5m wide)
Note what reference you used and give a confidence percentage.

STEP 3 — For ceiling fans: recommend sweep size based on room area:
- Under 100 sqft → 900mm sweep
- 100–150 sqft → 1050mm sweep
- 150–200 sqft → 1200mm sweep
- Over 200 sqft → 1400mm sweep or two fans

STEP 4 — Generate itemized quote with category tags.

Return ONLY valid JSON (no markdown, no explanation):
{{
  "job_type": "string describing the electrical job",
  "detected_components": [
    {{
      "type": "ceiling_fan",
      "label": "Ceiling Fan",
      "count": 1,
      "condition": "new_required",
      "notes": "Room appears to need a new ceiling fan",
      "sweep_recommendation_mm": 1200,
      "sweep_reason": "Room estimated at ~170 sqft, suitable for 1200mm sweep"
    }}
  ],
  "room_measurements": {{
    "estimated_width_m": 4.2,
    "estimated_length_m": 4.8,
    "estimated_ceiling_height_m": 2.8,
    "floor_area_sqm": 20.2,
    "wall_area_sqm": 44.8,
    "cable_length_estimate_m": 25.0,
    "conduit_length_estimate_m": 20.0,
    "reference_used": "door",
    "confidence_pct": 72,
    "confidence_note": "Estimated using door height as reference. Please confirm one wall measurement."
  }},
  "measurement_questions": [],
  "observations": ["list", "of", "what", "you", "see"],
  "items": [
    {{
      "description": "item description",
      "category": "material",
      "quantity": 1,
      "unit": "unit",
      "unit_price": 0,
      "total": 0,
      "brand_suggestion": null
    }}
  ],
  "labor_hours": 0,
  "complexity": "low",
  "safety_notes": ["list of safety considerations"],
  "notes": null,
  "disclaimer": "These are AI estimates based on visual analysis. Measurements are approximate. Please review before sending."
}}

category must be one of: material | labour | transport | accessory
condition must be one of: new_required | existing_good | existing_needs_replacement
If confidence_pct < 80, populate measurement_questions with 1-2 short questions like:
  "What is the height of the door in this room?"
  "What size are the floor tiles? (e.g. 2ft × 2ft)"
  "Can you measure one wall length?"

Job description provided: {job_description}
Language for item descriptions: {language}
Currency for prices: {currency}
"""


async def analyze_photos(
    router: AIRouter,
    image_paths: list,
    job_desc: str,
    language: str,
    currency: str,
) -> dict:
    prompt = PHOTO_ANALYSIS_PROMPT.format(
        job_description=job_desc or "Not provided",
        language=language,
        currency=currency,
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
  "job_type": "string",
  "detected_components": [],
  "room_measurements": null,
  "measurement_questions": [],
  "observations": ["what the job involves"],
  "items": [
    {{
      "description": "item description",
      "category": "material",
      "quantity": 1,
      "unit": "unit",
      "unit_price": 0,
      "total": 0,
      "brand_suggestion": null
    }}
  ],
  "labor_hours": 0,
  "complexity": "medium",
  "safety_notes": [],
  "notes": "any important notes",
  "disclaimer": "AI estimates — please review before sending"
}}

category must be one of: material | labour | transport | accessory
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


# ── AGENT 3: Product Recommendation Explainer ───────────────
RECOMMENDATION_PROMPT = """
You are an expert electrical product advisor helping an electrician recommend products to a customer.

A {component_type} has been detected in the job.
Room size: {room_area_sqft} sqft (approx.)
Customer budget preference: {budget}
Customer brand preference: {brand_preference}
Customer feature preferences: {features}

Product being considered:
Name: {product_name}
Brand: {brand}
Price: {currency} {price}
Power: {wattage}W
Warranty: {warranty} years

Explain in 2-3 short sentences (simple English, no jargon):
1. Why this product is recommended for this specific room
2. Why this price is justified
3. One key advantage over cheaper alternatives

Also compute:
- Monthly electricity cost at 8 hrs/day, Rs 8/unit (or local rate)
- 5-year running cost
- Annual savings vs a standard 75W equivalent

Return ONLY valid JSON:
{{
  "why_recommended": "string",
  "monthly_electricity_cost": 0.0,
  "annual_electricity_cost": 0.0,
  "five_year_running_cost": 0.0,
  "annual_savings_vs_standard": 0.0,
  "savings_explanation": "string"
}}
"""


async def explain_product_recommendation(
    router: AIRouter,
    component_type: str,
    room_area_sqft: float,
    budget: str,
    brand_preference: str,
    features: str,
    product_name: str,
    brand: str,
    price: float,
    wattage: int,
    warranty: int,
    currency: str,
) -> dict:
    prompt = RECOMMENDATION_PROMPT.format(
        component_type=component_type,
        room_area_sqft=room_area_sqft,
        budget=budget,
        brand_preference=brand_preference,
        features=features,
        product_name=product_name,
        brand=brand,
        price=price,
        wattage=wattage,
        warranty=warranty,
        currency=currency,
    )
    result = await router.run(prompt)
    return _extract_json(result)


# ── AGENT 4: WhatsApp Message Generator ─────────────────────
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


# ── AGENT 5: Invoice Message Generator ──────────────────────
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
