import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.search import router as search_router
from app.api.v1.auth import router as auth_router
from app.api.v1.favorites import router as favorites_router
from app.api.v1.profile import router as profile_router
from app.api.v1.price_alerts import router as price_alerts_router
from app.api.v1.search_history import router as search_history_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.export import router as export_router

from app.core.middleware import (
    RequestLoggingMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.exceptions import register_exception_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("smartscan")

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SmartScan Automator API başlatılıyor...")
    logger.info("Veritabanı bağlantısı kontrol ediliyor...")
    logger.info("Scraper modülleri yükleniyor...")

    yield

    logger.info("SmartScan Automator API kapatılıyor...")


app = FastAPI(
    title="SmartScan Automator API",
    description=(
        "Türkiye'nin en büyük e-ticaret platformlarında "
        "anlık fiyat karşılaştırma ve takip sistemi. "
        "Trendyol, Hepsiburada, Amazon TR, MediaMarkt, "
        "Vatan Bilgisayar, Teknosa, n11 ve Çiçeksepeti "
        "platformlarını destekler."
    ),
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:19006",
    "http://localhost:8081",
    "http://localhost:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Process-Time",
        "X-Request-ID",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
    max_age=600,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=120, window_seconds=60)

register_exception_handlers(app)

app.include_router(search_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")
app.include_router(price_alerts_router, prefix="/api/v1")
app.include_router(search_history_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "service": "SmartScan Automator API",
        "version": "1.2.0",
        "status": "operational",
        "documentation": "/docs",
        "endpoints": {
            "search": "/api/v1/search",
            "auth": "/api/v1/auth",
            "favorites": "/api/v1/favorites",
            "profile": "/api/v1/profile",
            "price_alerts": "/api/v1/price-alerts",
            "search_history": "/api/v1/search-history",
            "analytics": "/api/v1/analytics",
            "notifications": "/api/v1/notifications",
            "export": "/api/v1/export",
            "health": "/api/v1/health",
        }
    }


@app.get("/api/v1")
def api_info():
    return {
        "api": "SmartScan Automator",
        "version": "1.2.0",
        "supported_sites": [
            "Trendyol",
            "Hepsiburada",
            "Amazon TR",
            "MediaMarkt",
            "Vatan Bilgisayar",
            "Teknosa",
            "n11",
            "Çiçeksepeti",
        ],
        "features": [
            "Anlık fiyat karşılaştırma",
            "Akıllı kategori algılama",
            "Kullanıcı hesap yönetimi",
            "Favori ürün takibi",
            "Fiyat alarm sistemi",
            "Arama geçmişi",
            "Analitik dashboard",
            "Bildirim sistemi",
            "Veri dışa aktarma (CSV/JSON)",
        ],
    }