import re
from typing import Optional
from curl_cffi import requests
from bs4 import BeautifulSoup
from app.scrapers.base import AbstractScraper, ProductPrice

class N11Scraper(AbstractScraper):
    SITE_NAME = "n11"
    BASE_URL = "https://www.n11.com"

    async def search(self, query: str) -> list[ProductPrice]:
        results = []
        url = f"{self.BASE_URL}/arama?q={query.replace(' ', '+')}"

        try:
            async with requests.AsyncSession(impersonate="chrome120") as session:
                resp = await session.get(url, timeout=15)
                soup = BeautifulSoup(resp.text, "lxml")
                
                items = soup.select(".product-item, li.column")
                print(f"[n11] {len(items)} ürün bulundu.")

                for item in items[:20]:
                    try:
                        if item.name == "a" and "href" in item.attrs:
                            href = item["href"]
                        else:
                            link_el = item.select_one("a[href]")
                            href = link_el["href"] if link_el else ""
                            
                        if href and not href.startswith("http"):
                            href = self.BASE_URL + href

                        name_el  = item.select_one(".product-item-title, h3.productName")
                        price_el = item.select_one(".price-currency, .newPrice, ins") or item.select_one(".basket-price, .price")
                        img_el   = item.select_one(".product-item-image img, img.lazy")

                        if not (name_el and price_el):
                            continue

                        name       = name_el.get_text(strip=True)
                        price_text = price_el.get_text(strip=True)
                        price      = self._parse_price(price_text)

                        if price <= 0:
                            continue

                        img = ""
                        if img_el:
                            img = (
                                img_el.get("src") or
                                img_el.get("data-src") or
                                img_el.get("data-original") or
                                ""
                            )

                        rating = 0.0
                        review_count = 0
                        badge = ""
                        
                        try:
                            badge_el = item.select_one(".badge, .campaign")
                            if badge_el:
                                badge = badge_el.get_text(strip=True)
                                
                            rating_el = item.select_one("[class*='rating'], [class*='star'], [class*='score'], [class*='Rating']")
                            if rating_el:
                                t = rating_el.get_text(strip=True).replace(',', '.')
                                match = re.search(r"([\d.]+)", t)
                                if match: rating = float(match.group(1))
                            review_el = item.select_one("[class*='review'], [class*='comment'], [class*='Count']")
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
                        print(f"[n11] Item parse hatası: {e}")
                        continue

        except Exception as e:
            print(f"[n11] Genel hata: {e}")

        return list({r.url: r for r in results}.values())

    async def get_price(self, url: str) -> Optional[ProductPrice]:
        return None

    def _parse_price(self, text: str) -> float:
        match = re.search(r"[\d\.]+,\d+", text)
        if match:
            raw = match.group(0)          
            raw = raw.replace(".", "")    
            raw = raw.replace(",", ".")   
            try:
                return float(raw)
            except ValueError:
                pass

        match2 = re.search(r"[\d\.]+", text)
        if match2:
            raw = match2.group(0).replace(".", "")
            try:
                val = float(raw)
                if val > 100:
                    return val
            except ValueError:
                pass

        return 0.0