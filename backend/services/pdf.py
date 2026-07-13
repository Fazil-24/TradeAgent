import json
import os
from datetime import date as date_type
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BRAND_COLOR = colors.HexColor("#1A6FA8")
LIGHT_GREY = colors.HexColor("#F2F2F2")
DARK_TEXT = colors.HexColor("#222222")

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "GBP": "£", "EUR": "€"}

_FONT_NAME = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
_FONTS_REGISTERED = False


def _ensure_fonts():
    """Register a Unicode font so PDFs render correctly regardless of quote
    language — the base14 PDF fonts don't cover characters like the rupee
    sign, and Arial doesn't cover Indic scripts at all. Nirmala UI is a
    Windows system font built specifically to cover Devanagari, Tamil,
    Kannada, Telugu, Malayalam, Bengali, Gujarati, etc. in one face, so it's
    tried first; Arial (Latin + currency symbols only) is the fallback for
    English-only quotes on machines without Nirmala."""
    global _FONT_NAME, _FONT_BOLD, _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return
    windir = os.environ.get("WINDIR", "C:\\Windows")
    nirmala_path = os.path.join(windir, "Fonts", "Nirmala.ttc")
    arial_regular = os.path.join(windir, "Fonts", "arial.ttf")
    arial_bold = os.path.join(windir, "Fonts", "arialbd.ttf")

    if os.path.exists(nirmala_path):
        try:
            pdfmetrics.registerFont(TTFont("Body", nirmala_path, subfontIndex=0))
            pdfmetrics.registerFont(TTFont("Body-Bold", nirmala_path, subfontIndex=1))
            _FONT_NAME, _FONT_BOLD = "Body", "Body-Bold"
            _FONTS_REGISTERED = True
            return
        except Exception:
            pass

    if os.path.exists(arial_regular) and os.path.exists(arial_bold):
        pdfmetrics.registerFont(TTFont("Body", arial_regular))
        pdfmetrics.registerFont(TTFont("Body-Bold", arial_bold))
        _FONT_NAME, _FONT_BOLD = "Body", "Body-Bold"
    _FONTS_REGISTERED = True


def _currency_symbol(currency: str) -> str:
    return CURRENCY_SYMBOLS.get(currency, currency + " ")


def _fmt(amount: float, symbol: str) -> str:
    return f"{symbol}{amount:,.2f}"


