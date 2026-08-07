"""Auth router (signup / login / admin login). Uses asyncpg pool from app.db.asyncpg_pool."""

import os
from datetime import datetime, timedelta, timezone

import asyncpg
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.asyncpg_pool import get_asyncpg_conn
from app.schemas.shop import AuthResponse, LoginRequest, SignUpRequest

router = APIRouter()

# Strict JWT secret validation - fails fast if not configured properly
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32 or JWT_SECRET == "change-me-in-production":
    raise RuntimeError("JWT_SECRET must be set to a secure value (min 32 characters)")

JWT_ALGO = "HS256"
TOKEN_EXPIRY = timedelta(days=7)

# Dummy hash for timing attack prevention
DUMMY_HASH = bcrypt.hashpw(b"dummy_password", bcrypt.gensalt()).decode()


def validate_password_strength(password: str) -> None:
    """Validate password meets security requirements"""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    if not any(c.isupper() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter",
        )
    if not any(c.islower() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter",
        )
    if not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number",
        )


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + TOKEN_EXPIRY,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignUpRequest,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Register a new user with password validation"""
    validate_password_strength(body.password)

    existing = await conn.fetchval(
        "SELECT id FROM users WHERE email = $1", body.email
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed_password = _hash_password(body.password)
    user_id = await conn.fetchval(
        """
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        body.name,
        body.email,
        hashed_password,
    )

    token = _create_token(user_id, body.email)
    return AuthResponse(
        token=token,
        user_id=user_id,
        name=body.name,
        email=body.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Authenticate user and return JWT token"""
    user = await conn.fetchrow(
        "SELECT id, name, email, password_hash FROM users WHERE email = $1",
        body.email,
    )

    # Timing attack prevention: always verify a hash even if user doesn't exist
    hash_to_check = user["password_hash"] if user else DUMMY_HASH
    password_valid = _verify_password(body.password, hash_to_check)

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = _create_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
    )


@router.post("/admin/login", response_model=AuthResponse)
async def admin_login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Admin-only login endpoint"""
    user = await conn.fetchrow(
        "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
        body.email,
    )

    hash_to_check = user["password_hash"] if user else DUMMY_HASH
    password_valid = _verify_password(body.password, hash_to_check)

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    token = _create_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
    )

# Legacy alias for the admin/Login.jsx frontend, which POSTs to /api/user/admin
# instead of /api/auth/admin/login. Same handler.
from fastapi import APIRouter as _APIRouter
admin_alias_router = _APIRouter()


@admin_alias_router.post("/admin", response_model=AuthResponse)
async def admin_login_alias(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    return await admin_login(body, conn)

# Authenticated profile endpoints

from app.auth_deps import get_current_user_id  # noqa: E402
from app.schemas.shop import UpdateProfileRequest, UserProfileResponse  # noqa: E402


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    user_id: int = Depends(get_current_user_id),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Return the currently logged-in user's profile (decoded from the JWT)."""
    user = await conn.fetchrow(
        "SELECT id, name, email FROM users WHERE id = $1", user_id
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse(
        user_id=user["id"], name=user["name"], email=user["email"]
    )


@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user_id: int = Depends(get_current_user_id),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Update name and/or password for the logged-in user."""
    if body.name is None and body.new_password is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    if body.new_password is not None:
        validate_password_strength(body.new_password)
        new_hash = _hash_password(body.new_password)
        if body.name is not None:
            await conn.execute(
                "UPDATE users SET name = $1, password_hash = $2 WHERE id = $3",
                body.name, new_hash, user_id,
            )
        else:
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                new_hash, user_id,
            )
    elif body.name is not None:
        await conn.execute(
            "UPDATE users SET name = $1 WHERE id = $2", body.name, user_id,
        )

    user = await conn.fetchrow(
        "SELECT id, name, email FROM users WHERE id = $1", user_id
    )
    return UserProfileResponse(
        user_id=user["id"], name=user["name"], email=user["email"]
    )


@router.post("/logout")
async def logout():

    return {"ok": True, "message": "Logged out"}

