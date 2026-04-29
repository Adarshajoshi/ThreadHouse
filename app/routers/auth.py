import os
from datetime import datetime, timedelta, timezone
import asyncpg
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from db.database import get_db
from models.schemas import AuthResponse, LoginRequest, SignUpRequest

router=APIRouter()

JWT_SECRET   = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGO     = "HS256"
TOKEN_EXPIRY = timedelta(days=7)

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(),bcrypt.gensalt()).decode()

def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def _create_token(user_id: int, email: str) -> str:
    payload = {
        "sub":   str(user_id),
        "email": email,
        "exp":   datetime.now(timezone.utc) + TOKEN_EXPIRY,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

@router.post("/signup",response_model=AuthResponse,status_code=201)
async def signup(
    body: SignUpRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    #check for duplicate email
    existing = await conn.fetchval(
        "SELECT id FROM users WHERE email = $1", body.email
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

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
    return AuthResponse(token=token, user_id=user_id, name=body.name, email=body.email)

@router.post("/login",response_model=AuthResponse)
async def login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    user = await conn.fetchrow(
        "SELECT id,name, email, password_hash FROM users WHERE email = $1", body.email
    )
    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(user["id"], user["email"])
    return AuthResponse(token=token, user_id=user["id"], name=user["name"], email=user["email"])   

@router.post("/admin/login", response_model=AuthResponse)
async def admin_login(
    body: LoginRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    user = await conn.fetchrow(
        "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
        body.email
    )

    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    token = _create_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user_id=user["id"],
        name=user["name"],
        email=user["email"]
    )