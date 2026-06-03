from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid
from sqlalchemy import Uuid


class User(Base):
    __tablename__ = "users"

    id              = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(255), nullable=True)
    avatar_url      = Column(Text, nullable=True)
    phone           = Column(String(20), nullable=True)
    bio             = Column(Text, nullable=True)
    preferred_sites = Column(Text, nullable=True)
    notification_enabled = Column(Boolean, default=True)
    theme_preference     = Column(String(20), default="light")
    language             = Column(String(10), default="tr")
    search_count         = Column(Integer, default=0)
    last_login_at        = Column(DateTime, nullable=True)
    is_active            = Column(Boolean, default=True)
    is_verified          = Column(Boolean, default=False)
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    favorites       = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    search_history  = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    price_alerts    = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"

    def increment_search_count(self):
        self.search_count = (self.search_count or 0) + 1

    def update_last_login(self):
        self.last_login_at = datetime.utcnow()

    @property
    def display_name(self):
        return self.full_name or self.email.split("@")[0]

    @property
    def preferred_sites_list(self):
        if self.preferred_sites:
            return [s.strip() for s in self.preferred_sites.split(",") if s.strip()]
        return []

    def set_preferred_sites(self, sites: list):
        self.preferred_sites = ",".join(sites) if sites else None

    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "phone": self.phone,
            "bio": self.bio,
            "preferred_sites": self.preferred_sites_list,
            "notification_enabled": self.notification_enabled,
            "theme_preference": self.theme_preference,
            "language": self.language,
            "search_count": self.search_count,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_public_dict(self):
        return {
            "id": str(self.id),
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "search_count": self.search_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
