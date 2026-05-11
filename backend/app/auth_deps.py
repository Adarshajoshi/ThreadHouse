"""
Auth dependencies shared across routers.

* get_current_user_id (required)  - 401s if no/invalid token
* get_optional_user_id (optional) - returns None if no/invalid token (used by
                                    POST /api/orders/ so guest checkout still works)
"""

import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGO = "HS256"


def _decode(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def _strip_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    # Some frontends send the raw token (admin panel sets a `token` header).
    return authorization.strip()


def get_current_user_id(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Header(None),  # admin frontend's `token` header
) -> int:
    raw = _strip_bearer(authorization) or (token.strip() if token else None)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization token",
        )
    try:
        payload = _decode(raw)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    try:
        return int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(401, "Token has no user id")


def get_optional_user_id(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Header(None),
) -> Optional[int]:
    """Like get_current_user_id, but returns None if no/invalid token."""
    raw = _strip_bearer(authorization) or (token.strip() if token else None)
    if not raw:
        return None
    try:
        payload = _decode(raw)
        return int(payload["sub"])
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Admin guard
# ---------------------------------------------------------------------------

import asyncpg as _asyncpg
from fastapi import Depends as _Depends

from app.db.asyncpg_pool import get_asyncpg_conn as _get_conn


async def get_current_admin(
    user_id: int = _Depends(get_current_user_id),
    conn: _asyncpg.Connection = _Depends(_get_conn),
) -> int:
    """
    Validates the JWT, then checks the user's role in the DB.
    Returns user_id on success; raises 403 if the user isn't an admin.
    """
    role = await conn.fetchval(
        "SELECT role FROM users WHERE id = $1", user_id
    )
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user_id

