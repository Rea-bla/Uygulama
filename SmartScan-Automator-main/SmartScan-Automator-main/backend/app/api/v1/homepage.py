from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import time
import random
import logging

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.search_history import SearchHistory
from app.models.user import User
from app.scrapers import ALL_SCRAPERS
from app.api.v1.search import CACHE, CACHE_TTL

logger = logging.getLogger("smartscan.homepage")

router = APIRouter(prefix="/homepage", tags=["homepage"])

# Popüler arama terimleri — indirimli ürün bulmak için kullanılacak
POPULAR_DEAL_QUERIES = [
    "laptop", "kulaklık", "telefon", "airpods", "tablet",
    "ayakkabı", "parfüm", "çanta", "saat", "oyun konsolu"
]

# Trending aramalarda fallback listesi (veritabanında kayıt yoksa)
FALLBACK_TRENDING = [
    "gaming laptop", "iphone 16", "airpods pro", "samsung galaxy",
    "nike ayakkabı", "parfüm", "playstation 5", "robot süpürge",
    "macbook", "lego"
]

# Hızlı scraper'lar (curl_cffi tabanlı — daha hızlı yanıt verir)
FAST_SCRAPER_NAMES = ["Hepsiburada", "MediaMarkt", "n11", "Teknosa", "Vatan Bilgisayar"]

# Homepage verisi için ayrı cache (daha uzun TTL, anlık olması gerekmez)
HOMEPAGE_CACHE = {}
HOMEPAGE_CACHE_TTL = 600  # 10 dakika


# --- Opsiyonel auth helper (401 fırlatmaz, None döner) ---
async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Auth kontrolünü yapar ama başarısız olursa None döner (401 fırlatmaz).
    Homepage gibi hem giriş yapan hem yapmayan kullanıcılara hizmet veren
    endpoint'ler için kullanılır.
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        email = decode_access_token(token)
        if not email:
            return None

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        return user  # User veya None
    except Exception:
        return None


def _get_fast_scrapers():
    """Hızlı scraper alt kümesini döndürür"""
    return [
        s for s in ALL_SCRAPERS
        if getattr(s, 'SITE_NAME', '') in FAST_SCRAPER_NAMES
    ]


def _product_to_dict(r) -> dict:
    """ProductPrice nesnesini sözlüğe çevirir (search.py formatına uygun)"""
    return {
        "site": r.site,
        "name": r.name,
        "price": r.price,
        "original_price": r.original_price,
        "url": r.url,
        "image_url": r.image_url,
        "in_stock": r.in_stock,
        "rating": getattr(r, 'rating', 0.0),
        "review_count": getattr(r, 'review_count', 0),
        "badge": getattr(r, 'badge', ""),
    }


async def _search_with_cache(query: str, use_fast_only: bool = True) -> list:
    """
    Önce search CACHE'e bakar, yoksa scraper çalıştırır.
    Sonuçları ProductPrice dict listesi olarak döndürür.
    """
    current_time = time.time()
    results = []
    scrapers_to_run = []
    tasks = []

    target_scrapers = _get_fast_scrapers() if use_fast_only else ALL_SCRAPERS

    for scraper in target_scrapers:
        site_name = getattr(scraper, 'SITE_NAME', '')
        cache_key = (query.lower(), site_name)

        if cache_key in CACHE and (current_time - CACHE[cache_key][0]) < CACHE_TTL:
            # Cache'den oku — ProductPrice nesneleri
            for r in CACHE[cache_key][1]:
                results.append(_product_to_dict(r))
        else:
            scrapers_to_run.append(scraper)
            tasks.append(scraper.search(query))

    if tasks:
        all_results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, site_results in enumerate(all_results):
            if isinstance(site_results, list):
                site_name = getattr(scrapers_to_run[i], 'SITE_NAME', '')
                CACHE[(query.lower(), site_name)] = (current_time, site_results)
                for r in site_results:
                    results.append(_product_to_dict(r))

    return results


