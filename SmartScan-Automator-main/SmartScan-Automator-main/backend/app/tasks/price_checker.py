import asyncio
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.models.price_alert import PriceAlert
from app.models.notification import Notification
from app.scrapers import ALL_SCRAPERS
from app.scrapers.base import ProductPrice

logger = logging.getLogger("smartscan.tasks.price_checker")


class PriceAlertChecker:
    def __init__(self, check_interval_seconds: int = 3600):
        self.check_interval = check_interval_seconds
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self.is_running:
            logger.warning("Price alert checker is already running")
            return

        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(
            f"Price alert checker started with interval {self.check_interval}s"
        )

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Price alert checker stopped")

    async def _run_loop(self):
        while self.is_running:
            try:
                await self._check_all_alerts()
            except Exception as e:
                logger.error(f"Error in price alert check loop: {e}", exc_info=True)

            await asyncio.sleep(self.check_interval)

    async def _check_all_alerts(self):
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(
                    select(PriceAlert).where(
                        PriceAlert.is_active == True,
                        PriceAlert.is_triggered == False
                    )
                )
                active_alerts = result.scalars().all()

                if not active_alerts:
                    logger.debug("No active price alerts to check")
                    return

                logger.info(f"Checking {len(active_alerts)} active price alerts")

                for alert in active_alerts:
                    try:
                        await self._check_single_alert(db, alert)
                    except Exception as e:
                        logger.error(
                            f"Error checking alert {alert.id}: {e}",
                            exc_info=True
                        )

                await db.commit()

            except Exception as e:
                await db.rollback()
                logger.error(f"Database error in alert checker: {e}", exc_info=True)

    async def _check_single_alert(self, db: AsyncSession, alert: PriceAlert):
        current_price = await self._fetch_current_price(alert.product_url, alert.site)

        if current_price is None:
            logger.debug(
                f"Could not fetch price for alert {alert.id} "
                f"(url={alert.product_url[:60]})"
            )
            alert.check_count = (alert.check_count or 0) + 1
            alert.last_checked_at = datetime.utcnow()
            db.add(alert)
            return

        triggered = alert.check_trigger(current_price)
        db.add(alert)

        if triggered:
            logger.info(
                f"Price alert triggered! Alert {alert.id}: "
                f"target={alert.target_price}, current={current_price}"
            )
            await self._create_trigger_notification(db, alert, current_price)

    async def _fetch_current_price(self, url: str, site_name: str) -> Optional[float]:
        target_scraper = None
        for scraper in ALL_SCRAPERS:
            if getattr(scraper, "SITE_NAME", "") == site_name:
                target_scraper = scraper
                break

        if not target_scraper:
            return None

        try:
            result = await asyncio.wait_for(
                target_scraper.get_price(url),
                timeout=30
            )

            if result and isinstance(result, ProductPrice):
                return result.price

        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching price from {site_name}")
        except Exception as e:
            logger.error(f"Error fetching price from {site_name}: {e}")

        return None

    async def _create_trigger_notification(
        self,
        db: AsyncSession,
        alert: PriceAlert,
        current_price: float
    ):
        savings = alert.target_price - current_price if current_price < alert.target_price else 0
        savings_text = f" ({savings:.2f} TL tasarruf!)" if savings > 0 else ""

        notification = Notification(
            user_id=alert.user_id,
            title="🎯 Fiyat Alarmı Tetiklendi!",
            message=(
                f"{alert.product_name[:100]} ürünü hedef fiyatınızın "
                f"altına düştü! Şu anki fiyat: {current_price:.2f} TL "
                f"(Hedef: {alert.target_price:.2f} TL){savings_text}"
            ),
            type="price_alert",
            link=alert.product_url,
            icon="🔔",
        )
        db.add(notification)


