import re
from typing import Optional
from bs4 import BeautifulSoup
from curl_cffi import requests
from app.scrapers.base import AbstractScraper, ProductPrice

class TeknosaScraper(AbstractScraper):
    SITE_NAME = "Teknosa"
    BASE_URL = "https://www.teknosa.com"

    async def search(self, query: str) -> list[ProductPrice]:
        results = []
        url = f"{self.BASE_URL}/arama?q={query.replace(' ', '+')}"

        try:
            async with requests.AsyncSession(impersonate="chrome120") as session:
                resp = await session.get(url, timeout=15)
                soup = BeautifulSoup(resp.text, "lxml")
                
                cards = soup.select("ul.prd > li") 
                if not cards:
                    cards = soup.select("div.prd-inner")

                print(f"[Teknosa] {len(cards)} kart bulundu.")

                for card in cards[:50]:
                    try:
                        name_el  = card.select_one("h3.prd-title")
                        price_el = card.select_one(".prd-prc2") or card.select_one(".prd-prc1") or card.select_one(".prd-prices")
                        
                        link_el  = card.select_one("a.prd-link") 
                        if not link_el:
                             link_el = card.find("a", href=True)

                        img_el   = card.select_one(".prd-media img") or card.select_one("img")

                        if not (name_el and price_el):
                            continue

                        name_raw = name_el.get_text(separator=" ", strip=True)
                        name = " ".join(name_raw.split())
                        name = re.sub(r'(\d+)\s*(GB|TB)', r'\1 \2', name, flags=re.IGNORECASE)
                        
                        price = self._parse_price(price_el.get_text(strip=True))
                        if price <= 0:
                            continue

                        href = link_el["href"] if link_el and "href" in link_el.attrs else ""
                        
                        if href and not href.startswith("http"):
                            href = self.BASE_URL + href

                        img = ""
                        if img_el:
                            img = (
                                img_el.get("data-srcset") 
                                or img_el.get("data-src")
                                or img_el.get("data-lazy-src")
                                or img_el.get("src", "")
                            )
                        if img and "," in img:
                            img = img.split(",")[0].split(" ")[0]
                        if img and ("placeholder" in img or "data:image" in img):
                            img = ""

                        rating = 0.0
                        review_count = 0
                        badge = ""
                        
                        # Seller / Badge
                        seller_el = card.select_one(".prd-mrc")
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
                        print(f"[Teknosa] Item parse hatası: {e}")
                        continue

        except Exception as e:
            print(f"[Teknosa] Genel hata: {e}")

        return results

    async def get_price(self, url: str) -> Optional[ProductPrice]:
        return None

    def _parse_price(self, text: str) -> float:
        match = re.search(r"[\d\.]+(?:,[\d]+)?", text)
        if match:
            raw = match.group(0)
            raw = raw.replace(".", "")
            raw = re.sub(r",.*", "", raw)
            try:
                return float(raw)
            except ValueError:
                pass
        numbers = re.findall(r"\d+", text.replace(".", ""))
        for n in numbers:
            val = float(n)
            if val > 100:
                return val
        return 0.0