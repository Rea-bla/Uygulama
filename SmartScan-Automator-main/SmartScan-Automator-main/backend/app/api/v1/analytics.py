from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User
from app.models.favorite import Favorite
from app.models.search_history import SearchHistory
from app.models.price_alert import PriceAlert
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


class SiteDistributionItem(BaseModel):
    site: str
    count: int
    percentage: float = 0.0


class PriceTrendItem(BaseModel):
    date: str
    avg_price: float
    min_price: float
    max_price: float
    search_count: int


class DashboardStatsSchema(BaseModel):
    total_searches: int = 0
    total_favorites: int = 0
    total_alerts: int = 0
    active_alerts: int = 0
    triggered_alerts: int = 0
    searches_today: int = 0
    searches_this_week: int = 0
    searches_this_month: int = 0
    favorite_sites: List[SiteDistributionItem] = []
    recent_activity: List[dict] = []
    price_trends: List[PriceTrendItem] = []
    savings_estimate: float = 0.0


class GlobalStatsSchema(BaseModel):
    total_users: int = 0
    total_searches_today: int = 0
    total_favorites: int = 0
    active_alerts: int = 0
    popular_searches: List[dict] = []
    site_coverage: List[str] = []


@router.get("/dashboard", response_model=DashboardStatsSchema)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    fav_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == current_user.id)
    )
    total_favorites = fav_result.scalar() or 0

    alert_result = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == current_user.id)
    )
    all_alerts = alert_result.scalars().all()
    total_alerts = len(all_alerts)
    active_alerts = sum(1 for a in all_alerts if a.is_active)
    triggered_alerts = sum(1 for a in all_alerts if a.is_triggered)

    searches_today_result = await db.execute(
        select(func.count(SearchHistory.id)).where(
            SearchHistory.user_id == current_user.id,
            SearchHistory.searched_at >= today_start
        )
    )
    searches_today = searches_today_result.scalar() or 0

    searches_week_result = await db.execute(
        select(func.count(SearchHistory.id)).where(
            SearchHistory.user_id == current_user.id,
            SearchHistory.searched_at >= week_start
        )
    )
    searches_this_week = searches_week_result.scalar() or 0

    searches_month_result = await db.execute(
        select(func.count(SearchHistory.id)).where(
            SearchHistory.user_id == current_user.id,
            SearchHistory.searched_at >= month_start
        )
    )
    searches_this_month = searches_month_result.scalar() or 0

    fav_sites_result = await db.execute(
        select(Favorite.site, func.count(Favorite.id).label("cnt"))
        .where(Favorite.user_id == current_user.id)
        .group_by(Favorite.site)
        .order_by(func.count(Favorite.id).desc())
    )
    fav_sites_rows = fav_sites_result.all()

    favorite_sites = []
    for site, count in fav_sites_rows:
        pct = round((count / total_favorites * 100), 1) if total_favorites > 0 else 0
        favorite_sites.append(SiteDistributionItem(
            site=site,
            count=count,
            percentage=pct,
        ))

    savings = 0.0
    fav_items_result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id)
    )
    fav_items = fav_items_result.scalars().all()
    for fav in fav_items:
        if fav.original_price and fav.original_price > fav.price:
            savings += (fav.original_price - fav.price)

    recent_searches_result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.searched_at.desc())
        .limit(10)
    )
    recent_searches = recent_searches_result.scalars().all()

    recent_activity = []
    for s in recent_searches:
        recent_activity.append({
            "type": "search",
            "description": f"'{s.query}' araması yapıldı ({s.result_count} sonuç)",
            "timestamp": s.searched_at.isoformat() if s.searched_at else None,
        })

    return DashboardStatsSchema(
        total_searches=current_user.search_count or 0,
        total_favorites=total_favorites,
        total_alerts=total_alerts,
        active_alerts=active_alerts,
        triggered_alerts=triggered_alerts,
        searches_today=searches_today,
        searches_this_week=searches_this_week,
        searches_this_month=searches_this_month,
        favorite_sites=favorite_sites,
        recent_activity=recent_activity,
        savings_estimate=round(savings, 2),
    )


@router.get("/global", response_model=GlobalStatsSchema)
async def get_global_stats(
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    user_count_result = await db.execute(
        select(func.count(User.id))
    )
    total_users = user_count_result.scalar() or 0

    today_searches_result = await db.execute(
        select(func.count(SearchHistory.id)).where(
            SearchHistory.searched_at >= today_start
        )
    )
    total_searches_today = today_searches_result.scalar() or 0

    total_fav_result = await db.execute(
        select(func.count(Favorite.id))
    )
    total_favorites = total_fav_result.scalar() or 0

    active_alerts_result = await db.execute(
        select(func.count(PriceAlert.id)).where(
            PriceAlert.is_active == True
        )
    )
    active_alerts = active_alerts_result.scalar() or 0

    site_coverage = [
        "Trendyol", "Hepsiburada", "Amazon TR",
        "MediaMarkt", "Vatan Bilgisayar", "Teknosa",
        "n11", "Çiçeksepeti"
    ]

    return GlobalStatsSchema(
        total_users=total_users,
        total_searches_today=total_searches_today,
        total_favorites=total_favorites,
        active_alerts=active_alerts,
        popular_searches=[],
        site_coverage=site_coverage,
    )
