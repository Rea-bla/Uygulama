from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import csv
import io
import json

from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.search_history import SearchHistory
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/export", tags=["export"])


class ExportResponseSchema(BaseModel):
    format: str
    record_count: int
    generated_at: str
    download_ready: bool = True


@router.get("/favorites/csv")
async def export_favorites_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.scalars().all()

    if not favorites:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dışa aktarılacak favori ürün bulunamadı."
        )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    writer.writerow([
        "Site", "Ürün Adı", "Fiyat (TL)", "Orijinal Fiyat (TL)",
        "İndirim (%)", "URL", "Eklenme Tarihi"
    ])

    for fav in favorites:
        discount = ""
        if fav.original_price and fav.original_price > fav.price:
            discount_pct = round(
                ((fav.original_price - fav.price) / fav.original_price) * 100, 1
            )
            discount = f"%{discount_pct}"

        writer.writerow([
            fav.site,
            fav.name,
            f"{fav.price:.2f}",
            f"{fav.original_price:.2f}" if fav.original_price else "",
            discount,
            fav.url,
            fav.created_at.strftime("%d.%m.%Y %H:%M") if fav.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=favoriler_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
        }
    )


@router.get("/favorites/json")
async def export_favorites_json(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.scalars().all()

    if not favorites:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dışa aktarılacak favori ürün bulunamadı."
        )

    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "user_email": current_user.email,
        "total_items": len(favorites),
        "items": [],
    }

    total_savings = 0.0

    for fav in favorites:
        item = {
            "site": fav.site,
            "name": fav.name,
            "price": fav.price,
            "original_price": fav.original_price,
            "url": fav.url,
            "image_url": fav.image_url,
            "added_at": fav.created_at.isoformat() if fav.created_at else None,
        }

        if fav.original_price and fav.original_price > fav.price:
            item["discount_amount"] = round(fav.original_price - fav.price, 2)
            item["discount_percentage"] = round(
                ((fav.original_price - fav.price) / fav.original_price) * 100, 1
            )
            total_savings += item["discount_amount"]
        else:
            item["discount_amount"] = 0
            item["discount_percentage"] = 0

        export_data["items"].append(item)

    export_data["total_value"] = round(sum(f.price for f in favorites), 2)
    export_data["total_savings"] = round(total_savings, 2)

    json_content = json.dumps(export_data, ensure_ascii=False, indent=2)

    return Response(
        content=json_content,
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=favoriler_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.json"
        }
    )


@router.get("/search-history/csv")
async def export_search_history_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.searched_at.desc())
    )
    entries = result.scalars().all()

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dışa aktarılacak arama geçmişi bulunamadı."
        )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    writer.writerow([
        "Arama Sorgusu", "Sonuç Sayısı",
        "Min Fiyat (TL)", "Maks Fiyat (TL)", "Ort. Fiyat (TL)",
        "Filtreler", "Tarih"
    ])

    for entry in entries:
        writer.writerow([
            entry.query,
            entry.result_count or 0,
            f"{entry.min_price:.2f}" if entry.min_price else "",
            f"{entry.max_price:.2f}" if entry.max_price else "",
            f"{entry.avg_price:.2f}" if entry.avg_price else "",
            entry.filters or "",
            entry.searched_at.strftime("%d.%m.%Y %H:%M") if entry.searched_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=arama_gecmisi_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
        }
    )
