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


class GoogleLoginRequest(BaseModel):
    id_token: str


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
    category: Optional[str] = "material"   # material|labour|transport|accessory
    quantity: float
    unit: str
    unit_price: float
    total: float
    brand_suggestion: Optional[str] = None


class DetectedComponent(BaseModel):
    type: str
    label: str
    count: int = 1
    condition: str = "new_required"         # new_required|existing_good|existing_needs_replacement
    notes: Optional[str] = None
    sweep_recommendation_mm: Optional[int] = None
    sweep_reason: Optional[str] = None


class RoomMeasurements(BaseModel):
    estimated_width_m: Optional[float] = None
    estimated_length_m: Optional[float] = None
    estimated_ceiling_height_m: Optional[float] = None
    floor_area_sqm: Optional[float] = None
    wall_area_sqm: Optional[float] = None
    cable_length_estimate_m: Optional[float] = None
    conduit_length_estimate_m: Optional[float] = None
    reference_used: Optional[str] = None
    confidence_pct: Optional[int] = None
    confidence_note: Optional[str] = None


class AIAnalyzeResponse(BaseModel):
    items: List[AIAnalyzeItem]
    detected_components: Optional[List[DetectedComponent]] = []
    room_measurements: Optional[RoomMeasurements] = None
    measurement_questions: Optional[List[str]] = []
    observations: Optional[List[str]] = []
    labor_hours: Optional[float] = 0
    complexity: Optional[str] = "medium"
    safety_notes: Optional[List[str]] = []
    notes: Optional[str] = None
    disclaimer: str = "These are AI estimates. Please review before sending."


class CustomerPreferences(BaseModel):
    budget: str = "value"                   # economy|budget|value|premium|luxury
    brand: Optional[str] = None
    features: Optional[List[str]] = []     # energy_saving|wifi|bldc|remote|silent|designer
    purchase_preference: Optional[str] = "best_value"


class RecommendationRequest(BaseModel):
    component_type: str                     # ceiling_fan|switch|socket|light|...
    sweep_mm: Optional[int] = None
    room_area_sqm: Optional[float] = None
    preferences: CustomerPreferences
    currency: Optional[str] = "INR"


class ProductRecommendation(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: float
    currency: str
    wattage: int
    warranty_years: int
    star_rating: float
    image_url: str
    features: List[str]
    pros: List[str]
    cons: List[str]
    tags: List[str]
    sweep_mm: Optional[int] = None
    lumens: Optional[int] = None
    monthly_electricity_cost: Optional[float] = None
    annual_electricity_cost: Optional[float] = None
    five_year_running_cost: Optional[float] = None
    annual_savings_vs_standard: Optional[float] = None
    why_recommended: Optional[str] = None


class RecommendationResponse(BaseModel):
    component_type: str
    sweep_recommendation_mm: Optional[int] = None
    sweep_reason: Optional[str] = None
    room_area_sqft: Optional[float] = None
    products: List[ProductRecommendation]


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


# ── SUPPLIERS ─────────────────────────────────────────────────
class SupplierSearchRequest(BaseModel):
    items: List[Any]          # list of quote items [{description, quantity, ...}]
    lat: Optional[float] = None   # omit to search all shops regardless of distance
    lng: Optional[float] = None
    radius_km: Optional[float] = 15
    city: Optional[str] = None    # omit to search all cities


class SupplierMatchedItem(BaseModel):
    quote_item: str
    shop_product: str
    brand: Optional[str] = None
    quantity_available: int
    unit_price: float
    unit: str
    match_confidence: int


class SupplierShop(BaseModel):
    id: str
    shop_name: str
    owner_name: str
    phone: str
    whatsapp: Optional[str] = None
    address: str
    delivery_available: bool
    delivery_radius_km: Optional[int] = None
    min_order_amount: Optional[float] = None


class SupplierResult(BaseModel):
    shop: SupplierShop
    tier: str                  # "complete" | "partial"
    match_pct: int
    matched_count: int
    total_count: int
    distance_km: Optional[float] = None   # None when location not provided
    matched_items: List[SupplierMatchedItem]
    missing_items: List[str]
    price_disclaimer: str


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
