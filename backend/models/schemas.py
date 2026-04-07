from typing import Any, Optional

from pydantic import BaseModel, EmailStr, field_validator


# Analytics 

class AnalyticsEvent(BaseModel):
    session_id: str
    event_type: str
    page:       Optional[str] = None
    element:    Optional[str] = None
    value:      Optional[str] = None
    timestamp:  str 

# Auth 

class SignUpRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class AuthResponse(BaseModel):
    token:   str
    user_id: int
    name:    Optional[str]
    email:   str


# Orders 

class PlaceOrderRequest(BaseModel):
    order_id:       str
    items:          list[dict[str, Any]]
    delivery_info:  dict[str, Any]
    payment_method: str
    total:          float


class OrderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {
            "Order Placed",
            "Processing",
            "Shipped",
            "Out for Delivery",
            "Delivered",
        }
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v
