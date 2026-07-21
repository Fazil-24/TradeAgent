import io
import json
import os
from datetime import date as date_type
from typing import List, Optional

import qrcode
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand colours ─────────────────────────────────────────────
BRAND_COLOR    = colors.HexColor("#1A6FA8")
BRAND_DARK     = colors.HexColor("#123A56")
BRAND_LIGHT    = colors.HexColor("#E8F2FA")
ACCENT_GREEN   = colors.HexColor("#2E7D32")
ACCENT_ORANGE  = colors.HexColor("#E65100")
ACCENT_PURPLE  = colors.HexColor("#6A1B9A")
LIGHT_GREY     = colors.HexColor("#F5F5F5")
MID_GREY       = colors.HexColor("#DDDDDD")
DARK_TEXT      = colors.HexColor("#1A1A1A")

# Category colours matching the frontend
CATEGORY_COLORS = {
    "material":   BRAND_COLOR,
    "labour":     ACCENT_GREEN,
    "transport":  ACCENT_ORANGE,
    "accessory":  ACCENT_PURPLE,
}
CATEGORY_LABELS = {
    "material":   "MATERIALS",
    "labour":     "LABOUR",
    "transport":  "TRANSPORTATION",
    "accessory":  "ACCESSORIES",
}

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "GBP": "£", "EUR": "€"}

_FONT_NAME = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
_FONTS_REGISTERED = False


def _ensure_fonts():
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


