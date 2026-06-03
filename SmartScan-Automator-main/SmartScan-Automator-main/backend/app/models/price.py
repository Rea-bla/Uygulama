from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid

class Price(Base):
    __tablename__ = "prices"

    id             = Column(Uuid, primary_key=True, default=uuid.uuid4)
    product_id     = Column(Uuid, ForeignKey("products.id"), nullable=False)
    site           = Column(String(100), nullable=False)
    price          = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    url            = Column(Text, nullable=True)
    image_url      = Column(Text, nullable=True)
    in_stock       = Column(Boolean, default=True)
    scraped_at     = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="prices")

    def __repr__(self):
        return f"<Price {self.site} - {self.price} TL>"