FALLBACK_DEALS = [
    {"site": "Trendyol", "name": "JBL Tune 520BT Kablosuz Kulak Üstü Kulaklık", "price": 849.00, "original_price": 1299.00, "discount_pct": 35, "url": "https://www.trendyol.com", "image_url": ""},
    {"site": "Hepsiburada", "name": "Xiaomi Redmi Buds 5 TWS Bluetooth Kulaklık", "price": 599.00, "original_price": 999.00, "discount_pct": 40, "url": "https://www.hepsiburada.com", "image_url": ""},
    {"site": "Amazon TR", "name": "Logitech G203 LIGHTSYNC Gaming Mouse", "price": 349.00, "original_price": 549.00, "discount_pct": 36, "url": "https://www.amazon.com.tr", "image_url": ""},
    {"site": "MediaMarkt", "name": "Samsung Galaxy Buds FE Kablosuz Kulaklık", "price": 1199.00, "original_price": 1999.00, "discount_pct": 40, "url": "https://www.mediamarkt.com.tr", "image_url": ""},
    {"site": "Teknosa", "name": "Apple AirPods 4 Bluetooth Kulaklık", "price": 4299.00, "original_price": 5499.00, "discount_pct": 22, "url": "https://www.teknosa.com", "image_url": ""},
    {"site": "n11", "name": "Anker Soundcore Life Q30 ANC Kulaklık", "price": 1149.00, "original_price": 1799.00, "discount_pct": 36, "url": "https://www.n11.com", "image_url": ""},
    {"site": "Vatan Bilgisayar", "name": "Corsair HS65 Surround Gaming Kulaklık", "price": 1599.00, "original_price": 2199.00, "discount_pct": 27, "url": "https://www.vatanbilgisayar.com", "image_url": ""},
    {"site": "Trendyol", "name": "Nike Revolution 7 Erkek Koşu Ayakkabısı", "price": 1299.00, "original_price": 2199.00, "discount_pct": 41, "url": "https://www.trendyol.com", "image_url": ""},
    {"site": "Hepsiburada", "name": "Philips SHB3075 Bass+ Bluetooth Kulaklık", "price": 449.00, "original_price": 749.00, "discount_pct": 40, "url": "https://www.hepsiburada.com", "image_url": ""},
    {"site": "Amazon TR", "name": "Baseus Bowie 30 TWS Kablosuz Kulaklık", "price": 279.00, "original_price": 499.00, "discount_pct": 44, "url": "https://www.amazon.com.tr", "image_url": ""},
]


@router.get("/deals")
async def get_deals():
    """
    İndirimli ürünleri döndürür.
    Önce cache'e bakar. Cache boşsa hemen fallback veri döner.
    Arka planda scraper çalıştırıp cache'i doldurur.
    """
    current_time = time.time()

    # 1) Homepage cache kontrolü — varsa hemen dön
    if "deals" in HOMEPAGE_CACHE:
        cached_time, cached_data = HOMEPAGE_CACHE["deals"]
        if (current_time - cached_time) < HOMEPAGE_CACHE_TTL:
            return cached_data

    # 2) Search CACHE'de önceki aramalardan veri var mı kontrol et
    cached_deals = []
    for cache_key, (ts, products) in CACHE.items():
        if (current_time - ts) < CACHE_TTL:
            for r in products:
                d = _product_to_dict(r)
                op = d.get("original_price")
                p = d.get("price", 0)
                if op and p and op > p and p > 0:
                    pct = round((1 - p / op) * 100)
                    cached_deals.append({**d, "discount_pct": pct})

    if cached_deals:
        cached_deals.sort(key=lambda x: x["discount_pct"], reverse=True)
        top = cached_deals[:20]
        response = {"deals": top, "count": len(top), "queries_used": ["cache"]}
        HOMEPAGE_CACHE["deals"] = (current_time, response)
        return response

    # 3) Cache'de hiçbir şey yoksa — fallback veri döndür (anında yüklenir)
    # Arka planda scraper'ları tetikle (bir sonraki istek için cache dolsun)
    asyncio.create_task(_background_deals_fetch())

    response = {
        "deals": FALLBACK_DEALS,
        "count": len(FALLBACK_DEALS),
        "queries_used": ["fallback"],
    }
    return response


async def _background_deals_fetch():
    """Arka planda scraper çalıştırıp deals cache'ini doldurur."""
    try:
        queries = random.sample(POPULAR_DEAL_QUERIES, 3)
        all_products = []
        search_tasks = [_search_with_cache(q, use_fast_only=True) for q in queries]
        search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

        for result in search_results:
            if isinstance(result, list):
                all_products.extend(result)

        deals = []
        for product in all_products:
            op = product.get("original_price")
            p = product.get("price", 0)
            if op and p and op > p and p > 0:
                pct = round((1 - p / op) * 100)
                deals.append({**product, "discount_pct": pct})

        deals.sort(key=lambda x: x["discount_pct"], reverse=True)
        top = deals[:20]

        if top:
            HOMEPAGE_CACHE["deals"] = (time.time(), {
                "deals": top,
                "count": len(top),
                "queries_used": queries,
            })
            logger.info(f"Deals cache güncellendi: {len(top)} ürün")
    except Exception as e:
        logger.warning(f"Background deals fetch hatası: {e}")


