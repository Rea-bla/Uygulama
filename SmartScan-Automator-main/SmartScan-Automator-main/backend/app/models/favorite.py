from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
from sqlalchemy import Uuid

class Favorite(Base):
    __tablename__ = "favorites"

    id             = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id        = Column(Uuid, ForeignKey("users.id"), nullable=False)
    site           = Column(String(100), nullable=False)
    name           = Column(String(500), nullable=False)
    price          = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    url            = Column(Text, nullable=False)
    image_url      = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")

    def __repr__(self):
        return f"<Favorite {self.site} - {self.name[:30]}>"
