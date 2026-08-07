
import json
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.db.asyncpg_pool import get_asyncpg_conn
from app.auth_deps import get_current_admin
from app import live_tracking
from fastapi import WebSocket, WebSocketDisconnect, Query, Header
import jwt as _jwt
import os as _os
from datetime import datetime, timezone
from app.schemas.shop import AnalyticsEvent

router = APIRouter()

_CATALOG_PATH = _os.path.join(_os.path.dirname(__file__), "..", "data", "catalog.json")
_CATALOG: dict[str, dict] | None = None


def _catalog() -> dict[str, dict]:
    global _CATALOG
    if _CATALOG is None:
        try:
            with open(_CATALOG_PATH, encoding="utf-8") as f:
                _CATALOG = json.load(f)
        except (OSError, ValueError):
            _CATALOG = {}
    return _CATALOG


def _catalog_image_url(image: str | None) -> str | None:
    """Map a catalog image path like 'images/foo.jpg' to a backend-served URL."""
    if not image:
        return None
    return f"/catalog-images/{_os.path.basename(image)}"


@router.post("/event", status_code=201)
async def ingest_event(
    event: AnalyticsEvent,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
):
    """Receive a single analytics event and broadcast it to live subscribers."""
    raw_ts = event.timestamp
    try:
        ts_dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        ts_dt = datetime.now(timezone.utc)

    await conn.execute(
        """
        INSERT INTO analytics_events
            (session_id, user_id, event_type, page, element, value, monetary_value, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        event.session_id,
        event.user_id,
        event.event_type,
        event.page,
        event.element,
        event.value,
        event.monetary_value,
        ts_dt,
    )
    await live_tracking.publish({
        "session_id":     event.session_id,
        "user_id":        event.user_id,
        "event_type":     event.event_type,
        "page":           event.page,
        "element":        event.element,
        "value":          event.value,
        "monetary_value": event.monetary_value,
        "timestamp":      event.timestamp,
    })
    return {"ok": True}


@router.get("/summary")
async def get_summary(
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
) -> dict[str, Any]:
    """Return aggregated analytics data."""
    total_events: int = await conn.fetchval(
        "SELECT COUNT(*) FROM analytics_events"
    )

    unique_sessions: int = await conn.fetchval(
        "SELECT COUNT(DISTINCT session_id) FROM analytics_events"
    )

    page_views: int = await conn.fetchval(
        "SELECT COUNT(*) FROM analytics_events WHERE event_type = 'page_view'"
    )

    rows = await conn.fetch(
        """
        SELECT page, COUNT(*) AS views
        FROM analytics_events
        WHERE event_type = 'page_view'
        GROUP BY page
        ORDER BY views DESC
        LIMIT 5
        """
    )
    top_pages = [{"page": row["page"], "views": row["views"]} for row in rows]

    rows = await conn.fetch(
        """
        SELECT element, COUNT(*) AS cnt
        FROM   analytics_events
        WHERE  event_type = 'click' AND element IS NOT NULL
        GROUP  BY element
        ORDER  BY cnt DESC
        LIMIT  10
        """
    )
    top_elements = [{"element": row["element"], "count": row["cnt"]} for row in rows]

    rows = await conn.fetch(
        """
        SELECT event_type, COUNT(*) AS cnt
        FROM   analytics_events
        GROUP  BY event_type
        ORDER  BY cnt DESC
        """
    )
    event_types = [{"event_type": r["event_type"], "count": r["cnt"]} for r in rows]

    rows = await conn.fetch(
        """
        SELECT date_trunc('hour', timestamp) AS hour,
               COUNT(*)                      AS count
        FROM   analytics_events
        WHERE  timestamp >= NOW() - INTERVAL '48 hours'
        GROUP  BY hour
        ORDER  BY hour
        """
    )
    hourly_trend = [
        {"hour": r["hour"].isoformat(), "count": r["count"]} for r in rows
    ]

    funnel_steps = ["page_view", "add_to_cart", "checkout_start", "order_placed"]
    funnel: dict[str, int] = {}
    for step in funnel_steps:
        funnel[step] = await conn.fetchval(
            "SELECT COUNT(*) FROM analytics_events WHERE event_type = $1", step
        )

    rows = await conn.fetch(
        """
        SELECT value, COUNT(*) AS cnt
        FROM   analytics_events
        WHERE  element = 'search_input'
          AND  event_type = 'keypress'
          AND  value IS NOT NULL
        GROUP  BY value
        ORDER  BY cnt DESC
        LIMIT  10
        """
    )
    top_searches: dict[str, int] = {r["value"]: r["cnt"] for r in rows}

    return {
        "total_events":    total_events,
        "unique_sessions": unique_sessions,
        "page_views":      page_views,
        "top_elements":    top_elements,
        "top_pages":       top_pages,
        "event_breakdown": event_types,
        "hourly_trend":    hourly_trend,
        "top_searches":    top_searches,
        "funnel":          funnel,
    }


@router.get("/engagement")
async def get_engagement(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    limit: int = Query(10, ge=1, le=50, description="Max rows per list"),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
) -> dict[str, Any]:
    """Engagement view: most visited pages and most wishlisted products.

    Purely a reporting view over analytics_events — does NOT feed the ML
    segmentation pipeline.
    """
    since_clause = f"timestamp >= NOW() - INTERVAL '{days} days'"

    # --- Most visited pages -------------------------------------------------
    rows = await conn.fetch(
        f"""
        SELECT page, COUNT(*) AS views
        FROM   analytics_events
        WHERE  {since_clause}
          AND  event_type = 'page_view'
          AND  page IS NOT NULL
        GROUP  BY page
        ORDER  BY views DESC
        LIMIT  {limit}
        """
    )
    top_pages = [{"page": r["page"], "views": r["views"]} for r in rows]

   
    rows = await conn.fetch(
        f"""
        WITH w AS (
            SELECT value AS product_id,
                   COUNT(*) FILTER (WHERE event_type = 'wishlist_add')    AS adds,
                   COUNT(*) FILTER (WHERE event_type = 'wishlist_remove') AS removes
            FROM   analytics_events
            WHERE  {since_clause}
              AND  event_type IN ('wishlist_add', 'wishlist_remove')
              AND  value IS NOT NULL
            GROUP  BY value
        )
        SELECT w.product_id AS product_id,
               p.name       AS name,
               p.price      AS price,
               p.image      AS image,
               w.adds       AS adds,
               w.removes    AS removes
        FROM   w
        LEFT   JOIN products p
               ON p.id = CASE WHEN w.product_id ~ '^[0-9]+$'
                              THEN w.product_id::int END
        ORDER  BY (w.adds - w.removes) DESC
        LIMIT  {limit}
        """
    )

    def _first_image(raw) -> str | None:
        try:
            imgs = raw if isinstance(raw, list) else json.loads(raw or "[]")
            return imgs[0] if imgs else None
        except (ValueError, TypeError):
            return None

    catalog = _catalog()
    top_wishlisted = []
    for r in rows:
        pid = r["product_id"]
        name = r["name"]
        price = float(r["price"]) if r["price"] is not None else None
        image = _first_image(r["image"])

        # Fall back to the static storefront catalog for ids not in the DB.
        if name is None:
            cat = catalog.get(pid)
            if cat:
                name = cat.get("name")
                if price is None and cat.get("price") is not None:
                    price = float(cat["price"])
                image = image or _catalog_image_url(cat.get("image"))

        top_wishlisted.append({
            "product_id": pid,
            "name":       name or f"Product #{pid}",
            "price":      price,
            "image":      image,
            "adds":       r["adds"],
            "removes":    r["removes"],
            "net":        r["adds"] - r["removes"],
        })

    return {
        "window_days":    days,
        "top_pages":      top_pages,
        "top_wishlisted": top_wishlisted,
    }


#Live RFM Segmentation

def _quintile(values: list[float], v: float, reverse: bool = False) -> int:
    """
    Map `v` to a 1-5 score based on its position in the sorted `values` list.
    If reverse=True, lower `v` -> higher score (used for Recency: smaller is better).
    """
    if not values:
        return 1
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    # rank in [0, n-1]
    rank = sum(1 for x in sorted_vals if x < v)
    pct = rank / max(n - 1, 1)
    if reverse:
        pct = 1 - pct
    if pct >= 0.8:
        return 5
    if pct >= 0.6:
        return 4
    if pct >= 0.4:
        return 3
    if pct >= 0.2:
        return 2
    return 1


def _label(r: int, f: int, m: int) -> str:
    """Standard 11-segment RFM mapping inspired by Putler/Optimove."""
    score = (r, f, m)
    avg_fm = (f + m) / 2
    if r >= 4 and avg_fm >= 4:
        return "Champions"
    if r >= 3 and avg_fm >= 3:
        return "Loyal Customers"
    if r >= 4 and avg_fm <= 2:
        return "New Customers"
    if r >= 3 and 2 <= avg_fm <= 3:
        return "Potential Loyalists"
    if r >= 4 and avg_fm == 1:
        return "Promising"
    if 2 <= r <= 3 and 2 <= avg_fm <= 3:
        return "Need Attention"
    if r == 2 and avg_fm <= 2:
        return "About to Sleep"
    if r <= 2 and avg_fm >= 4:
        return "At Risk"
    if r == 1 and avg_fm >= 4:
        return "Cant Lose Them"
    if r <= 2 and 2 <= avg_fm <= 3:
        return "Hibernating"
    return "Lost"


@router.get("/segments")
async def live_segmentation(
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
) -> dict:
    """
    Compute RFM scores and segments for every user with at least one order.

    Returns:
      - users: list of {user_id, email, name, recency_days, frequency,
               monetary, r, f, m, segment, last_order_at}
      - segment_counts: {segment_name: count}
      - total_segmented_users: int
    """
    rows = await conn.fetch(
        """
        SELECT
            u.id                                AS user_id,
            u.email                             AS email,
            u.name                              AS name,
            COUNT(o.id)                         AS frequency,
            COALESCE(SUM(o.total), 0)           AS monetary,
            MAX(o.created_at)                   AS last_order_at,
            EXTRACT(DAY FROM NOW() - MAX(o.created_at))::int AS recency_days
        FROM users u
        JOIN orders o ON o.user_id = u.id
        GROUP BY u.id, u.email, u.name
        """
    )

    if not rows:
        return {
            "users": [],
            "segment_counts": {},
            "total_segmented_users": 0,
            "note": "No users have placed orders yet.",
        }

    recencies   = [int(r["recency_days"]) for r in rows]
    frequencies = [int(r["frequency"])    for r in rows]
    monetaries  = [float(r["monetary"])   for r in rows]

    users = []
    segment_counts: dict[str, int] = {}

    for r in rows:
        recency_days = int(r["recency_days"])
        frequency    = int(r["frequency"])
        monetary     = float(r["monetary"])

        r_score = _quintile(recencies, recency_days, reverse=True)  # smaller days -> higher score
        f_score = _quintile(frequencies, frequency)
        m_score = _quintile(monetaries, monetary)

        segment = _label(r_score, f_score, m_score)
        segment_counts[segment] = segment_counts.get(segment, 0) + 1

        users.append({
            "user_id":       r["user_id"],
            "email":         r["email"],
            "name":          r["name"],
            "recency_days":  recency_days,
            "frequency":     frequency,
            "monetary":      round(monetary, 2),
            "r":             r_score,
            "f":             f_score,
            "m":             m_score,
            "rfm":           f"{r_score}{f_score}{m_score}",
            "segment":       segment,
            "last_order_at": r["last_order_at"].isoformat() if r["last_order_at"] else None,
        })

    users.sort(key=lambda u: u["monetary"], reverse=True)

    return {
        "total_segmented_users": len(users),
        "segment_counts":        segment_counts,
        "users":                 users,
    }

# ---------------------------------------------------------------------------
# Live tracking
# ---------------------------------------------------------------------------

@router.get("/live")
async def live_snapshot(
    minutes: int = Query(5, ge=1, le=60, description="Look-back window in minutes"),
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
) -> dict:
   
    since_clause = f"timestamp >= NOW() - INTERVAL '{minutes} minutes'"

    active_sessions = await conn.fetchval(
        f"SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE {since_clause}"
    )
    total_events = await conn.fetchval(
        f"SELECT COUNT(*) FROM analytics_events WHERE {since_clause}"
    )

    rows = await conn.fetch(
        f"""
        SELECT date_trunc('minute', timestamp) AS minute, COUNT(*) AS count
        FROM analytics_events
        WHERE {since_clause}
        GROUP BY minute ORDER BY minute
        """
    )
    events_per_min = [
        {"minute": r["minute"].isoformat(), "count": r["count"]} for r in rows
    ]

    rows = await conn.fetch(
        f"""
        SELECT page, COUNT(*) AS views
        FROM analytics_events
        WHERE {since_clause} AND event_type = 'page_view' AND page IS NOT NULL
        GROUP BY page ORDER BY views DESC LIMIT 5
        """
    )
    top_pages = [{"page": r["page"], "views": r["views"]} for r in rows]

    rows = await conn.fetch(
        f"""
        SELECT session_id, event_type, page, element, value, timestamp
        FROM analytics_events
        WHERE {since_clause}
        ORDER BY timestamp DESC LIMIT 50
        """
    )
    recent = [
        {
            "session_id": r["session_id"],
            "event_type": r["event_type"],
            "page":       r["page"],
            "element":    r["element"],
            "value":      r["value"],
            "timestamp":  r["timestamp"].isoformat() if r["timestamp"] else None,
        }
        for r in rows
    ]

    return {
        "window_minutes":     minutes,
        "active_sessions":    int(active_sessions or 0),
        "total_events":       int(total_events or 0),
        "events_per_minute":  events_per_min,
        "top_pages":          top_pages,
        "recent_events":      recent,
        "live_subscribers":   live_tracking.subscriber_count(),
    }


@router.websocket("/ws")
async def live_event_stream(websocket: WebSocket):

    token = websocket.query_params.get("token")
    if not token:
        print("[ws] reject: no token")
        await websocket.close(code=4401)
        return
    try:
        secret = _os.getenv("JWT_SECRET", "")
        payload = _jwt.decode(token, secret, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except Exception as e:
        print(f"[ws] reject: JWT decode failed ({type(e).__name__}: {e}); "
              f"JWT_SECRET present={bool(_os.getenv('JWT_SECRET'))}")
        await websocket.close(code=4401)
        return

    # Verify role from DB
    from app.db.asyncpg_pool import _pool  # lazily reuse the global pool
    if _pool is None:
        print("[ws] reject: asyncpg pool is None (DB not initialised)")
        await websocket.close(code=1011)
        return
    async with _pool.acquire() as conn:
        role = await conn.fetchval("SELECT role FROM users WHERE id = $1", user_id)
    if role != "admin":
        print(f"[ws] reject: user {user_id} role={role!r} (need 'admin')")
        await websocket.close(code=4403)
        return

    print(f"[ws] accept: admin user {user_id} connected")
    await websocket.accept()
    queue = live_tracking.subscribe()
    try:
        await websocket.send_json({"type": "hello", "message": "Live stream open"})
        while True:
            event = await queue.get()
            await websocket.send_json({"type": "event", "data": event})
    except WebSocketDisconnect:
        pass
    finally:
        live_tracking.unsubscribe(queue)



@router.get("/customer/{user_id}")
async def customer_detail(
    user_id: int,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
) -> dict:
    """Per-user drilldown: profile + orders + recent events."""
    user = await conn.fetchrow(
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1", user_id
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    orders = await conn.fetch(
        "SELECT order_id, status, total, payment_method, created_at FROM orders "
        "WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
        user_id,
    )
    events = await conn.fetch(
        "SELECT event_type, page, element, value, monetary_value, timestamp "
        "FROM analytics_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100",
        user_id,
    )

    total_spent = sum(float(o["total"]) for o in orders)
    return {
        "user": {
            "id": user["id"], "name": user["name"], "email": user["email"],
            "role": user["role"],
            "joined_at": user["created_at"].isoformat() if user["created_at"] else None,
        },
        "stats": {
            "order_count":   len(orders),
            "total_spent":   round(total_spent, 2),
            "event_count":   len(events),
        },
        "orders": [
            {
                "order_id":       o["order_id"],
                "status":         o["status"],
                "total":          float(o["total"]),
                "payment_method": o["payment_method"],
                "created_at":     o["created_at"].isoformat() if o["created_at"] else None,
            } for o in orders
        ],
        "events": [
            {
                "event_type":     e["event_type"],
                "page":           e["page"],
                "element":        e["element"],
                "value":          e["value"],
                "monetary_value": float(e["monetary_value"]) if e["monetary_value"] is not None else None,
                "timestamp":      e["timestamp"].isoformat() if e["timestamp"] else None,
            } for e in events
        ],
    }
