import re
from datetime import date, timedelta

from sqlalchemy.orm import Session

from models import Invoice, Quote


def generate_invoice_number(db: Session) -> str:
    # See generate_quote_number in services/quote.py for why this is a
    # global max-based scheme rather than a per-user row count.
    max_n = 0
    for (existing_number,) in db.query(Invoice.invoice_number).all():
        match = re.match(r"INV-(\d+)", existing_number or "")
        if match:
            max_n = max(max_n, int(match.group(1)))
    return f"INV-{max_n + 1:04d}"


def create_invoice_from_quote(db: Session, quote: Quote) -> Invoice:
    invoice = Invoice(
        user_id=quote.user_id,
        quote_id=quote.id,
        customer_id=quote.customer_id,
        invoice_number=generate_invoice_number(db),
        status="pending",
        amount=quote.total,
        due_date=date.today() + timedelta(days=15),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice
