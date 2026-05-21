import re
import asyncio
from typing import Optional
from bs4 import BeautifulSoup
from app.scrapers.base import AbstractScraper, ProductPrice
from curl_cffi import requests

class VatanBilgisayarScraper(AbstractScraper):
    SITE_NAME = "Vatan Bilgisayar"
    BASE_URL = "https://www.vatanbilgisayar.com"

    async def search(self, query: str) -> list[ProductPrice]:
        results = []
        seen_urls = set()
        safe_query = query.strip().replace(" ", "%20")

        try:
            async with requests.AsyncSession(impersonate="chrome120") as session:
                # 1. VE 2. SAYFAYI EŞ ZAMANLI (CONCURRENT) OLARAK ÇEKELİM!
                async def fetch_page(page_num):
                    url = f"{self.BASE_URL}/arama/{safe_query}/?page={page_num}"
                    try:
                        resp = await session.get(url, timeout=15)
                        if resp.status_code == 200:
                            return resp.text
                    except:
                        pass
                    return None

                tasks = [fetch_page(1), fetch_page(2)]
                pages_html = await asyncio.gather(*tasks)

                for content in pages_html:
                    if not content: continue
                    soup = BeautifulSoup(content, "lxml")

                    items = [
                        el for el in soup.select(".product-list")
                        if el.select_one(".product-list__product-name")
                    ]

                    for item in items:
                        if len(results) >= 60:
                            break
                        try:
                            name_el  = item.select_one(".product-list__product-name")
                            price_el = item.select_one(".product-list__price")
                            link_el  = item.select_one("a[href]")
                            img_el   = item.select_one("img")

                            if not (name_el and price_el):
                                continue

                            name  = name_el.get_text(strip=True)
                            price = self._parse_price(price_el.get_text(strip=True))

                            if price <= 0:
                                continue

                            href = link_el["href"] if link_el else ""
                            if href and not href.startswith("http"):
                                href = self.BASE_URL + href
                                
                            base_url = href.split("?")[0]
                            if base_url in seen_urls:
                                continue

                            img = ""
                            if img_el:
                                img = (
                                    img_el.get("data-src")
                                    or img_el.get("data-lazy-src")
                                    or img_el.get("src", "")
                                )

                            seen_urls.add(base_url)
                            
                            rating = 0.0
                            review_count = 0
                            badge = "Resmi Satıcı" # Vatan kendi satar genelde
                            
                            try:
                                rating_el = item.select_one("[class*='rating'], [class*='star'], [class*='score'], [data-test*='rating'], [class*='Rating']")
                                if rating_el:
                                    t = rating_el.get_text(strip=True).replace(',', '.')
                                    match = re.search(r"([\d.]+)", t)
                                    if match: rating = float(match.group(1))
                                review_el = item.select_one("[class*='review'], [class*='comment'], [data-test*='review'], [class*='Count']")
                                if review_el:
                                    t = review_el.get_text(strip=True)
                                    t_clean = re.sub(r'\D', '', t)
                                    if t_clean: review_count = int(t_clean)
                            except:
                                pass

                            results.append(ProductPrice(
                                site=self.SITE_NAME,
                                name=name,
                                price=price,
                                url=href,
                                image_url=img,
                                rating=rating,
                                review_count=review_count,
                                badge=badge
                            ))

                        except Exception as e:
                            print(f"[Vatan] Item parse hatası: {e}")
                            continue

        except Exception as e:
            print(f"[Vatan] Genel hata: {e}")

        return results

    async def get_price(self, url: str) -> Optional[ProductPrice]:
        return None

    def _parse_price(self, text: str) -> float:
        cleaned = re.sub(r"[^\d,.]", "", text)
        cleaned = cleaned.replace(".", "").replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0