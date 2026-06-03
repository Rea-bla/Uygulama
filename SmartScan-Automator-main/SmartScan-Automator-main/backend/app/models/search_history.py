from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
from sqlalchemy import Uuid


class SearchHistory(Base):
    __tablename__ = "search_history"

    id          = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id     = Column(Uuid, ForeignKey("users.id"), nullable=False)
    query       = Column(String(500), nullable=False)
    result_count = Column(Integer, default=0)
    min_price   = Column(Float, nullable=True)
    max_price   = Column(Float, nullable=True)
    avg_price   = Column(Float, nullable=True)
    filters     = Column(Text, nullable=True)
    searched_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="search_history")

    def __repr__(self):
        return f"<SearchHistory user={self.user_id} query='{self.query[:40]}'>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "query": self.query,
            "result_count": self.result_count,
            "min_price": self.min_price,
            "max_price": self.max_price,
            "avg_price": self.avg_price,
            "filters": self.filters,
            "searched_at": self.searched_at.isoformat() if self.searched_at else None,
        }