def _make_qr(text: str, size_mm: float = 28) -> Image:
    """Generate a QR code image for embedding in the PDF."""
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=1)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    size_pt = size_mm * mm
    return Image(buf, width=size_pt, height=size_pt)


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
    ai_generated: bool = False,
) -> str:
    _ensure_fonts()
    symbol = _currency_symbol(currency)

    styles = getSampleStyleSheet()
    normal = ParagraphStyle("NormalBody", parent=styles["Normal"], fontName=_FONT_NAME, fontSize=9, leading=13)
    bold9   = ParagraphStyle("Bold9",   parent=normal, fontName=_FONT_BOLD)
    small   = ParagraphStyle("Small",   parent=normal, fontSize=7.5, textColor=colors.HexColor("#666666"))
    centered = ParagraphStyle("Centered", parent=normal, alignment=TA_CENTER)
    right    = ParagraphStyle("Right",    parent=normal, alignment=TA_RIGHT)

    biz_name_style = ParagraphStyle("BizName", parent=normal, fontName=_FONT_BOLD, fontSize=15, textColor=BRAND_COLOR)
    doc_type_style = ParagraphStyle("DocType",  parent=normal, fontName=_FONT_BOLD, fontSize=22, alignment=TA_RIGHT, textColor=DARK_TEXT)
    doc_num_style  = ParagraphStyle("DocNum",   parent=normal, fontSize=9, alignment=TA_RIGHT, textColor=colors.grey)
    label_style    = ParagraphStyle("Label",    parent=normal, fontName=_FONT_BOLD, fontSize=8, textColor=colors.grey)

    elements = []

    # ── Top brand stripe ──────────────────────────────────────
    elements.append(
        Table(
            [[""]],
            colWidths=[170 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_COLOR),
                ("ROWHEIGHT", (0, 0), (-1, -1), 4),
            ]),
        )
    )
    elements.append(Spacer(1, 5 * mm))

    # ── Header: business left | QR + doc type right ──────────
    qr_text = f"{doc_type} {doc_number} | {business_name} | Total: {symbol}{total:,.2f}"
    qr_img = _make_qr(qr_text, size_mm=26)

    contact_parts = [p for p in [business_phone, business_email] if p]
    header_left = [Paragraph(business_name, biz_name_style)]
    if contact_parts:
        header_left.append(Paragraph(" | ".join(contact_parts), small))
    header_left.append(Spacer(1, 2))
    if ai_generated:
        header_left.append(Paragraph("Generated by TradeAgent AI", small))

    header_right_inner = [
        [Paragraph(doc_type, doc_type_style)],
        [Paragraph(f"#{doc_number}", doc_num_style)],
        [Paragraph(f"Date: {issue_date.strftime('%d %b %Y')}", doc_num_style)],
        [qr_img],
    ]
    inner_tbl = Table(header_right_inner, colWidths=[60 * mm])
    inner_tbl.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -2), 1),
    ]))

    header_table = Table([[header_left, inner_tbl]], colWidths=[108 * mm, 62 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 4 * mm))
    elements.append(Table([[""]], colWidths=[170 * mm], style=TableStyle(
        [("LINEBELOW", (0, 0), (-1, -1), 1.5, BRAND_COLOR)]
    )))
    elements.append(Spacer(1, 4 * mm))

    # ── Bill To / Dates ───────────────────────────────────────
    bill_to = [
        Paragraph("BILL TO", label_style),
        Paragraph(customer_name, bold9),
        Paragraph(f"Phone: {customer_phone}", normal),
    ]
    if customer_address:
        bill_to.append(Paragraph(customer_address, normal))

    right_meta = []
    if secondary_date:
        right_meta.append(Paragraph(f"{secondary_label}:", label_style))
        right_meta.append(Paragraph(secondary_date.strftime("%d %b %Y"), bold9))

    bill_table = Table([[bill_to, right_meta]], colWidths=[110 * mm, 60 * mm])
    bill_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(bill_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Line items — grouped by category ─────────────────────
    # Group items
    categories_order = ["material", "labour", "transport", "accessory"]
    grouped: dict[str, list[dict]] = {c: [] for c in categories_order}
    for item in items:
        cat = item.get("category", "material") or "material"
        if cat not in grouped:
            cat = "material"
        grouped[cat].append(item)

    row_idx = 1  # for alternating row colours across all sections
    for cat in categories_order:
        cat_items = grouped[cat]
        if not cat_items:
            continue

        cat_color = CATEGORY_COLORS.get(cat, BRAND_COLOR)
        cat_label = CATEGORY_LABELS.get(cat, cat.upper())
        cat_subtotal = sum(i.get("total", 0) or (i.get("quantity", 1) * i.get("unit_price", 0)) for i in cat_items)

        # Category section header row
        header_row = [
            [
                Paragraph(cat_label, ParagraphStyle("CatHdr", parent=normal, fontName=_FONT_BOLD, fontSize=8, textColor=colors.white)),
                "",
                "",
                "",
                Paragraph(_fmt(cat_subtotal, symbol), ParagraphStyle("CatHdrR", parent=normal, fontName=_FONT_BOLD, fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
                "",
            ]
        ]

        # Item rows
        item_rows = []
        for item in cat_items:
            qty = item.get("quantity", 1)
            up = item.get("unit_price", 0)
            tot = qty * up
            item_rows.append([
                str(row_idx),
                Paragraph(item.get("description", ""), normal),
                str(qty),
                item.get("unit", "unit"),
                _fmt(up, symbol),
                _fmt(tot, symbol),
            ])
            row_idx += 1

        section_data = header_row + item_rows
        col_widths = [10 * mm, 74 * mm, 14 * mm, 18 * mm, 27 * mm, 27 * mm]
        section_tbl = Table(section_data, colWidths=col_widths)
        style = TableStyle([
            # Category header row
            ("BACKGROUND",   (0, 0), (-1, 0), cat_color),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("SPAN",         (0, 0), (3, 0)),
            ("SPAN",         (4, 0), (5, 0)),
            # Item rows
            ("FONTNAME",     (0, 1), (-1, -1), _FONT_NAME),
            ("FONTSIZE",     (0, 0), (-1, -1), 8.5),
            ("ALIGN",        (2, 0), (-1, -1), "RIGHT"),
            ("ALIGN",        (0, 0), (0, -1), "CENTER"),
            ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
            ("GRID",         (0, 0), (-1, -1), 0.4, MID_GREY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
        ])
        section_tbl.setStyle(style)
        elements.append(section_tbl)
        elements.append(Spacer(1, 3 * mm))

    elements.append(Spacer(1, 3 * mm))

    # ── Totals ────────────────────────────────────────────────
    totals_data = [
        [Paragraph("Subtotal", normal), Paragraph(_fmt(subtotal, symbol), right)],
        [Paragraph(f"GST / Tax ({tax_rate:.0f}%)", normal), Paragraph(_fmt(tax_amount, symbol), right)],
    ]
    if discount:
        totals_data.append([Paragraph("Discount", normal), Paragraph(f"-{_fmt(discount, symbol)}", right)])
    totals_data.append([
        Paragraph("GRAND TOTAL", ParagraphStyle("GT", parent=normal, fontName=_FONT_BOLD, fontSize=12)),
        Paragraph(_fmt(total, symbol), ParagraphStyle("GTR", parent=normal, fontName=_FONT_BOLD, fontSize=12, alignment=TA_RIGHT, textColor=BRAND_COLOR)),
    ])

    totals_tbl = Table(totals_data, colWidths=[45 * mm, 35 * mm])
    totals_tbl.setStyle(TableStyle([
        ("ALIGN",       (0, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0,0), (-1, -1), 3),
        ("LINEABOVE",   (0, -1), (-1, -1), 1.2, BRAND_COLOR),
        ("TOPPADDING",  (0, -1), (-1, -1), 6),
        ("BACKGROUND",  (0, -1), (-1, -1), BRAND_LIGHT),
    ]))
    wrapper = Table([["", totals_tbl]], colWidths=[90 * mm, 80 * mm])
    wrapper.setStyle(TableStyle([("LEFTPADDING", (0,0),(-1,-1), 0), ("RIGHTPADDING",(0,0),(-1,-1), 0)]))
    elements.append(wrapper)
    elements.append(Spacer(1, 8 * mm))

    # ── Notes ─────────────────────────────────────────────────
    if notes:
        elements.append(Paragraph("NOTES", label_style))
        elements.append(Spacer(1, 1 * mm))
        elements.append(Paragraph(notes, normal))
        elements.append(Spacer(1, 4 * mm))

    # ── Terms ─────────────────────────────────────────────────
    terms = (
        "Terms: Payment due within 15 days of approval. All prices are estimates and subject to on-site verification."
        if doc_type == "QUOTATION"
        else "Terms: Please make payment by the due date. Contact us if you have any queries."
    )
    elements.append(Paragraph(terms, small))
    elements.append(Spacer(1, 8 * mm))

    # ── Signature area ────────────────────────────────────────
    sig_data = [
        [
            Paragraph("Authorised Signature", small),
            "",
            Paragraph("Customer Acceptance", small),
        ],
        [
            Table([[""]], colWidths=[60 * mm], style=TableStyle([("LINEABOVE", (0,0),(-1,-1), 0.8, DARK_TEXT)])),
            "",
            Table([[""]], colWidths=[60 * mm], style=TableStyle([("LINEABOVE", (0,0),(-1,-1), 0.8, DARK_TEXT)])),
        ],
        [
            Paragraph(business_name, small),
            "",
            Paragraph(f"{doc_type} #{doc_number}", small),
        ],
    ]
    sig_tbl = Table(sig_data, colWidths=[65 * mm, 40 * mm, 65 * mm])
    sig_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0),(-1,-1), "BOTTOM"),
        ("LEFTPADDING",(0,0),(-1,-1), 0),
        ("RIGHTPADDING",(0,0),(-1,-1), 0),
        ("TOPPADDING",(0,0),(-1,-1), 2),
    ]))
    elements.append(sig_tbl)
    elements.append(Spacer(1, 6 * mm))

    # ── Footer ────────────────────────────────────────────────
    elements.append(Table([[""]], colWidths=[170 * mm], style=TableStyle(
        [("LINEABOVE", (0,0),(-1,-1), 0.5, MID_GREY)]
    )))
    elements.append(Spacer(1, 2 * mm))

    if ai_generated:
        footer_text = "Generated by <b>TradeAgent AI</b> · AI estimates — please review before sending · Powered by Google Gemini"
    else:
        footer_text = "Generated by <b>TradeAgent AI</b>"

    elements.append(Paragraph(
        footer_text,
        ParagraphStyle("Footer", parent=normal, fontSize=7, textColor=colors.grey, alignment=TA_CENTER),
    ))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
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
        ai_generated=quote.ai_generated,
    )


def generate_invoice_pdf(invoice, customer, user, output_path: str, quote=None) -> str:
    if quote is not None:
        items = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        subtotal  = quote.subtotal
        tax_rate  = quote.tax_rate
        tax_amount = quote.tax_amount
        discount  = quote.discount
        notes     = quote.notes
        ai_gen    = quote.ai_generated
    else:
        items = [{"description": "Services rendered", "category": "labour",
                  "quantity": 1, "unit": "job", "unit_price": invoice.amount, "total": invoice.amount}]
        subtotal = invoice.amount
        tax_rate = tax_amount = discount = 0
        notes = None
        ai_gen = False

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
        ai_generated=ai_gen,
    )
