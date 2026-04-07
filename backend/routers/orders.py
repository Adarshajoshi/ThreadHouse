from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import asyncpg
import json
from db.database import get_db
from models.schemas import PlaceOrderRequest, OrderStatusUpdate

router=APIRouter()

@router.post("/",status_code=201)
async def place_order(
    body: PlaceOrderRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    # Validate order_id uniqueness
    existing = await conn.fetchval(
        "SELECT id FROM orders WHERE order_id = $1", body.order_id
    )
    if existing:
        raise HTTPException(status_code=409, detail="Duplicate order_id")

    await conn.execute(
        """
        INSERT INTO orders
            (order_id, items, delivery_info, payment_method, status, total)
        VALUES ($1, $2::jsonb, $3::jsonb, $4, 'Order Placed', $5)
        """,
        body.order_id,
        json.dumps(body.items),
        json.dumps(body.delivery_info),
        body.payment_method,
        body.total,
    )
    return {"ok": True, "order_id": body.order_id}


@router.get("/")
async def list_orders(
    limit:  int            = Query(50, ge=1, le=200),
    offset: int            = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by order status"),
    conn:   asyncpg.Connection = Depends(get_db),
):
    if status:
        rows = await conn.fetch(
            """
            SELECT * FROM orders
            WHERE  status = $1
            ORDER  BY created_at DESC
            LIMIT  $2 OFFSET $3
            """,
            status, limit, offset,
        )
        total: int = await conn.fetchval(
            "SELECT COUNT(*) FROM orders WHERE status = $1", status
        )
    else:
        rows = await conn.fetch(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM orders")

    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "orders": [dict(row) for row in rows],
    }

@router.get("/{order_id}")
async def get_order(
    order_id:str,
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        "SELECT * FROM orders WHERE order_id = $1", order_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return dict(row)

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    conn: asyncpg.Connection = Depends(get_db),
):
    existing = await conn.fetchval(
        "SELECT id FROM orders WHERE order_id = $1", order_id
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    await conn.execute(
        "UPDATE orders SET status = $1 WHERE order_id = $2",
        body.status, order_id,
    )
    return {"ok": True, "order_id": order_id, "status": body.status}
