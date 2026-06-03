from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreateSchema(BaseModel):
    title: str
    message: str
    type: str = "info"
    link: Optional[str] = None
    icon: Optional[str] = None


class NotificationResponseSchema(BaseModel):
    id: UUID
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    link: Optional[str] = None
    icon: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationCountSchema(BaseModel):
    total: int = 0
    unread: int = 0
    read: int = 0


@router.get("", response_model=List[NotificationResponseSchema])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if limit > 200:
        limit = 200

    query = select(Notification).where(
        Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.where(Notification.is_read == 0)

    query = query.order_by(Notification.created_at.desc()).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()
    return notifications


@router.get("/count", response_model=NotificationCountSchema)
async def get_notification_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
    )
    all_notifications = result.scalars().all()

    total = len(all_notifications)
    unread = sum(1 for n in all_notifications if not n.is_read)
    read = total - unread

    return NotificationCountSchema(
        total=total,
        unread=unread,
        read=read,
    )


@router.put("/{notification_id}/read", response_model=NotificationResponseSchema)
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bildirim bulunamadı."
        )

    notification.mark_as_read()
    db.add(notification)
    await db.flush()
    return notification


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == 0
        )
    )
    unread_notifications = result.scalars().all()

    for notification in unread_notifications:
        notification.mark_as_read()
        db.add(notification)

    return {
        "message": f"{len(unread_notifications)} bildirim okundu olarak işaretlendi."
    }


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bildirim bulunamadı."
        )

    await db.delete(notification)
    return {"message": "Bildirim silindi."}


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
    )
    all_notifications = result.scalars().all()

    for notification in all_notifications:
        await db.delete(notification)

    return {
        "message": f"Tüm bildirimleriniz temizlendi. ({len(all_notifications)} bildirim silindi)"
    }


async def create_notification_for_user(
    db: AsyncSession,
    user_id,
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None,
    icon: Optional[str] = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
        icon=icon,
    )
    db.add(notification)
    await db.flush()
    return notification
