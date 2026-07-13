import re
from typing import List, Tuple

from sqlalchemy.orm import Session

from models import Quote


def generate_quote_number(db: Session) -> str:
    # quote_number is globally unique in the schema (not scoped per user),
    # so the next number must be derived from the highest existing number
    # across ALL users — a per-user count would let two different users'
    # first quotes both land on "QT-0001" and collide. Taking the max
    # (rather than a row count) also survives quotes being deleted, since a
    # count would shrink and could reissue an already-used number.
    max_n = 0
    for (existing_number,) in db.query(Quote.quote_number).all():
        match = re.match(r"QT-(\d+)", existing_number or "")
        if match:
            max_n = max(max_n, int(match.group(1)))
    return f"QT-{max_n + 1:04d}"


def calculate_totals(
    items: List[dict], tax_rate: float, discount: float
) -> Tuple[float, float, float]:
    subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
    tax_amount = subtotal * (tax_rate / 100)
    total = subtotal + tax_amount - discount
    return round(subtotal, 2), round(tax_amount, 2), round(total, 2)


def normalize_items(items: List[dict]) -> List[dict]:
    """Recompute each line's total from qty * unit_price so the stored
    total always matches the displayed line items."""
    normalized = []
    for item in items:
        total = round(item["quantity"] * item["unit_price"], 2)
        normalized.append({**item, "total": total})
    return normalized
