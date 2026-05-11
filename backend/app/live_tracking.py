"""
In-memory pub/sub for live analytics.

* publish(event)   - called from /api/analytics/event after every insert.
* subscribe()      - returns an asyncio.Queue that yields incoming events.
                     The /ws/analytics WebSocket holds one queue per client.

Single-process only (an asyncio.Queue can't span processes). For multi-worker
deploys swap this for Redis pub/sub or NATS.
"""

import asyncio
from typing import Any, Optional

# Set of subscriber queues. Each WebSocket holds one.
_subscribers: set[asyncio.Queue] = set()


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _subscribers.add(q)
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    _subscribers.discard(q)


async def publish(event: dict[str, Any]) -> None:
    """Fan-out to every subscriber. Drops the event for slow consumers."""
    dead: list[asyncio.Queue] = []
    for q in list(_subscribers):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        _subscribers.discard(q)


def subscriber_count() -> int:
    return len(_subscribers)
