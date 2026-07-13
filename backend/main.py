import json
import os
import socket
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

# Load .env relative to this file, not the process's cwd — uvicorn may be
# launched with a working directory that differs from backend/.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
import schemas
from ai.agents import AIRouter, analyze_photos, generate_quote_from_text
from auth import (
    authenticate_user,
    create_access_token,
    create_file_access_token,
    get_current_user,
    hash_password,
    verify_file_access_token,
)
from database import DATA_DIR, Base, engine, get_db
from services.invoice import create_invoice_from_quote
from services.pdf import generate_invoice_pdf, generate_quote_pdf
from services.quote import calculate_totals, generate_quote_number, normalize_items
from services.whatsapp import (
    build_invoice_message,
    build_quote_message,
    generate_whatsapp_link,
)

Base.metadata.create_all(bind=engine)

UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

ai_router = AIRouter()

app = FastAPI(title="TradeAgent AI")

# Custom production domain (e.g. a domain attached to the Vercel project),
# set as an env var on the host since it's only known after deploying.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN")

# Local dev: Vite picks the next free port (5174, 5175, ...) if 5173 is
# taken, and phones on the same Wi-Fi reach this server via the machine's
# LAN IP (192.168.x.x / 10.x.x.x / 172.16-31.x.x) rather than localhost.
# Production: any Vercel deployment URL — this covers the main production
# URL and every preview-branch URL without needing per-deploy config.
_LOCAL_ORIGIN = r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d+"
_VERCEL_ORIGIN = r"https://[a-zA-Z0-9-]+\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN else [],
    allow_origin_regex=rf"^({_LOCAL_ORIGIN}|{_VERCEL_ORIGIN})$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_owned(db: Session, model, obj_id: int, user_id: int):
    obj = db.query(model).filter(model.id == obj_id, model.user_id == user_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


def _validate_photo_paths(photo_paths: List[str], user_id: int) -> List[str]:
    """photo_paths comes straight from the request body — without this check
    a client could pass an arbitrary server-side path (e.g. "../.env" or
    another user's upload) and have it read and sent to the AI vision API.
    Resolve symlinks/".." and require the result to actually live inside
    this user's own upload folder."""
    user_dir = os.path.realpath(os.path.join(UPLOADS_DIR, str(user_id)))
    validated = []
    for raw_path in photo_paths:
        real_path = os.path.realpath(raw_path)
        if real_path != user_dir and not real_path.startswith(user_dir + os.sep):
            raise HTTPException(status_code=400, detail="Invalid photo path")
        if not os.path.isfile(real_path):
            raise HTTPException(status_code=400, detail="Photo not found")
        validated.append(real_path)
    return validated


def _job_out(job: models.Job) -> schemas.JobOut:
    return schemas.JobOut(
        id=job.id,
        user_id=job.user_id,
        customer_id=job.customer_id,
        title=job.title,
        description=job.description,
        location=job.location,
        photos=json.loads(job.photos or "[]"),
        ai_analysis=json.loads(job.ai_analysis) if job.ai_analysis else None,
        status=job.status,
        created_at=job.created_at,
    )


def _quote_out(quote: models.Quote) -> schemas.QuoteOut:
    return schemas.QuoteOut(
        id=quote.id,
        user_id=quote.user_id,
        job_id=quote.job_id,
        customer_id=quote.customer_id,
        quote_number=quote.quote_number,
        status=quote.status,
        items=json.loads(quote.items or "[]"),
        subtotal=quote.subtotal,
        tax_rate=quote.tax_rate,
        tax_amount=quote.tax_amount,
        discount=quote.discount,
        total=quote.total,
        notes=quote.notes,
        valid_until=quote.valid_until,
        ai_generated=quote.ai_generated,
        language=quote.language,
        created_at=quote.created_at,
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/network-info")
def network_info():
    """Report this machine's LAN IP so the Install page can build a QR code
    a phone can actually reach — window.location on the desktop browser is
    typically "localhost", which means the phone itself once scanned."""
    lan_ip = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            lan_ip = s.getsockname()[0]
        finally:
            s.close()
    except OSError:
        pass
    return {"lan_ip": lan_ip}


# ── AUTH ROUTES ───────────────────────────────────────────────
@app.post("/api/auth/register", response_model=schemas.Token)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        business_name=payload.business_name,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    user_dir = os.path.join(UPLOADS_DIR, str(user.id))
    os.makedirs(os.path.join(user_dir, "pdfs"), exist_ok=True)

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── CUSTOMER ROUTES ──────────────────────────────────────────
@app.get("/api/customers", response_model=List[schemas.CustomerOut])
def list_customers(
    search: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Customer).filter(models.Customer.user_id == current_user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Customer.name.ilike(like)) | (models.Customer.phone.ilike(like))
        )
    return q.order_by(models.Customer.created_at.desc()).all()


@app.post("/api/customers", response_model=schemas.CustomerOut)
def create_customer(
    payload: schemas.CustomerCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = models.Customer(user_id=current_user.id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@app.get("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(
    customer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned(db, models.Customer, customer_id, current_user.id)


@app.put("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: int,
    payload: schemas.CustomerUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = _get_owned(db, models.Customer, customer_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@app.delete("/api/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = _get_owned(db, models.Customer, customer_id, current_user.id)
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}


# ── JOB ROUTES ────────────────────────────────────────────────
@app.get("/api/jobs", response_model=List[schemas.JobOut])
def list_jobs(
    customer_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Job).filter(models.Job.user_id == current_user.id)
    if customer_id:
        q = q.filter(models.Job.customer_id == customer_id)
    jobs = q.order_by(models.Job.created_at.desc()).all()
    return [_job_out(j) for j in jobs]


@app.post("/api/jobs", response_model=schemas.JobOut)
def create_job(
    payload: schemas.JobCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned(db, models.Customer, payload.customer_id, current_user.id)
    job = models.Job(
        user_id=current_user.id,
        customer_id=payload.customer_id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        photos=json.dumps(payload.photos or []),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_out(job)


@app.get("/api/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _get_owned(db, models.Job, job_id, current_user.id)
    return _job_out(job)


@app.put("/api/jobs/{job_id}", response_model=schemas.JobOut)
def update_job(
    job_id: int,
    payload: schemas.JobUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _get_owned(db, models.Job, job_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    if "photos" in data:
        job.photos = json.dumps(data.pop("photos"))
    for field, value in data.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return _job_out(job)


# ── UPLOAD ROUTES ─────────────────────────────────────────────
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_FILES = 10


@app.post("/api/upload/photos")
async def upload_photos(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(get_current_user),
):
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} photos allowed")

    user_dir = os.path.join(UPLOADS_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    results = []
    for f in files:
        if f.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400, detail=f"Unsupported file type: {f.content_type}"
            )
        contents = await f.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, detail=f"{f.filename} exceeds the 5MB limit"
            )
        ext = os.path.splitext(f.filename or "")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(user_dir, filename)
        with open(path, "wb") as out:
            out.write(contents)
        results.append({"path": path, "filename": filename})
    return {"data": results}


# ── AI ROUTES ─────────────────────────────────────────────────
@app.post("/api/ai/analyze", response_model=schemas.AIAnalyzeResponse)
async def ai_analyze(
    payload: schemas.AIAnalyzeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    language = payload.language or current_user.language
    photo_paths = (
        _validate_photo_paths(payload.photo_paths, current_user.id)
        if payload.photo_paths
        else []
    )
    try:
        if photo_paths:
            result = await analyze_photos(
                ai_router,
                photo_paths,
                payload.description,
                language,
                current_user.currency,
            )
        else:
            result = await generate_quote_from_text(
                ai_router,
                payload.title,
                payload.description,
                payload.location,
                language,
                current_user.currency,
            )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="AI generation failed. Please try again or enter items manually.",
        )

    items = normalize_items(result.get("items", []))
    response = schemas.AIAnalyzeResponse(
        items=items,
        observations=result.get("observations", []),
        labor_hours=result.get("labor_hours", 0),
        complexity=result.get("complexity", "medium"),
        safety_notes=result.get("safety_notes", []),
        notes=result.get("notes"),
        disclaimer=result.get(
            "disclaimer", "These are AI estimates. Please review before sending."
        ),
    )

    if payload.job_id:
        job = (
            db.query(models.Job)
            .filter(models.Job.id == payload.job_id, models.Job.user_id == current_user.id)
            .first()
        )
        if job:
            job.ai_analysis = json.dumps(result)
            job.status = "analyzed"
            db.commit()

    return response


@app.post("/api/ai/whatsapp-message")
def ai_whatsapp_message(
    payload: schemas.WhatsAppMessageRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    language = payload.language or current_user.language

    if payload.quote_id:
        quote = _get_owned(db, models.Quote, payload.quote_id, current_user.id)
        customer = db.query(models.Customer).get(quote.customer_id)
        message = build_quote_message(quote, customer, current_user, language)
        link = generate_whatsapp_link(customer.whatsapp or customer.phone, message)
        return {"message": message, "whatsapp_link": link}

    if payload.invoice_id:
        invoice = _get_owned(db, models.Invoice, payload.invoice_id, current_user.id)
        customer = db.query(models.Customer).get(invoice.customer_id)
        message = build_invoice_message(invoice, customer, current_user, language)
        link = generate_whatsapp_link(customer.whatsapp or customer.phone, message)
        return {"message": message, "whatsapp_link": link}

    raise HTTPException(status_code=400, detail="quote_id or invoice_id is required")


# ── QUOTE ROUTES ──────────────────────────────────────────────
@app.get("/api/quotes", response_model=List[schemas.QuoteOut])
def list_quotes(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Quote).filter(models.Quote.user_id == current_user.id)
    if customer_id:
        q = q.filter(models.Quote.customer_id == customer_id)
    if status_filter:
        q = q.filter(models.Quote.status == status_filter)
    quotes = q.order_by(models.Quote.created_at.desc()).all()
    return [_quote_out(q) for q in quotes]


@app.post("/api/quotes", response_model=schemas.QuoteOut)
def create_quote(
    payload: schemas.QuoteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned(db, models.Customer, payload.customer_id, current_user.id)

    items = normalize_items([item.model_dump() for item in payload.items])
    subtotal, tax_amount, total = calculate_totals(items, payload.tax_rate, payload.discount)

    quote = models.Quote(
        user_id=current_user.id,
        job_id=payload.job_id,
        customer_id=payload.customer_id,
        quote_number=generate_quote_number(db),
        items=json.dumps(items),
        subtotal=subtotal,
        tax_rate=payload.tax_rate,
        tax_amount=tax_amount,
        discount=payload.discount,
        total=total,
        notes=payload.notes,
        valid_until=payload.valid_until,
        ai_generated=payload.ai_generated,
        language=payload.language,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return _quote_out(quote)


@app.get("/api/quotes/{quote_id}", response_model=schemas.QuoteOut)
def get_quote(
    quote_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quote = _get_owned(db, models.Quote, quote_id, current_user.id)
    return _quote_out(quote)


@app.put("/api/quotes/{quote_id}", response_model=schemas.QuoteOut)
def update_quote(
    quote_id: int,
    payload: schemas.QuoteUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quote = _get_owned(db, models.Quote, quote_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)

    if "items" in data:
        items = normalize_items(data.pop("items"))
        quote.items = json.dumps(items)
    if "tax_rate" in data:
        quote.tax_rate = data.pop("tax_rate")
    if "discount" in data:
        quote.discount = data.pop("discount")
    for field, value in data.items():
        setattr(quote, field, value)

    items = json.loads(quote.items)
    subtotal, tax_amount, total = calculate_totals(items, quote.tax_rate, quote.discount)
    quote.subtotal, quote.tax_amount, quote.total = subtotal, tax_amount, total

    db.commit()
    db.refresh(quote)
    return _quote_out(quote)


@app.delete("/api/quotes/{quote_id}")
def delete_quote(
    quote_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quote = _get_owned(db, models.Quote, quote_id, current_user.id)
    db.delete(quote)
    db.commit()
    return {"message": "Quote deleted"}


@app.post("/api/quotes/{quote_id}/approve", response_model=schemas.InvoiceOut)
def approve_quote(
    quote_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quote = _get_owned(db, models.Quote, quote_id, current_user.id)
    quote.status = "approved"
    db.commit()
    invoice = create_invoice_from_quote(db, quote)
    return invoice


@app.post("/api/quotes/{quote_id}/generate-pdf")
def quote_generate_pdf(
    quote_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quote = _get_owned(db, models.Quote, quote_id, current_user.id)
    customer = db.query(models.Customer).get(quote.customer_id)

    pdf_dir = os.path.join(UPLOADS_DIR, str(current_user.id), "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)
    output_path = os.path.join(pdf_dir, f"quote_{quote.id}.pdf")
    generate_quote_pdf(quote, customer, current_user, output_path)

    # Store the real filesystem path, not a public URL — the file is no
    # longer served by a static mount, only through the token-gated route
    # below, which checks the quote belongs to the requesting user.
    quote.pdf_path = output_path
    db.commit()

    # A short-lived token embedded in the URL, since this link is opened via
    # plain browser navigation (window.open), which can't send the usual
    # Authorization header the way an axios call can.
    token = create_file_access_token("quote", quote_id, current_user.id)
    return {"pdf_url": f"/api/quotes/{quote_id}/pdf?token={token}"}


@app.get("/api/quotes/{quote_id}/pdf")
def quote_get_pdf(quote_id: int, token: str, db: Session = Depends(get_db)):
    user_id = verify_file_access_token(token, "quote", quote_id)
    quote = _get_owned(db, models.Quote, quote_id, user_id)
    if not quote.pdf_path or not os.path.exists(quote.pdf_path):
        raise HTTPException(
            status_code=404, detail="PDF not generated yet — call generate-pdf first"
        )
    return FileResponse(
        quote.pdf_path,
        media_type="application/pdf",
        filename=f"{quote.quote_number}.pdf",
    )


# ── INVOICE ROUTES ────────────────────────────────────────────
@app.get("/api/invoices", response_model=List[schemas.InvoiceOut])
def list_invoices(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Invoice).filter(models.Invoice.user_id == current_user.id)
    if customer_id:
        q = q.filter(models.Invoice.customer_id == customer_id)
    if status_filter:
        q = q.filter(models.Invoice.status == status_filter)
    return q.order_by(models.Invoice.created_at.desc()).all()


@app.get("/api/invoices/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(
    invoice_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned(db, models.Invoice, invoice_id, current_user.id)


@app.put("/api/invoices/{invoice_id}", response_model=schemas.InvoiceOut)
def update_invoice(
    invoice_id: int,
    payload: schemas.InvoiceUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = _get_owned(db, models.Invoice, invoice_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == "paid" and not data.get("paid_date"):
        data["paid_date"] = date.today()
    for field, value in data.items():
        setattr(invoice, field, value)
    db.commit()
    db.refresh(invoice)
    return invoice


@app.post("/api/invoices/{invoice_id}/generate-pdf")
def invoice_generate_pdf(
    invoice_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = _get_owned(db, models.Invoice, invoice_id, current_user.id)
    customer = db.query(models.Customer).get(invoice.customer_id)
    quote = (
        db.query(models.Quote).filter(models.Quote.id == invoice.quote_id).first()
        if invoice.quote_id
        else None
    )

    pdf_dir = os.path.join(UPLOADS_DIR, str(current_user.id), "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)
    output_path = os.path.join(pdf_dir, f"invoice_{invoice.id}.pdf")
    generate_invoice_pdf(invoice, customer, current_user, output_path, quote=quote)

    invoice.pdf_path = output_path
    db.commit()

    token = create_file_access_token("invoice", invoice_id, current_user.id)
    return {"pdf_url": f"/api/invoices/{invoice_id}/pdf?token={token}"}


@app.get("/api/invoices/{invoice_id}/pdf")
def invoice_get_pdf(invoice_id: int, token: str, db: Session = Depends(get_db)):
    user_id = verify_file_access_token(token, "invoice", invoice_id)
    invoice = _get_owned(db, models.Invoice, invoice_id, user_id)
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(
            status_code=404, detail="PDF not generated yet — call generate-pdf first"
        )
    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf",
    )


# ── DASHBOARD ─────────────────────────────────────────────────
@app.get("/api/dashboard", response_model=schemas.DashboardOut)
def dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    paid_invoices = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.user_id == current_user.id,
            models.Invoice.status == "paid",
            models.Invoice.paid_date >= month_start.date(),
        )
        .all()
    )
    total_revenue = sum(i.amount for i in paid_invoices)

    pending_invoices = (
        db.query(models.Invoice)
        .filter(
            models.Invoice.user_id == current_user.id,
            models.Invoice.status.in_(["pending", "sent", "overdue"]),
        )
        .all()
    )
    pending_amount = sum(i.amount for i in pending_invoices)

    active_jobs = (
        db.query(models.Job)
        .filter(models.Job.user_id == current_user.id, models.Job.status != "completed")
        .count()
    )
    quotes_this_month = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id, models.Quote.created_at >= month_start)
        .count()
    )

    activity = []
    recent_quotes = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id)
        .order_by(models.Quote.created_at.desc())
        .limit(5)
        .all()
    )
    for q in recent_quotes:
        activity.append(
            schemas.DashboardActivity(
                type="quote",
                description=f"Quote {q.quote_number} — {q.status}",
                timestamp=q.created_at,
            )
        )
    recent_invoices = (
        db.query(models.Invoice)
        .filter(models.Invoice.user_id == current_user.id)
        .order_by(models.Invoice.created_at.desc())
        .limit(5)
        .all()
    )
    for inv in recent_invoices:
        activity.append(
            schemas.DashboardActivity(
                type="invoice",
                description=f"Invoice {inv.invoice_number} — {inv.status}",
                timestamp=inv.created_at,
            )
        )
    activity.sort(key=lambda a: a.timestamp, reverse=True)

    return schemas.DashboardOut(
        total_revenue=total_revenue,
        pending_amount=pending_amount,
        active_jobs=active_jobs,
        quotes_this_month=quotes_this_month,
        recent_activity=activity[:5],
    )


# ── REPORTS ───────────────────────────────────────────────────
@app.get("/api/reports/summary")
def reports_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_quotes = (
        db.query(models.Quote).filter(models.Quote.user_id == current_user.id).count()
    )
    approved_quotes = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id, models.Quote.status == "approved")
        .count()
    )
    conversion_rate = round((approved_quotes / total_quotes * 100), 1) if total_quotes else 0.0

    paid_invoices = (
        db.query(models.Invoice)
        .filter(models.Invoice.user_id == current_user.id, models.Invoice.status == "paid")
        .all()
    )
    monthly_revenue = {}
    for inv in paid_invoices:
        key_date = inv.paid_date or inv.created_at.date()
        key = key_date.strftime("%Y-%m")
        monthly_revenue[key] = monthly_revenue.get(key, 0) + inv.amount

    return {
        "total_quotes": total_quotes,
        "approved_quotes": approved_quotes,
        "conversion_rate": conversion_rate,
        "monthly_revenue": monthly_revenue,
    }
