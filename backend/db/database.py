import asyncpg
import os

DB_CONFIG = {
    "user":     os.getenv("DB_USER", "user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "mindless"),
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5434)),
}

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS analytics_events (
    id          SERIAL      PRIMARY KEY,
    session_id  TEXT        NOT NULL,
    event_type  TEXT        NOT NULL,
    page        TEXT,
    element     TEXT,
    value       TEXT,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type    ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_ts      ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events (session_id);

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL      PRIMARY KEY,
    name          TEXT,
    email         TEXT        UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL      PRIMARY KEY,
    order_id       TEXT        UNIQUE NOT NULL,
    user_id        INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    items          JSONB       NOT NULL,
    delivery_info  JSONB       NOT NULL,
    payment_method TEXT        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'Order Placed',
    total          NUMERIC(10,2) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
"""

_pool = None


async def init_db():
    global _pool
    _pool = await asyncpg.create_pool(**DB_CONFIG)
    async with _pool.acquire() as conn:
        await conn.execute(CREATE_TABLES_SQL)
    print("Database initialized and tables verified.")


async def get_db():
    if _pool is None:
        raise Exception("Database pool not initialized. Call init_db first.")
    async with _pool.acquire() as connection:
        yield connection


async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        print("Database pool closed.")