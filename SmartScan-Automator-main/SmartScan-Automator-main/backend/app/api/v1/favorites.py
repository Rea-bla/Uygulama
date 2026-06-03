from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])

# --- Pydantic Schemas ---
class FavoriteCreateSchema(BaseModel):
    site: str
    name: str
    price: float
    original_price: Optional[float] = None
    url: str
    image_url: Optional[str] = None

class FavoriteResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    site: str
    name: str
    price: float
    original_price: Optional[float] = None
    url: str
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Routes ---

@router.get("", response_model=List[FavoriteResponseSchema])
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.scalars().all()
    return favorites

@router.post("", response_model=FavoriteResponseSchema, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    fav_in: FavoriteCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if already favorited
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id, Favorite.url == fav_in.url)
    )
    existing = result.scalars().first()
    if existing:
        return existing  # Return existing favorite if already exists

    # Create new favorite
    new_fav = Favorite(
        user_id=current_user.id,
        site=fav_in.site,
        name=fav_in.name,
        price=fav_in.price,
        original_price=fav_in.original_price,
        url=fav_in.url,
        image_url=fav_in.image_url
    )
    
    db.add(new_fav)
    await db.flush()
    return new_fav

@router.delete("", status_code=status.HTTP_200_OK)
async def remove_favorite(
    url: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id, Favorite.url == url)
    )
    fav = result.scalars().first()
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favori bulunamadı."
        )
    
    await db.delete(fav)
    return {"message": "Favorilerden kaldırıldı."}
