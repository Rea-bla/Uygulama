from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from app.core.database import get_db
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_sites: Optional[List[str]] = None
    notification_enabled: Optional[bool] = None
    theme_preference: Optional[str] = None
    language: Optional[str] = None


class PasswordChangeSchema(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class ProfileResponseSchema(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_sites: Optional[List[str]] = None
    notification_enabled: bool = True
    theme_preference: str = "light"
    language: str = "tr"
    search_count: int = 0
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[str] = None
    last_login_at: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileStatsSchema(BaseModel):
    total_searches: int = 0
    total_favorites: int = 0
    total_price_alerts: int = 0
    active_alerts: int = 0
    triggered_alerts: int = 0
    member_since_days: int = 0
    most_searched_sites: List[dict] = []


@router.get("", response_model=ProfileResponseSchema)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return ProfileResponseSchema(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        preferred_sites=current_user.preferred_sites_list,
        notification_enabled=current_user.notification_enabled if current_user.notification_enabled is not None else True,
        theme_preference=current_user.theme_preference or "light",
        language=current_user.language or "tr",
        search_count=current_user.search_count or 0,
        is_active=current_user.is_active if current_user.is_active is not None else True,
        is_verified=current_user.is_verified if current_user.is_verified is not None else False,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
        last_login_at=current_user.last_login_at.isoformat() if current_user.last_login_at else None,
    )


@router.put("", response_model=ProfileResponseSchema)
async def update_profile(
    profile_in: ProfileUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone
    if profile_in.bio is not None:
        current_user.bio = profile_in.bio
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url
    if profile_in.preferred_sites is not None:
        current_user.set_preferred_sites(profile_in.preferred_sites)
    if profile_in.notification_enabled is not None:
        current_user.notification_enabled = profile_in.notification_enabled
    if profile_in.theme_preference is not None:
        if profile_in.theme_preference in ("light", "dark", "auto"):
            current_user.theme_preference = profile_in.theme_preference
    if profile_in.language is not None:
        if profile_in.language in ("tr", "en"):
            current_user.language = profile_in.language

    db.add(current_user)
    await db.flush()

    return ProfileResponseSchema(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        preferred_sites=current_user.preferred_sites_list,
        notification_enabled=current_user.notification_enabled if current_user.notification_enabled is not None else True,
        theme_preference=current_user.theme_preference or "light",
        language=current_user.language or "tr",
        search_count=current_user.search_count or 0,
        is_active=current_user.is_active if current_user.is_active is not None else True,
        is_verified=current_user.is_verified if current_user.is_verified is not None else False,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
        last_login_at=current_user.last_login_at.isoformat() if current_user.last_login_at else None,
    )


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_in: PasswordChangeSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifreniz hatalı."
        )

    if password_in.new_password != password_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yeni şifreler eşleşmiyor."
        )

    if password_in.current_password == password_in.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yeni şifre mevcut şifreden farklı olmalıdır."
        )

    current_user.hashed_password = get_password_hash(password_in.new_password)
    db.add(current_user)
    await db.flush()

    return {"message": "Şifreniz başarıyla güncellendi."}


@router.get("/stats", response_model=ProfileStatsSchema)
async def get_profile_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.favorite import Favorite
    from app.models.price_alert import PriceAlert
    from app.models.search_history import SearchHistory
    from datetime import datetime

    fav_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == current_user.id)
    )
    total_favorites = fav_result.scalar() or 0

    alert_result = await db.execute(
        select(func.count(PriceAlert.id)).where(PriceAlert.user_id == current_user.id)
    )
    total_alerts = alert_result.scalar() or 0

    active_alert_result = await db.execute(
        select(func.count(PriceAlert.id)).where(
            PriceAlert.user_id == current_user.id,
            PriceAlert.is_active == True
        )
    )
    active_alerts = active_alert_result.scalar() or 0

    triggered_alert_result = await db.execute(
        select(func.count(PriceAlert.id)).where(
            PriceAlert.user_id == current_user.id,
            PriceAlert.is_triggered == True
        )
    )
    triggered_alerts = triggered_alert_result.scalar() or 0

    member_days = 0
    if current_user.created_at:
        member_days = (datetime.utcnow() - current_user.created_at).days

    return ProfileStatsSchema(
        total_searches=current_user.search_count or 0,
        total_favorites=total_favorites,
        total_price_alerts=total_alerts,
        active_alerts=active_alerts,
        triggered_alerts=triggered_alerts,
        member_since_days=member_days,
        most_searched_sites=[],
    )


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.delete(current_user)
    return {"message": "Hesabınız ve tüm verileriniz kalıcı olarak silindi."}
