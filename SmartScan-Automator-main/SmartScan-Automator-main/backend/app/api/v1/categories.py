from fastapi import APIRouter

router = APIRouter(prefix="/categories", tags=["categories"])

# Önceden tanımlanmış ürün kategorileri (Türkçe isim, ikon, açıklama ve arama anahtar kelimeleri)
CATEGORIES = [
    {
        "id": "elektronik",
        "name": "Elektronik & Bilgisayar",
        "icon": "💻",
        "description": "Laptop, tablet, bilgisayar ve aksesuarları",
        "keywords": ["laptop", "bilgisayar", "tablet", "monitor", "klavye", "mouse"],
        "color": "#6366f1"
    },
    {
        "id": "giyim",
        "name": "Giyim & Moda",
        "icon": "👗",
        "description": "Kadın, erkek ve çocuk giyim ürünleri",
        "keywords": ["kazak", "pantolon", "elbise", "tişört", "ceket", "ayakkabı"],
        "color": "#ec4899"
    },
    {
        "id": "beyaz-esya",
        "name": "Beyaz Eşya & Ev Aletleri",
        "icon": "🏠",
        "description": "Bulaşık makinesi, çamaşır makinesi, buzdolabı",
        "keywords": ["bulaşık makinesi", "çamaşır makinesi", "buzdolabı", "fırın", "mikrodalga"],
        "color": "#14b8a6"
    },
    {
        "id": "kozmetik",
        "name": "Kozmetik & Kişisel Bakım",
        "icon": "💄",
        "description": "Makyaj, cilt bakım, parfüm ve kişisel bakım",
        "keywords": ["parfüm", "ruj", "fondöten", "şampuan", "krem"],
        "color": "#f43f5e"
    },
    {
        "id": "spor",
        "name": "Spor & Outdoor",
        "icon": "⚽",
        "description": "Spor ayakkabı, spor giyim, fitness ekipmanları",
        "keywords": ["spor ayakkabı", "koşu ayakkabısı", "dumbbell", "yoga matı", "forma"],
        "color": "#22c55e"
    },
    {
        "id": "oyun",
        "name": "Oyun & Hobi",
        "icon": "🎮",
        "description": "Oyun konsolu, oyuncu ekipmanları ve hobi",
        "keywords": ["playstation", "xbox", "gaming laptop", "oyuncu mouse", "kulaklık"],
        "color": "#8b5cf6"
    },
    {
        "id": "telefon",
        "name": "Telefon & Aksesuar",
        "icon": "📱",
        "description": "Akıllı telefon, kılıf, şarj aleti, kulaklık",
        "keywords": ["iphone", "samsung", "xiaomi", "telefon kılıfı", "airpods"],
        "color": "#f59e0b"
    },
    {
        "id": "anne-bebek",
        "name": "Anne & Bebek",
        "icon": "👶",
        "description": "Bebek bezi, mama, bebek arabası, oyuncak",
        "keywords": ["bebek bezi", "bebek arabası", "mama sandalyesi", "oyuncak", "biberon"],
        "color": "#06b6d4"
    }
]


@router.get("/")
async def get_categories():
    """Tüm ürün kategorilerini döndürür"""
    return {"categories": CATEGORIES}


@router.get("/{category_id}")
async def get_category(category_id: str):
    """Belirtilen ID'ye sahip kategoriyi döndürür"""
    category = next((c for c in CATEGORIES if c["id"] == category_id), None)
    if not category:
        return {"error": "Kategori bulunamadı"}, 404
    return category