def _build_document(
    output_path: str,
    doc_type: str,
    doc_number: str,
    issue_date: date_type,
    secondary_label: str,
    secondary_date: Optional[date_type],
    business_name: str,
    business_phone: Optional[str],
    business_email: Optional[str],
    customer_name: str,
    customer_phone: str,
    customer_address: Optional[str],
    items: List[dict],
    subtotal: float,
    tax_rate: float,
    tax_amount: float,
    discount: float,
    total: float,
    notes: Optional[str],
    currency: str,
) -> str:
    _ensure_fonts()
    symbol = _currency_symbol(currency)

    styles = getSampleStyleSheet()
    normal = ParagraphStyle(
        "NormalBody", parent=styles["Normal"], fontName=_FONT_NAME, fontSize=10, leading=14
    )
    small_grey = ParagraphStyle(
        "SmallGrey",
        parent=normal,
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    business_style = ParagraphStyle(
        "Business", parent=normal, fontName=_FONT_BOLD, fontSize=16, textColor=BRAND_COLOR
    )
    doc_title_style = ParagraphStyle(
        "DocTitle",
        parent=normal,
        fontName=_FONT_BOLD,
        fontSize=20,
        alignment=TA_RIGHT,
        textColor=DARK_TEXT,
    )
    doc_meta_style = ParagraphStyle(
        "DocMeta", parent=normal, alignment=TA_RIGHT, fontSize=9, textColor=colors.grey
    )
    label_style = ParagraphStyle(
        "Label", parent=normal, fontName=_FONT_BOLD, fontSize=9, textColor=colors.grey
    )

    elements = []

    # ── Header: business info left, doc type + number right ──
    contact_line = " | ".join(filter(None, [business_phone, business_email]))
    header_left = [Paragraph(business_name, business_style)]
    if contact_line:
        header_left.append(Paragraph(contact_line, normal))

    header_right = [Paragraph(doc_type, doc_title_style)]
    header_right.append(Paragraph(f"#{doc_number}", doc_meta_style))
    header_right.append(Paragraph(f"Date: {issue_date.strftime('%d %b %Y')}", doc_meta_style))

    header_table = Table(
        [[header_left, header_right]], colWidths=[100 * mm, 70 * mm]
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    elements.append(header_table)
    elements.append(Spacer(1, 6 * mm))
    elements.append(Table([[""]], colWidths=[170 * mm], style=TableStyle(
        [("LINEBELOW", (0, 0), (-1, -1), 1, BRAND_COLOR)]
    )))
    elements.append(Spacer(1, 4 * mm))

    # ── Bill To / dates ──
    bill_to = [Paragraph("Bill To:", label_style), Paragraph(customer_name, normal)]
    bill_to.append(Paragraph(f"Phone: {customer_phone}", normal))
    if customer_address:
        bill_to.append(Paragraph(customer_address, normal))

    right_meta = []
    if secondary_date:
        right_meta.append(
            Paragraph(f"{secondary_label}: {secondary_date.strftime('%d %b %Y')}", doc_meta_style)
        )

    bill_table = Table([[bill_to, right_meta]], colWidths=[100 * mm, 70 * mm])
    bill_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    elements.append(bill_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Line items table ──
    table_data = [["#", "Description", "Qty", "Unit", "Price", "Total"]]
    for idx, item in enumerate(items, start=1):
        table_data.append(
            [
                str(idx),
                Paragraph(item["description"], normal),
                str(item["quantity"]),
                item["unit"],
                _fmt(item["unit_price"], symbol),
                _fmt(item["total"], symbol),
            ]
        )

    items_table = Table(
        table_data, colWidths=[10 * mm, 75 * mm, 15 * mm, 20 * mm, 25 * mm, 25 * mm]
    )
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_COLOR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), _FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, -1), _FONT_NAME),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(items_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Totals ──
    totals_data = [["Subtotal:", _fmt(subtotal, symbol)]]
    totals_data.append([f"Tax ({tax_rate:.0f}%):", _fmt(tax_amount, symbol)])
    if discount:
        totals_data.append(["Discount:", f"-{_fmt(discount, symbol)}"])
    totals_data.append(["TOTAL:", _fmt(total, symbol)])

    totals_table = Table(totals_data, colWidths=[40 * mm, 35 * mm])
    totals_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -2), _FONT_NAME),
                ("FONTNAME", (0, -1), (-1, -1), _FONT_BOLD),
                ("FONTSIZE", (0, 0), (-1, -2), 9),
                ("FONTSIZE", (0, -1), (-1, -1), 13),
                ("TEXTCOLOR", (0, -1), (-1, -1), BRAND_COLOR),
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND_COLOR),
                ("TOPPADDING", (0, -1), (-1, -1), 6),
            ]
        )
    )
    wrapper = Table([["", totals_table]], colWidths=[95 * mm, 75 * mm])
    wrapper.setStyle(
        TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)])
    )
    elements.append(wrapper)
    elements.append(Spacer(1, 8 * mm))

    # ── Notes / terms ──
    if notes:
        elements.append(Paragraph("Notes:", label_style))
        elements.append(Paragraph(notes, normal))
        elements.append(Spacer(1, 4 * mm))
    elements.append(
        Paragraph(
            "Terms: Payment due within 15 days of approval." if doc_type == "QUOTATION"
            else "Terms: Please make payment by the due date shown above.",
            normal,
        )
    )
    elements.append(Spacer(1, 10 * mm))
    elements.append(Table([[""]], colWidths=[170 * mm], style=TableStyle(
        [("LINEABOVE", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD"))]
    )))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Powered by TradeAgent AI", small_grey))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=15 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )
    doc.build(elements)
    return output_path


def generate_quote_pdf(quote, customer, user, output_path: str) -> str:
    items = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
    return _build_document(
        output_path=output_path,
        doc_type="QUOTATION",
        doc_number=quote.quote_number,
        issue_date=quote.created_at.date(),
        secondary_label="Valid Until",
        secondary_date=quote.valid_until,
        business_name=user.business_name,
        business_phone=user.phone,
        business_email=user.email,
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_address=customer.address,
        items=items,
        subtotal=quote.subtotal,
        tax_rate=quote.tax_rate,
        tax_amount=quote.tax_amount,
        discount=quote.discount,
        total=quote.total,
        notes=quote.notes,
        currency=user.currency,
    )


def generate_invoice_pdf(invoice, customer, user, output_path: str, quote=None) -> str:
    if quote is not None:
        items = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        subtotal = quote.subtotal
        tax_rate = quote.tax_rate
        tax_amount = quote.tax_amount
        discount = quote.discount
        notes = quote.notes
    else:
        items = [
            {
                "description": "Services rendered",
                "quantity": 1,
                "unit": "job",
                "unit_price": invoice.amount,
                "total": invoice.amount,
            }
        ]
        subtotal = invoice.amount
        tax_rate = 0
        tax_amount = 0
        discount = 0
        notes = None

    return _build_document(
        output_path=output_path,
        doc_type="INVOICE",
        doc_number=invoice.invoice_number,
        issue_date=invoice.created_at.date(),
        secondary_label="Due Date",
        secondary_date=invoice.due_date,
        business_name=user.business_name,
        business_phone=user.phone,
        business_email=user.email,
        customer_name=customer.name,
        customer_phone=customer.phone,
        customer_address=customer.address,
        items=items,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        discount=discount,
        total=invoice.amount,
        notes=notes,
        currency=user.currency,
    )
