from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    business_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    currency = Column(String, default="INR")
    language = Column(String, default="en")
    google_sub = Column(String, nullable=True, index=True)   # Google OAuth subject ID
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    whatsapp = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    photos = Column(Text, default="[]")  # JSON array of file paths
    ai_analysis = Column(Text, nullable=True)  # JSON from AI
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    quote_number = Column(String, unique=True, index=True)
    status = Column(String, default="draft")  # draft/sent/approved/rejected
    items = Column(Text, default="[]")  # JSON line items
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=18.0)
    tax_amount = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    notes = Column(Text, nullable=True)
    valid_until = Column(Date, nullable=True)
    pdf_path = Column(String, nullable=True)
    ai_generated = Column(Boolean, default=False)
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    invoice_number = Column(String, unique=True, index=True)
    status = Column(String, default="pending")  # pending/sent/paid/overdue
    amount = Column(Float, default=0)
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    payment_method = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
