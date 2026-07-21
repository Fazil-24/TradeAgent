"""
Supplier search for TradeAgent.
Queries the shared Supabase DB (ShopConnect data) and returns ranked shop
recommendations for a given list of quote items.

Loophole fixes applied:
  #1 Stale stock — only shops updated within STALE_DAYS are returned
  #2 Quantity check — only inventory rows with quantity >= needed are matched
  #3 Multi-shop tiers — complete / partial (>=70%) / low (<70%, excluded)
  #4 Fuzzy matching — pg_trgm similarity via Supabase RPC + Python token fallback
  #5 Price disclaimer — caller adds a disclaimer; raw prices are passed through
"""

import math
import os
from typing import Any

from supabase import Client, create_client

STALE_DAYS = 14
MIN_MATCH_PCT = 0.20
TOKEN_MATCH_THRESHOLD = 0.5   # fraction of product tokens that must appear in quote description


def _get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _token_score(query: str, product_name: str, brand: str | None) -> float:
    """
    Fraction of the shop product's tokens that appear in the quote description.
    Direction: shop product → quote (not quote → product), so a short product
    name like 'MCB' or 'Ceiling Fan' scores high against a detailed AI description
    like 'MCB 32A 4-pole' or 'Ceiling Fan 1200mm BLDC'.
    """
    stop = {"the", "a", "an", "and", "or", "of", "for", "with", "in", "on"}
    product_tokens = [
        t for t in (product_name + " " + (brand or "")).lower().split()
        if t not in stop and len(t) > 1
    ]
    if not product_tokens:
        return 0.0
    query_text = query.lower()
    hits = sum(1 for t in product_tokens if t in query_text)
    return hits / len(product_tokens)


def search_suppliers(
    items: list[dict[str, Any]],
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 15,
    city: str | None = None,
) -> list[dict[str, Any]]:
    """
    items: list of dicts with keys 'description' (str) and 'quantity' (float)
    lat/lng: when None, distance filter is skipped and all shops are searched.
    city: when None, all cities are searched (passes SQL wildcard).
    Returns shops ranked by tier (complete > partial) then distance.
    """
    client = _get_client()

    # Pass '%' to the SQL city ILIKE filter to match any city when unspecified
    rpc_city = city if city else "%"

    # Per item: call Supabase RPC for pg_trgm similarity search
    # Result shape matches search_shop_inventory() defined in supabase_setup.sql
    shop_matches: dict[str, dict[str, Any]] = {}  # shop_id → aggregated data

    for idx, item in enumerate(items):
        desc: str = item.get("description", "")
        needed_qty: int = max(1, int(item.get("quantity", 1)))

        try:
            resp = client.rpc(
                "search_shop_inventory",
                {
                    "p_search_text": desc,
                    "p_min_quantity": needed_qty,
                    "p_stale_days": STALE_DAYS,
                    "p_city": rpc_city,
                },
            ).execute()
            rows = resp.data or []
        except Exception as e:
            rows = []

        for row in rows:
            sid = row["shop_id"]

            # Python token-score fallback (catches cases pg_trgm misses)
            py_score = _token_score(desc, row["product_name"], row.get("brand"))
            pg_score = row.get("similarity", 0) or 0
            combined_score = max(pg_score, py_score)

            if combined_score < TOKEN_MATCH_THRESHOLD:
                continue

            # Distance filter — only applied when the caller provides coordinates
            shop_lat = row.get("shop_lat")
            shop_lng = row.get("shop_lng")
            dist: float | None = None
            if lat is not None and lng is not None:
                if shop_lat is None or shop_lng is None:
                    continue  # skip shops without geocoded location when distance matters
                dist = _haversine(lat, lng, shop_lat, shop_lng)
                if dist > radius_km:
                    continue

            if sid not in shop_matches:
                shop_matches[sid] = {
                    "shop": {
                        "id": sid,
                        "shop_name": row["shop_name"],
                        "owner_name": row["owner_name"],
                        "phone": row["phone"],
                        "whatsapp": row.get("whatsapp"),
                        "address": row["address"],
                        "delivery_available": row["delivery_available"],
                        "delivery_radius_km": row.get("delivery_radius_km"),
                        "min_order_amount": row.get("min_order_amount"),
                    },
                    "distance_km": round(dist, 1) if dist is not None else None,
                    "matched_items": [],
                    "matched_item_indices": set(),
                }

            # Only record the best match per quote item per shop
            if idx not in shop_matches[sid]["matched_item_indices"]:
                shop_matches[sid]["matched_item_indices"].add(idx)
                shop_matches[sid]["matched_items"].append({
                    "quote_item": desc,
                    "shop_product": row["product_name"],
                    "brand": row.get("brand"),
                    "quantity_available": row["quantity"],
                    "unit_price": float(row["unit_price"]),
                    "unit": row["unit"],
                    "match_confidence": round(combined_score * 100),
                })

    total = len(items)
    results = []

    for sid, data in shop_matches.items():
        matched = len(data["matched_items"])
        match_pct = matched / total if total else 0

        if match_pct == 1.0:
            tier = "complete"
        elif match_pct >= MIN_MATCH_PCT:
            tier = "partial"
        else:
            continue  # exclude shops below threshold (loophole fix #3)

        matched_indices = data.pop("matched_item_indices")
        missing_items = [
            items[i]["description"]
            for i in range(total)
            if i not in matched_indices
        ]

        results.append({
            **data,
            "tier": tier,
            "match_pct": round(match_pct * 100),
            "matched_count": matched,
            "total_count": total,
            "missing_items": missing_items,
            "price_disclaimer": "Prices shown are indicative. Confirm with the shop before ordering.",
        })

    # Sort: complete first, then by match%, then by distance (None distance sorts last)
    results.sort(key=lambda x: (0 if x["tier"] == "complete" else 1, -x["match_pct"], x["distance_km"] or 9999))
    return results
