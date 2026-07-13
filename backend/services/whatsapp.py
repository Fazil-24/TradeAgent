import urllib.parse

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "GBP": "£", "EUR": "€"}


def generate_whatsapp_link(phone: str, message: str) -> str:
    """Generate WhatsApp deep link — works on all phones, zero API needed"""
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone  # India default
    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded}"


def build_quote_message(quote, customer, user, language: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(user.currency, user.currency + " ")
    valid_until = quote.valid_until.strftime("%d %b %Y") if quote.valid_until else "-"
    total = f"{symbol}{quote.total:,.0f}"

    messages = {
        "en": f"""Hello {customer.name}! 👋

Your quotation from {user.business_name} is ready.

📋 Quote #: {quote.quote_number}
💰 Total: {total}
📅 Valid Until: {valid_until}

Please reply *APPROVED* to proceed or call us for any questions.

Thank you! 🙏""",
        "ta": f"""வணக்கம் {customer.name}! 👋

{user.business_name} உங்கள் மேற்கோள் தயார்.

📋 மேற்கோள் #: {quote.quote_number}
💰 மொத்தம்: {total}
📅 செல்லுபடியாகும் வரை: {valid_until}

*ஒப்புதல்* என்று பதில் அனுப்புங்கள்.

நன்றி! 🙏""",
        "hi": f"""नमस्ते {customer.name}! 👋

{user.business_name} से आपका कोटेशन तैयार है।

📋 कोटेशन #: {quote.quote_number}
💰 कुल: {total}
📅 वैध तक: {valid_until}

*APPROVED* लिखकर जवाब दें।

धन्यवाद! 🙏""",
        "kn": f"""ನಮಸ್ಕಾರ {customer.name}! 👋

{user.business_name} ಉದ್ಧರಣ ಸಿದ್ಧವಾಗಿದೆ.

📋 ಉದ್ಧರಣ #: {quote.quote_number}
💰 ಒಟ್ಟು: {total}

*APPROVED* ಎಂದು ಉತ್ತರಿಸಿ. ಧನ್ಯವಾದ! 🙏""",
        "te": f"""నమస్కారం {customer.name}! 👋

{user.business_name} కోటేషన్ సిద్ధంగా ఉంది.

📋 కోటేషన్ #: {quote.quote_number}
💰 మొత్తం: {total}

*APPROVED* అని రిప్లై చేయండి. ధన్యవాదాలు! 🙏""",
        "ml": f"""നമസ്കാരം {customer.name}! 👋

{user.business_name} ക്വൊട്ടേഷൻ തയ്യാർ.

📋 ക്വൊട്ടേഷൻ #: {quote.quote_number}
💰 ആകെ: {total}

*APPROVED* എന്ന് മറുപടി അയക്കൂ. നന്ദി! 🙏""",
    }
    return messages.get(language, messages["en"])


def build_invoice_message(invoice, customer, user, language: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(user.currency, user.currency + " ")
    due_date = invoice.due_date.strftime("%d %b %Y") if invoice.due_date else "-"
    amount = f"{symbol}{invoice.amount:,.0f}"

    messages = {
        "en": f"""Hello {customer.name}! 👋

Here is your invoice from {user.business_name}.

🧾 Invoice #: {invoice.invoice_number}
💰 Amount Due: {amount}
📅 Due Date: {due_date}

Please make payment by the due date. Thank you! 🙏""",
        "ta": f"""வணக்கம் {customer.name}! 👋

{user.business_name} இலிருந்து உங்கள் விலைப்பட்டியல்.

🧾 விலைப்பட்டியல் #: {invoice.invoice_number}
💰 செலுத்த வேண்டிய தொகை: {amount}
📅 கடைசி தேதி: {due_date}

தயவுசெய்து செலுத்துங்கள். நன்றி! 🙏""",
        "hi": f"""नमस्ते {customer.name}! 👋

{user.business_name} की ओर से आपका इनवॉइस।

🧾 इनवॉइस #: {invoice.invoice_number}
💰 देय राशि: {amount}
📅 नियत तारीख: {due_date}

कृपया समय पर भुगतान करें। धन्यवाद! 🙏""",
        "kn": f"""ನಮಸ್ಕಾರ {customer.name}! 👋

{user.business_name} ಇನ್ವಾಯ್ಸ್ ಸಿದ್ಧವಾಗಿದೆ.

🧾 ಇನ್ವಾಯ್ಸ್ #: {invoice.invoice_number}
💰 ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ: {amount}
📅 ದಿನಾಂಕ: {due_date}

ದಯವಿಟ್ಟು ಪಾವತಿಸಿ. ಧನ್ಯವಾದ! 🙏""",
        "te": f"""నమస్కారం {customer.name}! 👋

{user.business_name} నుండి మీ ఇన్వాయిస్.

🧾 ఇన్వాయిస్ #: {invoice.invoice_number}
💰 చెల్లించవలసిన మొత్తం: {amount}
📅 గడువు తేదీ: {due_date}

దయచేసి చెల్లించండి. ధన్యవాదాలు! 🙏""",
        "ml": f"""നമസ്കാരം {customer.name}! 👋

{user.business_name} യിൽ നിന്നുള്ള ഇൻവോയ്സ്.

🧾 ഇൻവോയ്സ് #: {invoice.invoice_number}
💰 അടയ്ക്കേണ്ട തുക: {amount}
📅 അവസാന തീയതി: {due_date}

ദയവായി അടയ്ക്കുക. നന്ദി! 🙏""",
    }
    return messages.get(language, messages["en"])
