from typing import Any

import asyncpg
from fastapi import APIRouter, Depends

from db.database import get_db
from models.schemas import AnalyticsEvent

router = APIRouter()

@router.post("/event", status_code=201)
async def ingest_event(
    event: AnalyticsEvent,
    conn: asyncpg.Connection = Depends(get_db),
):
    """Receive single analytics"""
    await conn.execute(
        """
        INSERT INTO analytics_events
            (session_id, event_type, page, element, value, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        """,
        event.session_id,
        event.event_type,
        event.page,
        event.element,
        event.value,
        event.timestamp,
    )
    return {"ok": True}

@router.get("/summary")
async def get_summary(
    conn: asyncpg.Connection = Depends(get_db),
) -> dict[str, Any]:
    """
    Return aggregated analytics data
    """
    #total events
    total_events: int = await conn.fetchval(
        "SELECT COUNT(*) FROM analytics_events"
    )

    #Unique sessions
    unique_sessions: int = await conn.fetchval(
        "SELECT COUNT(DISTINCT session_id) FROM analytics_events"
    )

    #Page views
    page_views: int = await conn.fetchval(
        "SELECT COUNT(*) FROM analytics_events WHERE event_type = 'page_view'"
    )

    #Top pages
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


    #Top elements
    rows=await conn.fetch(
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

    #Event type
    row=await conn.fetch(
        """
        SELECT event_type, COUNT(*) AS cnt
        FROM   analytics_events
        GROUP  BY event_type
        ORDER  BY cnt DESC
        """
    )
    event_types = [{"event_type": row["event_type"], "count": row["cnt"]} for row in row]

    #Hourly Trend(48hr)
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

    #Checkout funnel
    funnel_steps = ["page_view", "add_to_cart", "checkout_start", "order_placed"]
    funnel: dict[str, int] = {}
    for step in funnel_steps:
        funnel[step] = await conn.fetchval(
            "SELECT COUNT(*) FROM analytics_events WHERE event_type = $1", step
        )

    #Top search terms
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
        "total_events": total_events,
        "unique_sessions": unique_sessions,
        "page_views": page_views,
        "top_elements": top_elements,
        "top_pages": top_pages,
        "event_breakdown": event_types,
        "hourly_trend": hourly_trend,
        "top_searches": top_searches,
        "funnel": funnel,
    }


@router.delete("/events", status_code=200)
async def clear_events(conn: asyncpg.Connection = Depends(get_db)):
    """Dev helper — wipe all analytics data."""
    await conn.execute("DELETE FROM analytics_events")
    return {"ok": True, "message": "All analytics events cleared"}
