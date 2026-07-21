"""
Audit Logging Service
=====================
Records security-relevant events: auth attempts, AI calls, PDF downloads.
Stored in the same SQLite DB so no additional infrastructure is needed.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session


def log_event(
    db: Session,
    event_type: str,
    user_id: Optional[int] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
    success: bool = True,
) -> None:
    """
    Write one audit record. Fire-and-forget — exceptions are swallowed so
    a logging failure never breaks the primary request flow.

    event_type examples:
      auth.login.success  auth.login.failed  auth.google.success
      auth.register       auth.logout
      ai.analyze          ai.recommendations
      pdf.quote.download  pdf.invoice.download
      quote.approved
    """
    try:
        from models import AuditLog  # local import to avoid circular deps
        entry = AuditLog(
            event_type=event_type,
            user_id=user_id,
            detail=detail,
            ip_address=ip_address,
            success=success,
            created_at=datetime.utcnow(),
        )
        db.add(entry)
        db.commit()
    except Exception:
        pass  # never let audit failure surface to the caller