@router.get("/trending")
async def get_trending(db: AsyncSession = Depends(get_db)):
    """
    Son 7 gündeki en popüler arama terimlerini döndürür.
    search_history tablosundan gruplanmış sorguları sayar.
    Kayıt yoksa hardcoded fallback listesini döndürür.
    """
    try:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        # Son 7 gündeki aramaları grupla ve say
        result = await db.execute(
            select(
                SearchHistory.query,
                func.count(SearchHistory.id).label("search_count"),
                func.max(SearchHistory.searched_at).label("last_searched")
            )
            .where(SearchHistory.searched_at >= seven_days_ago)
            .group_by(SearchHistory.query)
            .order_by(desc("search_count"))
            .limit(15)
        )
        rows = result.all()

        if rows and len(rows) > 0:
            trending = [
                {
                    "query": row.query,
                    "count": row.search_count,
                    "last_searched": row.last_searched.isoformat() if row.last_searched else None,
                }
                for row in rows
            ]
            return {
                "trending": trending,
                "count": len(trending),
                "source": "database",
            }
    except Exception as e:
        logger.warning(f"Trending sorgusu başarısız: {e}")

    # Fallback — veritabanında yeterli kayıt yoksa
    fallback = [
        {"query": q, "count": 0, "last_searched": None}
        for q in FALLBACK_TRENDING
    ]
    return {
        "trending": fallback,
        "count": len(fallback),
        "source": "fallback",
    }


@router.get("/recommendations")
async def get_recommendations(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Kişiselleştirilmiş ürün önerileri döndürür.
    - Giriş yapmış kullanıcı: Son aramalarına dayalı öneriler (Sizin İçin Öneriler)
    - Giriş yapmamış kullanıcı: Popüler ürünler (Popüler Ürünler)
    """
    # Opsiyonel auth — 401 fırlatmaz
    current_user = await get_current_user_optional(request, db)

    # Kullanıcı giriş yapmışsa, kişiselleştirilmiş öneriler sun
    if current_user:
        try:
            # Son 10 aramayı getir
            history_result = await db.execute(
                select(SearchHistory.query)
                .where(SearchHistory.user_id == current_user.id)
                .order_by(desc(SearchHistory.searched_at))
                .limit(10)
            )
            recent_queries = history_result.scalars().all()

            if recent_queries:
                # Benzersiz arama terimlerini al
                unique_queries = list(dict.fromkeys(recent_queries))  # sırayı koruyarak unique

                # En fazla 3 terim için arama yap
                queries_to_search = unique_queries[:3]
                all_recommendations = []

                search_tasks = [
                    _search_with_cache(q, use_fast_only=True)
                    for q in queries_to_search
                ]
                search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

                for result in search_results:
                    if isinstance(result, list):
                        all_recommendations.extend(result)

                # Tekrar eden ürünleri URL'ye göre filtrele
                seen_urls = set()
                unique_recommendations = []
                for product in all_recommendations:
                    url = product.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        unique_recommendations.append(product)

                return {
                    "label": "Sizin İçin Öneriler",
                    "recommendations": unique_recommendations[:20],
                    "count": min(len(unique_recommendations), 20),
                    "based_on": queries_to_search,
                    "personalized": True,
                }
        except Exception as e:
            logger.warning(f"Kişiselleştirilmiş öneriler yüklenemedi: {e}")

    # Giriş yapmamış veya geçmişi olmayan kullanıcılar için
    # Scraper çalıştırmadan mevcut cache'deki verileri kullan
    try:
        cached_products = []
        current_time = time.time()
        for cache_key, (ts, products) in CACHE.items():
            if (current_time - ts) < CACHE_TTL:
                for r in products:
                    cached_products.append(_product_to_dict(r))

        if cached_products:
            # Tekrar eden ürünleri filtrele
            seen_urls = set()
            unique_products = []
            for product in cached_products:
                url = product.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_products.append(product)

            # Rastgele karıştır
            random.shuffle(unique_products)

            return {
                "label": "Popüler Ürünler",
                "recommendations": unique_products[:20],
                "count": min(len(unique_products), 20),
                "based_on": ["cache"],
                "personalized": False,
            }
    except Exception as e:
        logger.error(f"Popüler ürünler yüklenemedi: {e}")

    return {
        "label": "Popüler Ürünler",
        "recommendations": [],
        "count": 0,
        "based_on": [],
        "personalized": False,
    }
