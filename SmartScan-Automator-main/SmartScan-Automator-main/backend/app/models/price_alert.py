from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
from sqlalchemy import Uuid


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id              = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id         = Column(Uuid, ForeignKey("users.id"), nullable=False)
    product_name    = Column(String(500), nullable=False)
    target_price    = Column(Float, nullable=False)
    current_price   = Column(Float, nullable=True)
    product_url     = Column(Text, nullable=False)
    site            = Column(String(100), nullable=False)
    image_url       = Column(Text, nullable=True)
    is_active       = Column(Boolean, default=True)
    is_triggered    = Column(Boolean, default=False)
    triggered_at    = Column(DateTime, nullable=True)
    check_count     = Column(Integer, default=0)
    last_checked_at = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="price_alerts")

    def __repr__(self):
        return f"<PriceAlert {self.product_name[:30]} target={self.target_price}>"

    @property
    def price_difference(self):
        if self.current_price and self.target_price:
            return self.current_price - self.target_price
        return None

    @property
    def price_drop_percentage(self):
        if self.current_price and self.target_price and self.current_price > 0:
            return round(((self.current_price - self.target_price) / self.current_price) * 100, 2)
        return 0.0

    def check_trigger(self, new_price: float) -> bool:
        self.current_price = new_price
        self.check_count += 1
        self.last_checked_at = datetime.utcnow()

        if new_price <= self.target_price and not self.is_triggered:
            self.is_triggered = True
            self.triggered_at = datetime.utcnow()
            return True
        return False

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "product_name": self.product_name,
            "target_price": self.target_price,
            "current_price": self.current_price,
            "product_url": self.product_url,
            "site": self.site,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "is_triggered": self.is_triggered,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "check_count": self.check_count,
            "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "price_difference": self.price_difference,
            "price_drop_percentage": self.price_drop_percentage,
        }
