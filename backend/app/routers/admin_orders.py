"""
Admin-facing order endpoints.

Matches the admin frontend (Orders.jsx):
  POST /api/order/list   -> {success, orders: [...]}
  POST /api/order/status -> {orderId, status} -> {success, message}

Reuses the same `orders` table that /api/orders writes to. Just remaps the
field names so the admin UI can render its existing layout untouched.
"""

import asyncpg
from fastapi import APIRouter, Body, Depends, HTTPException

from app.db.asyncpg_pool import get_asyncpg_conn
from app.audit import audit

router = APIRouter()


def _row_to_admin_order(row) -> dict:
    """Map the orders table row to the shape Orders.jsx expects."""
    delivery = row["delivery_info"] or {}
    if isinstance(delivery, str):
        import json as _json
        delivery = _json.loads(delivery or "{}")

    items = row["items"] or []
    if isinstance(items, str):
        import json as _json
        items = _json.loads(items or "[]")

    return {
        "_id":           row["order_id"],
        "userId":        row["user_id"],
        "items":         items,
        "address":       delivery,
        "amount":        float(row["total"]),
        "total":         float(row["total"]),
        "paymentMethod": row["payment_method"],
        "status":        row["status"],
        "date":          row["created_at"].isoformat() if row["created_at"] else None,
        "payment":       True,  # legacy field some admin UIs read
    }


@router.post("/list")
async def list_admin_orders(conn: asyncpg.Connection = Depends(get_asyncpg_conn)):
    rows = await conn.fetch("SELECT * FROM orders ORDER BY created_at DESC")
    return {"success": True, "orders": [_row_to_admin_order(r) for r in rows]}


@router.post("/status")
async def update_admin_order_status(
    body: dict = Body(...),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    order_id = body.get("orderId")
    new_status = body.get("status")
    if not order_id or not new_status:
        return {"success": False, "message": "Missing 'orderId' or 'status'"}

    # Frontend uses "Packing" but our enum was "Processing" — keep both valid.
    allowed = {
        "Order Placed", "Packing", "Processing", "Shipped",
        "Out for Delivery", "Delivered",
    }
    if new_status not in allowed:
        return {"success": False, "message": f"Invalid status '{new_status}'"}

    existing = await conn.fetchval(
        "SELECT id FROM orders WHERE order_id = $1", order_id
    )
    if not existing:
        return {"success": False, "message": "Order not found"}

    await conn.execute(
        "UPDATE orders SET status = $1 WHERE order_id = $2",
        new_status, order_id,
    )

    await audit(conn, None, "order.status", order_id, {"status": new_status})
    return {"success": True, "message": "Status updated"}
