from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

#Database engine instance created from the configured DATABASE_URL
engine = create_engine(settings.DATABASE_URL)

#Session Factory for creating new database sessions
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)

#Base class for all ORM models
Base = declarative_base()

def get_db():
    """
    Dependency that provides a SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()