class SearchCacheManager:
    def __init__(self, max_cache_size: int = 1000, ttl_seconds: int = 300):
        self.max_cache_size = max_cache_size
        self.ttl_seconds = ttl_seconds
        self._cache: dict = {}
        self._access_times: dict = {}

    def get(self, key: str) -> Optional[list]:
        if key not in self._cache:
            return None

        cached_time = self._access_times.get(key, 0)
        import time
        if time.time() - cached_time > self.ttl_seconds:
            self._remove(key)
            return None

        return self._cache[key]

    def set(self, key: str, value: list):
        if len(self._cache) >= self.max_cache_size:
            self._evict_oldest()

        import time
        self._cache[key] = value
        self._access_times[key] = time.time()

    def _remove(self, key: str):
        self._cache.pop(key, None)
        self._access_times.pop(key, None)

    def _evict_oldest(self):
        if not self._access_times:
            return

        oldest_key = min(self._access_times, key=self._access_times.get)
        self._remove(oldest_key)

    def clear(self):
        self._cache.clear()
        self._access_times.clear()

    @property
    def size(self) -> int:
        return len(self._cache)

    def get_stats(self) -> dict:
        return {
            "cache_size": self.size,
            "max_cache_size": self.max_cache_size,
            "ttl_seconds": self.ttl_seconds,
        }


class ProductComparator:
    @staticmethod
    def compare_prices(results: list) -> dict:
        if not results:
            return {
                "cheapest": None,
                "most_expensive": None,
                "price_range": 0,
                "avg_price": 0,
                "site_comparison": [],
            }

        prices = [(r.site, r.name, r.price, r.url) for r in results if r.price > 0]

        if not prices:
            return {
                "cheapest": None,
                "most_expensive": None,
                "price_range": 0,
                "avg_price": 0,
                "site_comparison": [],
            }

        sorted_by_price = sorted(prices, key=lambda x: x[2])

        cheapest = sorted_by_price[0]
        most_expensive = sorted_by_price[-1]
        avg_price = sum(p[2] for p in prices) / len(prices)
        price_range = most_expensive[2] - cheapest[2]

        site_groups = {}
        for site, name, price, url in prices:
            if site not in site_groups:
                site_groups[site] = {
                    "site": site,
                    "min_price": price,
                    "max_price": price,
                    "avg_price": price,
                    "count": 1,
                    "prices": [price],
                }
            else:
                site_groups[site]["prices"].append(price)
                site_groups[site]["count"] += 1
                site_groups[site]["min_price"] = min(site_groups[site]["min_price"], price)
                site_groups[site]["max_price"] = max(site_groups[site]["max_price"], price)
                site_groups[site]["avg_price"] = sum(site_groups[site]["prices"]) / site_groups[site]["count"]

        site_comparison = []
        for site_data in site_groups.values():
            del site_data["prices"]
            site_data["avg_price"] = round(site_data["avg_price"], 2)
            site_data["savings_vs_avg"] = round(avg_price - site_data["min_price"], 2)
            site_comparison.append(site_data)

        site_comparison.sort(key=lambda x: x["min_price"])

        return {
            "cheapest": {
                "site": cheapest[0],
                "name": cheapest[1],
                "price": cheapest[2],
                "url": cheapest[3],
            },
            "most_expensive": {
                "site": most_expensive[0],
                "name": most_expensive[1],
                "price": most_expensive[2],
                "url": most_expensive[3],
            },
            "price_range": round(price_range, 2),
            "avg_price": round(avg_price, 2),
            "total_results": len(prices),
            "site_comparison": site_comparison,
        }

    @staticmethod
    def find_best_deals(results: list, top_n: int = 5) -> list:
        deals = []
        for r in results:
            if r.original_price and r.original_price > r.price:
                discount_pct = ((r.original_price - r.price) / r.original_price) * 100
                deals.append({
                    "site": r.site,
                    "name": r.name,
                    "price": r.price,
                    "original_price": r.original_price,
                    "discount_percentage": round(discount_pct, 1),
                    "savings": round(r.original_price - r.price, 2),
                    "url": r.url,
                    "image_url": getattr(r, "image_url", ""),
                })

        deals.sort(key=lambda x: x["discount_percentage"], reverse=True)
        return deals[:top_n]
