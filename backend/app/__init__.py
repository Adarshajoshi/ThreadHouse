# Load backend/.env into the process environment as early as possible.
#
# Several modules read configuration with os.getenv(...) at import time
# (JWT_SECRET, DB_USER/DB_PASSWORD/..., etc.). When the server is launched from
# an IDE "Run" button or a shell that does not inject .env variables, those
# reads return empty/defaults — which breaks JWT validation on the WebSocket,
# the database connection, and the Groq LLM key. Loading the file here (before
# any app submodule is imported) makes os.getenv work everywhere without
# depending on the launch environment.
import os as _os
from pathlib import Path as _Path

_ENV_FILE = _Path(__file__).resolve().parent.parent / ".env"  # backend/.env
if _ENV_FILE.exists():
    try:
        for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
            _s = _line.strip()
            if not _s or _s.startswith("#") or "=" not in _s:
                continue
            _key, _val = _s.split("=", 1)
            _key = _key.strip()
            _val = _val.strip().strip('"').strip("'")
            # Only fill in vars that are missing or empty; never override a real,
            # non-empty environment variable that was set deliberately.
            if _key and not _os.environ.get(_key):
                _os.environ[_key] = _val
    except Exception:
        pass

# Startup confirmation (visible in the uvicorn terminal) so you can verify the
# new code is actually loaded after a restart.
print(
    "[env] .env loaded — "
    f"JWT_SECRET={'yes' if _os.environ.get('JWT_SECRET') else 'NO'}, "
    f"GROQ_API_KEY={'yes' if _os.environ.get('GROQ_API_KEY') else 'NO'}, "
    f"DATABASE_URL={'yes' if _os.environ.get('DATABASE_URL') else 'NO'}"
)
