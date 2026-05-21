import re
from typing import Optional
from bs4 import BeautifulSoup
from app.scrapers.base import AbstractScraper, ProductPrice
from curl_cffi import requests

class MediaMarktScraper(AbstractScraper):
    SITE_NAME = "MediaMarkt"
    BASE_URL = "https://www.mediamarkt.com.tr"

    async def search(self, query: str) -> list[ProductPrice]:
        results = []
        url = f"{self.BASE_URL}/tr/search.html?query={query.replace(' ', '+')}"

        try:
            async with requests.AsyncSession(impersonate="chrome120") as session:
                resp = await session.get(url, timeout=15)
                soup = BeautifulSoup(resp.text, "lxml")
                
                cards = soup.select("article[data-test='mms-product-card'], div[data-test='mms-search-srp-productlist-item']")
                print(f"[MediaMarkt] {len(cards)} kart bulundu.")

                for card in cards[:50]:
                    try:
                        if card.select_one("a[data-test='mms-third-party-provider-link']"):
                            pass # eskiden continue idi, artik saticiyi badge olarak alalim
                            
                        name_el  = card.select_one("[data-test='product-title']")
                        price_el = card.select_one("[data-test='mms-price']")
                        link_el  = card.select_one("a[data-test='mms-router-link-product-list-item-link']")
                        img_el   = card.select_one("picture[data-test='product-image'] img")

                        if not (name_el and price_el):
                            continue

                        name  = name_el.get_text(strip=True)
                        price = self._parse_price(price_el.get_text(strip=True))

                        if price <= 0:
                            continue

                        href = link_el["href"] if link_el else ""
                        if href and not href.startswith("http"):
                            href = self.BASE_URL + href

                        img = img_el.get("src", "") if img_el else ""
                        
                        rating = 0.0
                        review_count = 0
                        badge = ""
                        
                        # Seller / Badge
                        seller_el = card.select_one("a[data-test='mms-third-party-provider-link']")
                        if seller_el:
                            badge = f"Satıcı: {seller_el.get_text(strip=True)}"
                        
                        try:
                            rating_el = card.select_one("[class*='rating'], [class*='star'], [class*='score'], [data-test*='rating'], [class*='Rating']")
                            if rating_el:
                                t = rating_el.get_text(strip=True).replace(',', '.')
                                match = re.search(r"([\d.]+)", t)
                                if match: rating = float(match.group(1))
                            review_el = card.select_one("[class*='review'], [class*='comment'], [data-test*='review'], [class*='Count']")
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
                        print(f"[MediaMarkt] Item parse hatası: {e}")
                        continue

        except Exception as e:
            print(f"[MediaMarkt] Genel hata: {e}")

        return results

    async def get_price(self, url: str) -> Optional[ProductPrice]:
        return None

    def _parse_price(self, text: str) -> float:
        text = text.replace("₺", "").replace("\xa0", "").strip()
        match = re.search(r"\d{1,3}(?:\.\d{3})+(?:,[\d–-]+)?|\d+(?:,[\d–-]+)?", text)
        if match:
            raw = match.group(0)
            raw = raw.replace(".", "")
            raw = re.sub(r",.*", "", raw)
            try:
                val = float(raw)
                if val > 100:
                    return val
            except ValueError:
                pass
        return 0.0