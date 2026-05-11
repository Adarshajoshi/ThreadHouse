"""Orders router. Uses asyncpg pool from app.db.asyncpg_pool."""

import json
import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.db.asyncpg_pool import get_asyncpg_conn
from app.auth_deps import get_current_user_id, get_optional_user_id
from app.schemas.shop import PlaceOrderRequest

router = APIRouter()


@router.post("/", status_code=201)
async def place_order(
    body: PlaceOrderRequest,
    user_id = Depends(get_optional_user_id),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    existing = await conn.fetchval(
        "SELECT id FROM orders WHERE order_id = $1", body.order_id
    )
    if existing:
        raise HTTPException(status_code=409, detail="Duplicate order_id")

    await conn.execute(
        """
        INSERT INTO orders
            (order_id, user_id, items, delivery_info, payment_method, status, total)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, 'Order Placed', $6)
        """,
        body.order_id,
        user_id,
        json.dumps(body.items),
        json.dumps(body.delivery_info),
        body.payment_method,
        body.total,
    )
    # Best-effort stock decrement for each line item with a numeric product id.
    try:
        for it in (body.items or []):
            pid_raw = it.get("_id") or it.get("id")
            try:
                pid = int(pid_raw)
            except (TypeError, ValueError):
                continue
            qty = int(it.get("quantity", 1) or 1)
            await conn.execute(
                "UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2",
                qty, pid,
            )
    except Exception:
        pass

    return {"ok": True, "order_id": body.order_id, "user_id": user_id}



@router.get("/me")
async def list_my_orders(
    user_id: int = Depends(get_current_user_id),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Return only the logged-in user's orders, newest first."""
    rows = await conn.fetch(
        """
        SELECT order_id, items, delivery_info, payment_method, status, total, created_at
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        """,
        user_id,
    )
    return {
        "total":  len(rows),
        "orders": [dict(r) for r in rows],
    }


