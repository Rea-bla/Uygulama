from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from app.core.database import Base
from datetime import datetime
import uuid
from sqlalchemy import Uuid


class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id     = Column(Uuid, ForeignKey("users.id"), nullable=False)
    title       = Column(String(255), nullable=False)
    message     = Column(Text, nullable=False)
    type        = Column(String(50), nullable=False, default="info")
    is_read     = Column(Integer, default=0)
    link        = Column(Text, nullable=True)
    icon        = Column(String(50), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Notification {self.title[:30]} read={self.is_read}>"

    def mark_as_read(self):
        self.is_read = 1

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": bool(self.is_read),
            "link": self.link,
            "icon": self.icon,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
