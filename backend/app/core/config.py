import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from decouple import Config, RepositoryEnv, config as _autoconfig
from sqlalchemy.ext.declarative import declarative_base

# Absolute path to backend/.env (this file is backend/app/core/config.py),
# so configuration loads correctly no matter which directory the server is
# launched from (e.g. VS Code's Run button uses the workspace root as cwd).
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


def _read_env_file_value(key: str) -> str:
    """Read a key's raw value directly from the .env file (ignores env vars)."""
    try:
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s and not s.startswith("#") and s.split("=", 1)[0].strip() == key:
                return s.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return ""


# An EMPTY `GROQ_API_KEY` environment variable (commonly injected by the IDE or
# shell) would otherwise override the value in the .env file, because both
# pydantic-settings and decouple give real env vars precedence over the file.
# When the env var is missing or empty, force the file's value into the
# environment so every reader (settings, decouple, and the routers) sees it.
if not os.environ.get("GROQ_API_KEY"):
    _file_groq = _read_env_file_value("GROQ_API_KEY")
    if _file_groq:
        os.environ["GROQ_API_KEY"] = _file_groq

# decouple bound to the absolute .env path (falls back to auto-search if absent).
config = Config(RepositoryEnv(str(_ENV_PATH))) if _ENV_PATH.exists() else _autoconfig

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
        env_file = str(_ENV_PATH),
        env_file_encoding = "utf-8",
        extra = "ignore"
    )

# Instantiating settings to be used across application
settings = Settings()


def get_groq_key() -> str:
    """Return the Groq API key from the most reliable source available.

    Reads the .env file directly (absolute path) first, so it works regardless
    of how the server was launched or whether the environment was injected;
    falls back to the process env var and pydantic settings.
    """
    return (
        _read_env_file_value("GROQ_API_KEY")
        or os.environ.get("GROQ_API_KEY", "")
        or settings.GROQ_API_KEY
    )