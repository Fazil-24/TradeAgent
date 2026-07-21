"""
Product Catalog Service — Provider Architecture
===============================================
Current:  MockProductProvider  (returns curated mock data)
Future:   AmazonProvider, FlipkartProvider, IndiaMARTProvider,
          LocalSupplierProvider, ERPProvider

Business logic never calls providers directly — it uses ProductCatalog,
so swapping providers requires no changes to callers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


# ── Domain model ──────────────────────────────────────────────

@dataclass
class Product:
    id: str
    name: str
    brand: str
    category: str          # ceiling_fan | switch | socket | light | mcb | wire | conduit
    price: float
    currency: str
    wattage: int           # power consumption in watts
    warranty_years: int
    star_rating: float     # energy star rating (1–5)
    image_url: str         # placeholder / CDN URL
    features: list[str]
    pros: list[str]
    cons: list[str]
    tags: list[str]        # economy | value | premium | trending | bldc | wifi | energy_saving
    available: bool = True
    sweep_mm: int | None = None       # ceiling fans only
    lumens: int | None = None         # lights only
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "price": self.price,
            "currency": self.currency,
            "wattage": self.wattage,
            "warranty_years": self.warranty_years,
            "star_rating": self.star_rating,
            "image_url": self.image_url,
            "features": self.features,
            "pros": self.pros,
            "cons": self.cons,
            "tags": self.tags,
            "sweep_mm": self.sweep_mm,
            "lumens": self.lumens,
            "available": self.available,
            **self.extra,
        }


# ── Provider interface ─────────────────────────────────────────

class ProductProvider(ABC):
    """
    Interface every product data source must implement.
    Live providers (Amazon, Flipkart, IndiaMart) will replace the mock
    without changing any calling code.
    """

    @abstractmethod
    def search(
        self,
        category: str,
        budget: str = "value",
        brand: str | None = None,
        tags: list[str] | None = None,
        sweep_mm: int | None = None,
    ) -> list[Product]:
        """Return products matching the filters, best match first."""


# ── Mock provider — used until live providers are integrated ──

_MOCK_CATALOG: list[Product] = [
    # ── Ceiling Fans ──────────────────────────────────────────
    Product(
        id="cf-001", name="Havells Efficiencia Neo", brand="Havells",
        category="ceiling_fan", price=3299, currency="INR",
        wattage=28, warranty_years=2, star_rating=5, sweep_mm=1200,
        image_url="/product-images/havells-efficiencia-neo.jpg",
        features=["BLDC Motor", "5-Star BEE Rating", "Remote Control Ready", "Silent Operation"],
        pros=["Lowest power consumption (28W)", "Very silent", "Long-lasting motor"],
        cons=["Higher upfront cost", "Remote sold separately"],
        tags=["value", "energy_saving", "bldc", "5star"],
    ),
    Product(
        id="cf-002", name="Atomberg Renesa+", brand="Atomberg",
        category="ceiling_fan", price=4499, currency="INR",
        wattage=28, warranty_years=3, star_rating=5, sweep_mm=1200,
        image_url="/product-images/atomberg-renesa-plus.jpg",
        features=["BLDC Motor", "Built-in Remote", "Sleep Mode", "Boost Mode", "LED Indicator"],
        pros=["Remote included", "Best-in-class warranty", "Smart sleep mode"],
        cons=["Most expensive in segment", "Remote battery needs replacement"],
        tags=["premium", "energy_saving", "bldc", "remote", "trending"],
    ),
    Product(
        id="cf-003", name="Crompton Energion HS", brand="Crompton",
        category="ceiling_fan", price=2799, currency="INR",
        wattage=35, warranty_years=2, star_rating=5, sweep_mm=1200,
        image_url="/product-images/crompton-energion-hs.jpg",
        features=["BLDC Motor", "5-Star Rating", "High Speed Option"],
        pros=["Good brand trust", "Affordable BLDC option", "High airflow"],
        cons=["No remote included", "Slightly higher wattage than competitors"],
        tags=["value", "energy_saving", "bldc"],
    ),
    Product(
        id="cf-004", name="Orient Electric Apex-FX", brand="Orient",
        category="ceiling_fan", price=1799, currency="INR",
        wattage=75, warranty_years=2, star_rating=3, sweep_mm=1200,
        image_url="/product-images/orient-apex-fx.jpg",
        features=["Induction Motor", "3-Speed Control", "Durable"],
        pros=["Very affordable", "Reliable brand", "Easy to find spares"],
        cons=["Higher power consumption", "No energy saving features"],
        tags=["economy"],
    ),
    Product(
        id="cf-005", name="Bajaj Frore", brand="Bajaj",
        category="ceiling_fan", price=2199, currency="INR",
        wattage=55, warranty_years=2, star_rating=4, sweep_mm=1200,
        image_url="/product-images/bajaj-frore.jpg",
        features=["4-Star BEE Rating", "Anti-dust Coating", "Silent"],
        pros=["Good mid-range option", "Anti-dust blades", "Silent operation"],
        cons=["Not BLDC", "Medium power consumption"],
        tags=["value"],
    ),
    # 1050mm variants
    Product(
        id="cf-006", name="Havells Efficiencia Neo 1050", brand="Havells",
        category="ceiling_fan", price=3099, currency="INR",
        wattage=25, warranty_years=2, star_rating=5, sweep_mm=1050,
        image_url="/product-images/havells-efficiencia-neo-1050.jpg",
        features=["BLDC Motor", "5-Star BEE Rating", "Silent Operation"],
        pros=["Ideal for medium rooms", "Very energy efficient"],
        cons=["Remote sold separately"],
        tags=["value", "energy_saving", "bldc", "5star"],
    ),
    # ── Wall Switches ─────────────────────────────────────────
    Product(
        id="sw-001", name="Havells Oro 6A Switch", brand="Havells",
        category="switch", price=180, currency="INR",
        wattage=0, warranty_years=3, star_rating=0, sweep_mm=None,
        image_url="/product-images/havells-oro-switch.jpg",
        features=["Robust Rocker", "Child-safe design", "Fire-retardant body"],
        pros=["Long-lasting", "Smooth operation", "Good aesthetics"],
        cons=["Slightly pricier than basic switches"],
        tags=["value", "premium"],
    ),
    Product(
        id="sw-002", name="Legrand Mylinc 6A Switch", brand="Legrand",
        category="switch", price=280, currency="INR",
        wattage=0, warranty_years=5, star_rating=0, sweep_mm=None,
        image_url="/product-images/legrand-mylinc-switch.jpg",
        features=["European design", "5-year warranty", "Modular"],
        pros=["Best quality", "Longest warranty", "Premium feel"],
        cons=["Most expensive", "May need matching plate separately"],
        tags=["premium"],
    ),
    Product(
        id="sw-003", name="Anchor Roma 6A Switch", brand="Anchor",
        category="switch", price=85, currency="INR",
        wattage=0, warranty_years=1, star_rating=0, sweep_mm=None,
        image_url="/product-images/anchor-roma-switch.jpg",
        features=["Basic rocker", "Wide availability"],
        pros=["Very affordable", "Available everywhere"],
        cons=["Basic quality", "Short warranty"],
        tags=["economy"],
    ),
    # ── Sockets ───────────────────────────────────────────────
    Product(
        id="so-001", name="Havells Oro 16A Socket", brand="Havells",
        category="socket", price=220, currency="INR",
        wattage=0, warranty_years=3, star_rating=0, sweep_mm=None,
        image_url="/product-images/havells-oro-socket.jpg",
        features=["16A rating", "Shutter protection", "Heavy duty"],
        pros=["Safe for high-wattage appliances", "Child-safe shutters"],
        cons=["More expensive than basic"],
        tags=["value", "premium"],
    ),
    Product(
        id="so-002", name="Schneider Opale 16A Socket", brand="Schneider",
        category="socket", price=350, currency="INR",
        wattage=0, warranty_years=5, star_rating=0, sweep_mm=None,
        image_url="/product-images/schneider-opale-socket.jpg",
        features=["16A", "Surge protection", "Modular design"],
        pros=["Built-in surge protection", "Premium finish"],
        cons=["Highest price in segment"],
        tags=["premium"],
    ),
    # ── LED Lights ────────────────────────────────────────────
    Product(
        id="led-001", name="Havells Adore 12W LED Downlight", brand="Havells",
        category="light", price=350, currency="INR",
        wattage=12, warranty_years=2, star_rating=5, lumens=960,
        image_url="/product-images/havells-adore-led.jpg",
        features=["960 Lumens", "Warm White / Cool White", "Energy saving"],
        pros=["Very bright for wattage", "Long life", "Good brand"],
        cons=["Fixed color temperature"],
        tags=["value", "energy_saving"],
    ),
    Product(
        id="led-002", name="Philips Deco Base B22 9W", brand="Philips",
        category="light", price=199, currency="INR",
        wattage=9, warranty_years=2, star_rating=5, lumens=810,
        image_url="/product-images/philips-deco-led.jpg",
        features=["810 Lumens", "Instant on", "Standard B22 base"],
        pros=["Affordable", "Easy replacement", "Trusted brand"],
        cons=["Not dimmable"],
        tags=["economy", "value"],
    ),
]


class MockProductProvider(ProductProvider):
    """
    Returns curated mock products from the in-memory catalog.
    Filters by category, then ranks by tag preference alignment.

    Replace with a live provider by injecting a different ProductProvider
    into ProductCatalog — no other code changes needed.
    """

    _BUDGET_TAG_ORDER = {
        "economy":  ["economy", "value", "premium", "trending"],
        "budget":   ["economy", "value", "premium", "trending"],
        "value":    ["value", "economy", "premium", "trending"],
        "premium":  ["premium", "trending", "value", "economy"],
        "luxury":   ["premium", "trending", "value", "economy"],
    }

    def search(
        self,
        category: str,
        budget: str = "value",
        brand: str | None = None,
        tags: list[str] | None = None,
        sweep_mm: int | None = None,
    ) -> list[Product]:
        pool = [p for p in _MOCK_CATALOG if p.category == category and p.available]

        # Sweep size filter for fans (allow ±150mm)
        if sweep_mm and category == "ceiling_fan":
            pool = [p for p in pool if p.sweep_mm and abs(p.sweep_mm - sweep_mm) <= 150]

        # Brand filter
        if brand and brand.lower() not in ("no preference", "none", ""):
            pool = [p for p in pool if p.brand.lower() == brand.lower()] or pool

        if not pool:
            return []

        # Rank by budget alignment
        tag_order = self._BUDGET_TAG_ORDER.get(budget.lower(), ["value", "economy", "premium"])

        def _score(p: Product) -> int:
            for rank, tag in enumerate(tag_order):
                if tag in p.tags:
                    return rank
            return len(tag_order)

        pool.sort(key=_score)
        return pool[:4]  # return top 4


# ── Catalog facade ────────────────────────────────────────────

class ProductCatalog:
    """
    Single entry point for product lookups.
    Swap provider in __init__ to go live without touching business logic.
    """

    def __init__(self, provider: ProductProvider | None = None):
        self._provider = provider or MockProductProvider()

    def get_recommendations(
        self,
        category: str,
        budget: str = "value",
        brand: str | None = None,
        feature_tags: list[str] | None = None,
        sweep_mm: int | None = None,
    ) -> list[dict]:
        products = self._provider.search(
            category=category,
            budget=budget,
            brand=brand,
            tags=feature_tags,
            sweep_mm=sweep_mm,
        )
        return [p.to_dict() for p in products]


# Module-level singleton — controllers import this
catalog = ProductCatalog()
