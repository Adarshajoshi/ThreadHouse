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
