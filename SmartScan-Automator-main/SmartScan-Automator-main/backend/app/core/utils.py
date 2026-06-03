import re
import html
from typing import Optional
from urllib.parse import urlparse


def sanitize_search_query(query: str) -> str:
    if not query:
        return ""

    query = query.strip()
    query = html.escape(query)
    query = re.sub(r'[<>{}|\\^~`]', '', query)
    query = re.sub(r'\s+', ' ', query)

    if len(query) > 500:
        query = query[:500]

    return query


def normalize_price(price_str: str) -> Optional[float]:
    if not price_str:
        return None

    price_str = str(price_str).strip()
    price_str = price_str.replace("TL", "").replace("₺", "").strip()
    price_str = price_str.replace(".", "").replace(",", ".")

    try:
        value = float(price_str)
        if value < 0:
            return None
        return round(value, 2)
    except (ValueError, TypeError):
        return None


def normalize_url(url: str) -> str:
    if not url:
        return ""

    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return ""
        return url
    except Exception:
        return ""


def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def calculate_discount_percentage(original_price: float, current_price: float) -> Optional[float]:
    if not original_price or not current_price:
        return None
    if original_price <= 0 or current_price <= 0:
        return None
    if original_price <= current_price:
        return None

    discount = ((original_price - current_price) / original_price) * 100
    return round(discount, 1)


def format_price_turkish(price: float) -> str:
    if price is None:
        return "0,00 TL"

    price_str = f"{price:,.2f}"
    parts = price_str.split(".")
    integer_part = parts[0].replace(",", ".")
    decimal_part = parts[1] if len(parts) > 1 else "00"

    return f"{integer_part},{decimal_part} TL"


def validate_email(email: str) -> bool:
    if not email:
        return False

    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> dict:
    result = {
        "is_valid": True,
        "score": 0,
        "errors": [],
        "strength": "weak",
    }

    if len(password) < 6:
        result["errors"].append("Şifre en az 6 karakter olmalıdır")
        result["is_valid"] = False

    if len(password) >= 8:
        result["score"] += 1
    if len(password) >= 12:
        result["score"] += 1
    if re.search(r'[a-z]', password):
        result["score"] += 1
    if re.search(r'[A-Z]', password):
        result["score"] += 1
    if re.search(r'[0-9]', password):
        result["score"] += 1
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        result["score"] += 1

    if result["score"] <= 2:
        result["strength"] = "weak"
    elif result["score"] <= 4:
        result["strength"] = "medium"
    else:
        result["strength"] = "strong"

    return result


def generate_product_slug(product_name: str) -> str:
    if not product_name:
        return ""

    slug = product_name.lower()

    turkish_map = {
        "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
        "Ç": "C", "Ğ": "G", "İ": "I", "Ö": "O", "Ş": "S", "Ü": "U",
    }
    for tr_char, en_char in turkish_map.items():
        slug = slug.replace(tr_char, en_char)

    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')

    if len(slug) > 200:
        slug = slug[:200].rstrip('-')

    return slug


def parse_storage_from_name(product_name: str) -> Optional[str]:
    if not product_name:
        return None

    patterns = [
        r'(\d+)\s*TB',
        r'(\d+)\s*GB',
        r'(\d+)\s*MB',
    ]

    for pattern in patterns:
        match = re.search(pattern, product_name, re.IGNORECASE)
        if match:
            value = int(match.group(1))
            if 'TB' in pattern:
                return f"{value} TB"
            elif 'GB' in pattern:
                return f"{value} GB"
            elif 'MB' in pattern:
                return f"{value} MB"

    return None


def parse_color_from_name(product_name: str) -> Optional[str]:
    colors = {
        "siyah": "Siyah", "black": "Siyah",
        "beyaz": "Beyaz", "white": "Beyaz",
        "mavi": "Mavi", "blue": "Mavi",
        "kırmızı": "Kırmızı", "red": "Kırmızı",
        "yeşil": "Yeşil", "green": "Yeşil",
        "mor": "Mor", "purple": "Mor",
        "pembe": "Pembe", "pink": "Pembe",
        "gri": "Gri", "grey": "Gri", "gray": "Gri",
        "sarı": "Sarı", "yellow": "Sarı",
        "turuncu": "Turuncu", "orange": "Turuncu",
        "altın": "Altın", "gold": "Altın",
        "gümüş": "Gümüş", "silver": "Gümüş",
        "titanium": "Titanyum", "titanyum": "Titanyum",
    }

    name_lower = product_name.lower()
    for keyword, color_name in colors.items():
        if keyword in name_lower:
            return color_name

    return None


def site_name_to_domain(site_name: str) -> str:
    site_domains = {
        "Trendyol": "trendyol.com",
        "Hepsiburada": "hepsiburada.com",
        "Amazon TR": "amazon.com.tr",
        "MediaMarkt": "mediamarkt.com.tr",
        "Vatan Bilgisayar": "vatanbilgisayar.com",
        "Teknosa": "teknosa.com",
        "n11": "n11.com",
        "Çiçeksepeti": "ciceksepeti.com",
    }
    return site_domains.get(site_name, "")
