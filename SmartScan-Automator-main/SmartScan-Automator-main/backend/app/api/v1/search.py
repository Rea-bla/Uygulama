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

import time

CACHE = {}
CACHE_TTL = 300

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

    tasks = []
    scrapers_to_run = []
    results = []
    
    current_time = time.time()
    
    for scraper in target_scrapers:
        site_name = getattr(scraper, 'SITE_NAME', '')
        cache_key = (q.lower(), site_name)
        
        if cache_key in CACHE and (current_time - CACHE[cache_key][0]) < CACHE_TTL:
            results.extend(CACHE[cache_key][1])
        else:
            scrapers_to_run.append(scraper)
            tasks.append(scraper.search(q))

    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    for i, site_results in enumerate(all_results):
        if isinstance(site_results, list):
            results.extend(site_results)
            site_name = getattr(scrapers_to_run[i], 'SITE_NAME', '')
            CACHE[(q.lower(), site_name)] = (current_time, site_results)

    # Filtering removed to allow scraper's native search ranking to shine

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
                "badge": getattr(r, 'badge', ""),
            }
            for r in results[:limit_int]
        ]
    }