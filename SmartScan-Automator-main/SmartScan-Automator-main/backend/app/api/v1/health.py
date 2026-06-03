from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from datetime import datetime
import platform
import sys

from app.core.database import get_db, engine
from app.models.user import User
from app.models.favorite import Favorite
from app.models.search_history import SearchHistory
from app.models.price_alert import PriceAlert
from app.scrapers import ALL_SCRAPERS

router = APIRouter(prefix="/health", tags=["health"])


class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    timestamp: str
    uptime_info: dict = {}
    database: dict = {}
    scrapers: dict = {}
    system: dict = {}


class ScraperStatusItem(BaseModel):
    name: str
    available: bool = True
    last_response_time: float = 0.0


@router.get("", response_model=HealthCheckResponse)
async def health_check(
    db: AsyncSession = Depends(get_db)
):
    db_status = await check_database_health(db)
    scraper_status = check_scraper_status()
    system_info = get_system_info()

    overall_status = "healthy"
    if not db_status.get("connected", False):
        overall_status = "degraded"

    return HealthCheckResponse(
        status=overall_status,
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        uptime_info={
            "started_at": datetime.utcnow().isoformat(),
        },
        database=db_status,
        scrapers=scraper_status,
        system=system_info,
    )


async def check_database_health(db: AsyncSession) -> dict:
    try:
        user_count = await db.execute(select(func.count(User.id)))
        total_users = user_count.scalar() or 0

        fav_count = await db.execute(select(func.count(Favorite.id)))
        total_favorites = fav_count.scalar() or 0

        alert_count = await db.execute(select(func.count(PriceAlert.id)))
        total_alerts = alert_count.scalar() or 0

        search_count = await db.execute(select(func.count(SearchHistory.id)))
        total_searches = search_count.scalar() or 0

        return {
            "connected": True,
            "engine": str(engine.url).split("@")[0] if "@" in str(engine.url) else str(engine.url),
            "tables": {
                "users": total_users,
                "favorites": total_favorites,
                "price_alerts": total_alerts,
                "search_history": total_searches,
            }
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)[:200],
        }


def check_scraper_status() -> dict:
    scrapers = []
    for scraper in ALL_SCRAPERS:
        scrapers.append({
            "name": getattr(scraper, "SITE_NAME", "Unknown"),
            "available": True,
        })

    return {
        "total_scrapers": len(scrapers),
        "active_scrapers": len(scrapers),
        "scrapers": scrapers,
    }


def get_system_info() -> dict:
    return {
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "architecture": platform.machine(),
        "processor": platform.processor() or "unknown",
    }


@router.get("/ping")
async def ping():
    return {
        "pong": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db)
):
    try:
        await db.execute(select(func.count(User.id)))
        return {
            "ready": True,
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "ready": False,
            "database": "disconnected",
            "error": str(e)[:200],
            "timestamp": datetime.utcnow().isoformat(),
        }
