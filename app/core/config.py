from pydantic_settings import BaseSettings, SettingsConfigDict
from decouple import config
from sqlalchemy.ext.declarative import declarative_base

SECRET_KEY = config("SECRET_KEY")

class Settings(BaseSettings):
    """
    Application Configuration settings.
    
    This class uses Pydantic's BaseSettings to automatically load environment variables
    and provide default values where applicable.
    """
    PROJECT_NAME: str = "Mindless Systems"
    DATABASE_URL: str
    GROQ_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"
    MODEL_DIR: str = "models"

    model_config = SettingsConfigDict(
        env_file = ".env",
        env_file_encoding = "utf-8",
        extra = "ignore"  
    )

# Instantiating settings to be used across application
settings = Settings()