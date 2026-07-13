from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── AUTH ──────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    business_name: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    business_name: str
    phone: Optional[str] = None
    currency: str
    language: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None
    language: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── CUSTOMER ──────────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    whatsapp: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    whatsapp: Optional[str] = None


class CustomerOut(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    whatsapp: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── JOB ───────────────────────────────────────────────────────
class JobCreate(BaseModel):
    customer_id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    photos: Optional[List[str]] = []


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    photos: Optional[List[str]] = None
    status: Optional[str] = None


class JobOut(BaseModel):
    id: int
    user_id: int
    customer_id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    photos: List[str] = []
    ai_analysis: Optional[Any] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── AI ────────────────────────────────────────────────────────
class AIAnalyzeRequest(BaseModel):
    job_id: Optional[int] = None
    customer_id: Optional[int] = None
    title: str
    description: str
    location: Optional[str] = None
    photo_paths: Optional[List[str]] = []
    language: Optional[str] = "en"


class AIAnalyzeItem(BaseModel):
    description: str
    quantity: float
    unit: str
    unit_price: float
    total: float


class AIAnalyzeResponse(BaseModel):
    items: List[AIAnalyzeItem]
    observations: Optional[List[str]] = []
    labor_hours: Optional[float] = 0
    complexity: Optional[str] = "medium"
    safety_notes: Optional[List[str]] = []
    notes: Optional[str] = None
    disclaimer: str = "These are AI estimates. Please review before sending."


class WhatsAppMessageRequest(BaseModel):
    quote_id: Optional[int] = None
    invoice_id: Optional[int] = None
    language: Optional[str] = "en"


# ── QUOTE ─────────────────────────────────────────────────────
class QuoteItem(BaseModel):
    description: str
    quantity: float
    unit: str
    unit_price: float
    total: float
    ai_generated: Optional[bool] = False


class QuoteCreate(BaseModel):
    job_id: Optional[int] = None
    customer_id: int
    items: List[QuoteItem] = []
    tax_rate: Optional[float] = 18.0
    discount: Optional[float] = 0
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    ai_generated: Optional[bool] = False
    language: Optional[str] = "en"


class QuoteUpdate(BaseModel):
    items: Optional[List[QuoteItem]] = None
    tax_rate: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    status: Optional[str] = None


class QuoteOut(BaseModel):
    id: int
    user_id: int
    job_id: Optional[int] = None
    customer_id: int
    quote_number: str
    status: str
    items: List[QuoteItem] = []
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount: float
    total: float
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    ai_generated: bool
    language: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── INVOICE ───────────────────────────────────────────────────
class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    user_id: int
    quote_id: Optional[int] = None
    customer_id: int
    invoice_number: str
    status: str
    amount: float
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── DASHBOARD ─────────────────────────────────────────────────
class DashboardActivity(BaseModel):
    type: str
    description: str
    timestamp: datetime


class DashboardOut(BaseModel):
    total_revenue: float
    pending_amount: float
    active_jobs: int
    quotes_this_month: int
    recent_activity: List[DashboardActivity] = []
