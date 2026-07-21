"""
Supplier Marketplace Architecture
==================================
This module defines the complete architecture for the TradeAgent Supplier Marketplace.
It is intentionally designed in layers so each phase can be implemented independently.

PHASE 1 (Current — Mock):
  Suppliers are hard-coded. No portal exists yet.
  TradeAgent generates quotes with mock prices + "prices are indicative" disclaimer.

PHASE 2 (Supplier Portal):
  Suppliers register, log in, and manage their inventory via a web portal.
  Electricians see real stock + prices when creating quotes.

PHASE 3 (Enterprise):
  Live distributor ERP integrations. Dynamic pricing. Delivery tracking.

Architecture overview
─────────────────────
  SupplierPortal          ← web app (React, separate from electrician app)
    ├── SupplierAuth      ← Firebase Auth or separate JWT
    ├── SupplierDashboard ← stats: views, quote requests, orders
    ├── InventoryManager  ← add/edit/remove products, set stock, set price
    ├── PricingEngine     ← base price, bulk discount, promo price, delivery cost
    └── OrderManager      ← receive and fulfil orders from electricians

  SupplierAPI             ← FastAPI router (separate prefix: /api/supplier/*)
    ├── POST /register    ← supplier self-registration
    ├── POST /login
    ├── GET  /dashboard
    ├── CRUD /inventory
    ├── GET  /orders
    └── PUT  /orders/{id}/fulfil

  SearchAPI               ← existing /api/suppliers/search (already implemented)
    └── Uses Supabase for fuzzy item matching + distance ranking

  ComparisonAPI           ← new: compare prices across suppliers for one quote
    └── POST /api/suppliers/compare

Database tables (Supabase)
──────────────────────────
  suppliers
    id, name, owner_name, email, phone, whatsapp, address, city,
    lat, lng, verified, active, rating, created_at

  supplier_inventory
    id, supplier_id, product_name, brand, category, sku,
    quantity, unit, unit_price, bulk_price, bulk_min_qty,
    updated_at   ← STALE_DAYS check uses this

  supplier_orders
    id, supplier_id, electrician_user_id, quote_id,
    items (JSON), status, total_amount,
    created_at, fulfilled_at

  supplier_promotions
    id, supplier_id, product_name_pattern, discount_pct,
    valid_from, valid_until

Provider pattern for price data
─────────────────────────────────
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SupplierListing:
    supplier_id: str
    supplier_name: str
    supplier_phone: str
    supplier_address: str
    distance_km: float
    product_name: str
    brand: str | None
    unit_price: float
    bulk_price: float | None
    bulk_min_qty: int | None
    quantity_available: int
    delivery_available: bool
    estimated_delivery_days: int | None
    match_confidence: int   # 0–100
    source: str             # "supabase" | "amazon" | "flipkart" | "indiamart"


class SupplierPriceProvider(ABC):
    """Every live price source implements this interface."""

    @abstractmethod
    async def search(
        self,
        item_description: str,
        quantity: int,
        city: str,
        lat: float | None,
        lng: float | None,
    ) -> list[SupplierListing]:
        """Return listings for one quote item, best match first."""


class MockSupplierProvider(SupplierPriceProvider):
    """Returns deterministic mock listings. Used until live providers are wired."""

    async def search(self, item_description, quantity, city, lat, lng):
        return [
            SupplierListing(
                supplier_id="mock-001",
                supplier_name="Bangalore Electrical Mart",
                supplier_phone="+91 98765 43210",
                supplier_address="MG Road, Bangalore",
                distance_km=2.4,
                product_name=item_description,
                brand=None,
                unit_price=0.0,
                bulk_price=None,
                bulk_min_qty=None,
                quantity_available=999,
                delivery_available=True,
                estimated_delivery_days=1,
                match_confidence=75,
                source="mock",
            )
        ]


class SupabaseSupplierProvider(SupplierPriceProvider):
    """
    Queries the Supabase DB via the existing search_suppliers RPC.
    This provider is already implemented in services/suppliers.py.
    This stub exists here for architectural clarity.
    """

    async def search(self, item_description, quantity, city, lat, lng):
        from services.suppliers import search_suppliers
        results = search_suppliers(
            items=[{"description": item_description, "quantity": quantity}],
            lat=lat or 12.9716,
            lng=lng or 77.5946,
            city=city,
        )
        listings = []
        for r in results:
            for mi in r.get("matched_items", []):
                listings.append(SupplierListing(
                    supplier_id=r["shop"]["id"],
                    supplier_name=r["shop"]["shop_name"],
                    supplier_phone=r["shop"]["phone"],
                    supplier_address=r["shop"]["address"],
                    distance_km=r["distance_km"],
                    product_name=mi["shop_product"],
                    brand=mi.get("brand"),
                    unit_price=mi["unit_price"],
                    bulk_price=None,
                    bulk_min_qty=None,
                    quantity_available=mi["quantity_available"],
                    delivery_available=r["shop"]["delivery_available"],
                    estimated_delivery_days=None,
                    match_confidence=mi["match_confidence"],
                    source="supabase",
                ))
        return listings


# ── Future providers (stubs only — implement when APIs are available) ──

class AmazonProvider(SupplierPriceProvider):
    """Amazon.in Product Advertising API — requires approved associate account."""
    async def search(self, *_, **__): raise NotImplementedError("AmazonProvider not yet integrated")


class FlipkartProvider(SupplierPriceProvider):
    """Flipkart Affiliate API — requires affiliate account and approval."""
    async def search(self, *_, **__): raise NotImplementedError("FlipkartProvider not yet integrated")


class IndiaMARTProvider(SupplierPriceProvider):
    """IndiaMart Lead Manager API — requires IndiaMart seller account."""
    async def search(self, *_, **__): raise NotImplementedError("IndiaMARTProvider not yet integrated")


# ── Comparison engine (used by /api/suppliers/compare) ────────

class SupplierComparison:
    """
    Aggregates results from multiple providers and ranks them.
    Electricians see: who has it, at what price, how far, how fast.
    """

    def __init__(self, providers: list[SupplierPriceProvider] | None = None):
        self._providers = providers or [MockSupplierProvider()]

    async def compare(
        self,
        items: list[dict[str, Any]],
        city: str = "Bangalore",
        lat: float | None = None,
        lng: float | None = None,
    ) -> dict[str, list[SupplierListing]]:
        """
        Returns { item_description: [SupplierListing, ...] }
        sorted by (price ASC, distance ASC).
        """
        result: dict[str, list[SupplierListing]] = {}
        for item in items:
            desc = item.get("description", "")
            qty = int(item.get("quantity", 1))
            listings: list[SupplierListing] = []
            for provider in self._providers:
                try:
                    found = await provider.search(desc, qty, city, lat, lng)
                    listings.extend(found)
                except NotImplementedError:
                    pass
                except Exception:
                    pass
            listings.sort(key=lambda x: (x.unit_price, x.distance_km))
            result[desc] = listings
        return result


# Module-level singleton
comparison_engine = SupplierComparison()
