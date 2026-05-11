"""
Minimal audit logger. Writes one row to audit_log per significant action.
Call from any handler:  await audit(conn, actor_id, action, target, detail)
"""

import json
from typing import Any, Optional
import asyncpg


async def audit(
    conn: asyncpg.Connection,
    actor_id: Optional[int],
    action: str,
    target: Optional[str] = None,
    detail: Optional[dict[str, Any]] = None,
    actor_email: Optional[str] = None,
) -> None:
    try:
        await conn.execute(
            """
            INSERT INTO audit_log (actor_id, actor_email, action, target, detail)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            """,
            actor_id,
            actor_email,
            action,
            target,
            json.dumps(detail or {}),
        )
    except Exception:
        # Never let logging break the actual operation
        pass
