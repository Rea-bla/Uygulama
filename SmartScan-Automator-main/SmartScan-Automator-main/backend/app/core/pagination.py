from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel
from math import ceil

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page

    def validate_params(self):
        if self.page < 1:
            self.page = 1
        if self.per_page < 1:
            self.per_page = 1
        if self.per_page > 100:
            self.per_page = 100


class PaginatedResponse(BaseModel):
    items: List = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    total_pages: int = 0
    has_next: bool = False
    has_prev: bool = False

    @classmethod
    def create(cls, items: list, total: int, page: int, per_page: int):
        total_pages = ceil(total / per_page) if per_page > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


def paginate_list(items: list, page: int = 1, per_page: int = 20) -> PaginatedResponse:
    total = len(items)
    offset = (page - 1) * per_page
    paginated_items = items[offset:offset + per_page]
    return PaginatedResponse.create(
        items=paginated_items,
        total=total,
        page=page,
        per_page=per_page,
    )


class SortParams(BaseModel):
    sort_by: str = "created_at"
    sort_order: str = "desc"

    @property
    def is_ascending(self) -> bool:
        return self.sort_order.lower() == "asc"

    def validate_sort_field(self, allowed_fields: list) -> str:
        if self.sort_by in allowed_fields:
            return self.sort_by
        return allowed_fields[0] if allowed_fields else "created_at"


class FilterParams(BaseModel):
    site: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    in_stock_only: bool = False
    search_query: Optional[str] = None

    def apply_to_results(self, results: list) -> list:
        filtered = results

        if self.site:
            sites = [s.strip().lower() for s in self.site.split(",")]
            filtered = [
                r for r in filtered
                if getattr(r, "site", "").lower() in sites
            ]

        if self.min_price is not None:
            filtered = [
                r for r in filtered
                if getattr(r, "price", 0) >= self.min_price
            ]

        if self.max_price is not None:
            filtered = [
                r for r in filtered
                if getattr(r, "price", float("inf")) <= self.max_price
            ]

        if self.in_stock_only:
            filtered = [
                r for r in filtered
                if getattr(r, "in_stock", True)
            ]

        if self.search_query:
            query_terms = self.search_query.lower().split()
            filtered = [
                r for r in filtered
                if all(
                    term in getattr(r, "name", "").lower()
                    for term in query_terms
                )
            ]

        return filtered


class SearchStatistics(BaseModel):
    total_results: int = 0
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    avg_price: Optional[float] = None
    site_distribution: dict = {}
    in_stock_count: int = 0
    out_of_stock_count: int = 0
    avg_rating: Optional[float] = None
    with_discount_count: int = 0

    @classmethod
    def from_results(cls, results: list):
        if not results:
            return cls()

        prices = [getattr(r, "price", 0) for r in results if getattr(r, "price", 0) > 0]
        ratings = [getattr(r, "rating", 0) for r in results if getattr(r, "rating", 0) > 0]
        sites = {}
        in_stock = 0
        out_of_stock = 0
        with_discount = 0

        for r in results:
            site = getattr(r, "site", "unknown")
            sites[site] = sites.get(site, 0) + 1

            if getattr(r, "in_stock", True):
                in_stock += 1
            else:
                out_of_stock += 1

            original = getattr(r, "original_price", None)
            current = getattr(r, "price", 0)
            if original and original > current:
                with_discount += 1

        return cls(
            total_results=len(results),
            min_price=min(prices) if prices else None,
            max_price=max(prices) if prices else None,
            avg_price=round(sum(prices) / len(prices), 2) if prices else None,
            site_distribution=sites,
            in_stock_count=in_stock,
            out_of_stock_count=out_of_stock,
            avg_rating=round(sum(ratings) / len(ratings), 2) if ratings else None,
            with_discount_count=with_discount,
        )
