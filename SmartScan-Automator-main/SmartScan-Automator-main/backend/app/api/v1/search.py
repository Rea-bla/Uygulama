from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.scrapers import ALL_SCRAPERS
import asyncio
from typing import Optional

CLOTHING_KEYWORDS = [
    'kazak', 'tişört', 'tisort', 't-shirt', 'pantolon', 'etek', 'elbise', 
    'gömlek', 'gomlek', 'ceket', 'mont', 'kaban', 'hırka', 'hirka', 
    'ayakkabı', 'ayakkabi', 'terlik', 'bot', 'çorap', 'corap', 'şapka', 
    'bere', 'atkı', 'eldiven', 'kıyafet', 'şort', 'sort', 'sweat', 'hoodie', 'kazagi'
]

router = APIRouter(prefix="/api/v1", tags=["search"])

@router.get("/search")
async def search_products(
    q: str = "",
    limit: Optional[str] = "500",
    sites: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        limit_int = int(limit) if limit and limit.strip() else 500
    except ValueError:
        limit_int = 500

    q = q.strip()
    if not q:
        return {"query": q, "results": [], "count": 0}

    target_scrapers = ALL_SCRAPERS
    
    # Akıllı Kategori Algılama (Eğer kullanıcı manuel site seçmediyse)
    if not sites:
        q_lower = q.lower().split()
        is_clothing = any(kw in q_lower for kw in CLOTHING_KEYWORDS)
        if is_clothing:
            target_scrapers = [s for s in ALL_SCRAPERS if getattr(s, 'SITE_NAME', '') not in ['MediaMarkt', 'Vatan Bilgisayar', 'Teknosa']]

    if sites:
        requested_sites = [s.strip() for s in sites.split(',')]
        if requested_sites:
            target_scrapers = [s for s in ALL_SCRAPERS if getattr(s, 'SITE_NAME', '') in requested_sites]
            if not target_scrapers:
                target_scrapers = ALL_SCRAPERS

    tasks = [scraper.search(q) for scraper in target_scrapers]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for site_results in all_results:
        if isinstance(site_results, list):
            results.extend(site_results)

    search_terms = q.lower().split()
    filtered_results = []
    for r in results:
        name_lower = r.name.lower()
        if all(term in name_lower for term in search_terms):
            filtered_results.append(r)
    results = filtered_results

    return {
        "query": q,
        "count": len(results),
        "results": [
            {
                "site": r.site,
                "name": r.name,
                "price": r.price,
                "original_price": r.original_price,
                "url": r.url,
                "image_url": r.image_url,
                "in_stock": r.in_stock,
                "rating": getattr(r, 'rating', 0.0),
                "review_count": getattr(r, 'review_count', 0),
            }
            for r in results[:limit_int]
        ]
    }