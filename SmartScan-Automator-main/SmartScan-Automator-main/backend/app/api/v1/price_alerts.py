from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.price_alert import PriceAlert
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/price-alerts", tags=["price-alerts"])

MAX_ALERTS_PER_USER = 50


class PriceAlertCreateSchema(BaseModel):
    product_name: str
    target_price: float
    current_price: Optional[float] = None
    product_url: str
    site: str
    image_url: Optional[str] = None


class PriceAlertUpdateSchema(BaseModel):
    target_price: Optional[float] = None
    is_active: Optional[bool] = None


class PriceAlertResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    product_name: str
    target_price: float
    current_price: Optional[float] = None
    product_url: str
    site: str
    image_url: Optional[str] = None
    is_active: bool = True
    is_triggered: bool = False
    triggered_at: Optional[datetime] = None
    check_count: int = 0
    last_checked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PriceAlertSummarySchema(BaseModel):
    total_alerts: int = 0
    active_alerts: int = 0
    triggered_alerts: int = 0
    inactive_alerts: int = 0


@router.get("", response_model=List[PriceAlertResponseSchema])
async def get_price_alerts(
    is_active: Optional[bool] = None,
    is_triggered: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(PriceAlert).where(
        PriceAlert.user_id == current_user.id
    )

    if is_active is not None:
        query = query.where(PriceAlert.is_active == is_active)
    if is_triggered is not None:
        query = query.where(PriceAlert.is_triggered == is_triggered)

    query = query.order_by(desc(PriceAlert.created_at))

    result = await db.execute(query)
    alerts = result.scalars().all()
    return alerts


@router.post("", response_model=PriceAlertResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_price_alert(
    alert_in: PriceAlertCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count_result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.user_id == current_user.id,
            PriceAlert.is_active == True
        )
    )
    active_alerts = count_result.scalars().all()
    if len(active_alerts) >= MAX_ALERTS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maksimum {MAX_ALERTS_PER_USER} aktif fiyat alarmı oluşturabilirsiniz."
        )

    existing_result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.user_id == current_user.id,
            PriceAlert.product_url == alert_in.product_url,
            PriceAlert.is_active == True
        )
    )
    existing = existing_result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu ürün için zaten aktif bir fiyat alarmınız var."
        )

    if alert_in.target_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hedef fiyat sıfırdan büyük olmalıdır."
        )

    new_alert = PriceAlert(
        user_id=current_user.id,
        product_name=alert_in.product_name,
        target_price=alert_in.target_price,
        current_price=alert_in.current_price,
        product_url=alert_in.product_url,
        site=alert_in.site,
        image_url=alert_in.image_url,
    )

    db.add(new_alert)
    await db.flush()
    return new_alert


@router.put("/{alert_id}", response_model=PriceAlertResponseSchema)
async def update_price_alert(
    alert_id: str,
    alert_in: PriceAlertUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == current_user.id
        )
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fiyat alarmı bulunamadı."
        )

    if alert_in.target_price is not None:
        if alert_in.target_price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hedef fiyat sıfırdan büyük olmalıdır."
            )
        alert.target_price = alert_in.target_price
        alert.is_triggered = False
        alert.triggered_at = None

    if alert_in.is_active is not None:
        alert.is_active = alert_in.is_active

    alert.updated_at = datetime.utcnow()
    db.add(alert)
    await db.flush()
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_200_OK)
async def delete_price_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == current_user.id
        )
    )
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fiyat alarmı bulunamadı."
        )

    await db.delete(alert)
    return {"message": "Fiyat alarmı silindi."}


@router.get("/summary", response_model=PriceAlertSummarySchema)
async def get_alert_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == current_user.id)
    )
    all_alerts = result.scalars().all()

    total = len(all_alerts)
    active = sum(1 for a in all_alerts if a.is_active)
    triggered = sum(1 for a in all_alerts if a.is_triggered)
    inactive = sum(1 for a in all_alerts if not a.is_active)

    return PriceAlertSummarySchema(
        total_alerts=total,
        active_alerts=active,
        triggered_alerts=triggered,
        inactive_alerts=inactive,
    )
