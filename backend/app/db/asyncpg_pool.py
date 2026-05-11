import os
import asyncpg

DB_CONFIG = {
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME",     "mindless"),
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
}

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS analytics_events (
    id              SERIAL      PRIMARY KEY,
    session_id      TEXT        NOT NULL,
    user_id         INTEGER,
    event_type      TEXT        NOT NULL,
    page            TEXT,
    element         TEXT,
    value           TEXT,
    monetary_value  NUMERIC(10,2),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id        INTEGER;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS monetary_value NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_events_type    ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_ts      ON analytics_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_user    ON analytics_events (user_id);

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL      PRIMARY KEY,
    name          TEXT,
    email         TEXT        UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL        PRIMARY KEY,
    order_id       TEXT          UNIQUE NOT NULL,
    user_id        INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    items          JSONB         NOT NULL,
    delivery_info  JSONB         NOT NULL,
    payment_method TEXT          NOT NULL,
    status         TEXT          NOT NULL DEFAULT 'Order Placed',
    total          NUMERIC(10,2) NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE TABLE IF NOT EXISTS products (
    id           SERIAL        PRIMARY KEY,
    name         TEXT          NOT NULL,
    description  TEXT          NOT NULL DEFAULT '',
    price        NUMERIC(10,2) NOT NULL,
    image        JSONB         NOT NULL DEFAULT '[]'::jsonb,
    category     TEXT,
    sub_category TEXT,
    sizes        JSONB         NOT NULL DEFAULT '[]'::jsonb,
    bestseller   BOOLEAN       NOT NULL DEFAULT FALSE,
    date         BIGINT        NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products (bestseller);

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL      PRIMARY KEY,
    actor_id    INTEGER,
    actor_email TEXT,
    action      TEXT        NOT NULL,
    target      TEXT,
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);
"""

_pool: asyncpg.Pool | None = None


async def init_asyncpg_pool() -> None:
    """Create the asyncpg pool and ensure shop-side tables exist."""
    global _pool
    _pool = await asyncpg.create_pool(**DB_CONFIG)
    async with _pool.acquire() as conn:
        await conn.execute(CREATE_TABLES_SQL)
    print("asyncpg pool ready: users, orders, analytics_events, products tables verified.")


async def close_asyncpg_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        print("asyncpg pool closed.")


async def get_asyncpg_conn():
    """FastAPI dependency: yields a pooled asyncpg connection."""
    if _pool is None:
        raise RuntimeError("asyncpg pool not initialized. Call init_asyncpg_pool first.")
    async with _pool.acquire() as conn:
        yield conn
