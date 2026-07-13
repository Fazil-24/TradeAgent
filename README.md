# TradeAgent AI

## Problem

Electricians and small trade businesses lose time and money creating quotes and invoices by hand — there's no quick way to turn a job description (or a few photos) into a professional, itemized quote, especially for customers who don't speak English.

## Solution

A mobile-first PWA where an electrician describes a job or uploads photos, and AI (Gemini, with Cerebras as a fallback) generates an itemized quote in the customer's own language — English, Tamil, Hindi, Kannada, Telugu, or Malayalam. The electrician edits it if needed, shares it on WhatsApp or downloads a PDF, and tracks it from quote → approval → auto-generated invoice → paid, all from one dashboard.

## Running it locally

**Backend** (needs `backend/.env` with `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `SECRET_KEY`):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Impact

- Turns a manual, error-prone quoting process into a under-2-minute AI-assisted flow
- Removes the language barrier for customers who don't speak English
- Speeds up getting paid — WhatsApp sharing removes the friction of chasing customers for approval
