from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.search_history import SearchHistory
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/search-history", tags=["search-history"])


class SearchHistoryCreateSchema(BaseModel):
    query: str
    result_count: int = 0
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    avg_price: Optional[float] = None
    filters: Optional[str] = None


class SearchHistoryResponseSchema(BaseModel):
    id: UUID
    query: str
    result_count: int = 0
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    avg_price: Optional[float] = None
    filters: Optional[str] = None
    searched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PopularSearchSchema(BaseModel):
    query: str
    count: int
    last_searched: Optional[datetime] = None


class SearchStatsSchema(BaseModel):
    total_searches: int = 0
    unique_queries: int = 0
    avg_results_per_search: float = 0.0
    most_searched: List[PopularSearchSchema] = []
    recent_searches: List[SearchHistoryResponseSchema] = []


@router.get("", response_model=List[SearchHistoryResponseSchema])
async def get_search_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if limit > 200:
        limit = 200

    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.searched_at))
        .limit(limit)
    )
    history = result.scalars().all()
    return history


@router.post("", response_model=SearchHistoryResponseSchema, status_code=status.HTTP_201_CREATED)
async def save_search(
    search_in: SearchHistoryCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not search_in.query or not search_in.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arama sorgusu boş olamaz."
        )

    new_entry = SearchHistory(
        user_id=current_user.id,
        query=search_in.query.strip(),
        result_count=search_in.result_count,
        min_price=search_in.min_price,
        max_price=search_in.max_price,
        avg_price=search_in.avg_price,
        filters=search_in.filters,
    )

    db.add(new_entry)

    current_user.increment_search_count()
    db.add(current_user)

    await db.flush()
    return new_entry


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_search_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SearchHistory).where(SearchHistory.user_id == current_user.id)
    )
    entries = result.scalars().all()

    for entry in entries:
        await db.delete(entry)

    return {
        "message": f"Arama geçmişiniz temizlendi. ({len(entries)} kayıt silindi)"
    }


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
async def delete_search_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SearchHistory).where(
            SearchHistory.id == entry_id,
            SearchHistory.user_id == current_user.id
        )
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arama geçmişi kaydı bulunamadı."
        )

    await db.delete(entry)
    return {"message": "Arama geçmişi kaydı silindi."}


@router.get("/stats", response_model=SearchStatsSchema)
async def get_search_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    all_result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
    )
    all_entries = all_result.scalars().all()

    total_searches = len(all_entries)
    unique_queries = len(set(e.query.lower().strip() for e in all_entries))

    avg_results = 0.0
    if total_searches > 0:
        total_result_count = sum(e.result_count or 0 for e in all_entries)
        avg_results = round(total_result_count / total_searches, 1)

    query_counts = {}
    query_last_searched = {}
    for e in all_entries:
        q = e.query.lower().strip()
        query_counts[q] = query_counts.get(q, 0) + 1
        if q not in query_last_searched or (e.searched_at and e.searched_at > query_last_searched[q]):
            query_last_searched[q] = e.searched_at

    most_searched = sorted(query_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    popular_searches = [
        PopularSearchSchema(
            query=q,
            count=c,
            last_searched=query_last_searched.get(q),
        )
        for q, c in most_searched
    ]

    recent_result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(desc(SearchHistory.searched_at))
        .limit(5)
    )
    recent_entries = recent_result.scalars().all()

    return SearchStatsSchema(
        total_searches=total_searches,
        unique_queries=unique_queries,
        avg_results_per_search=avg_results,
        most_searched=popular_searches,
        recent_searches=recent_entries,
    )
