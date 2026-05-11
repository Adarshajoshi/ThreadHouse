"""
Unified FastAPI app.

Routers:
  Intel / Customer Intelligence (SQLAlchemy ORM, ThreadHouse):
    - /api/upload, /api/results/{job_id}/..., /api/admin/train

  Shop side (asyncpg, ported from old ecommerce backend):
    - /api/auth/{signup,login,admin/login}
    - /api/orders/...
    - /api/analytics/{event,summary,events}

Both share the same Postgres database (mindless), but use different drivers:
  * SQLAlchemy creates: jobs, customer_profiles, insights
  * asyncpg creates:    users, orders, analytics_events
"""

import os
from pathlib import Path

# Load .env BEFORE any router imports - auth.py reads JWT_SECRET at import time.
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db.session import engine, Base
from app.db.asyncpg_pool import close_asyncpg_pool, init_asyncpg_pool

# Intel routers (SQLAlchemy)
from app.routers import admin, query, results, upload

# Shop routers (asyncpg)
from app.routers import analytics, auth, orders, products, admin_orders, intel_live


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1) SQLAlchemy: create intel tables (jobs, customer_profiles, insights).
    try:
        from app.db import models  # noqa: F401  (registers tables on Base)
        Base.metadata.create_all(bind=engine)
        print("SQLAlchemy tables ready: jobs, customer_profiles, insights.")
    except Exception as e:
        print(f"SQLAlchemy startup error: {e}")

    # 2) asyncpg: create shop tables (users, orders, analytics_events).
    try:
        await init_asyncpg_pool()
    except Exception as e:
        print(f"asyncpg startup error: {e}")

    try:
        yield
    finally:
        await close_asyncpg_pool()


app = FastAPI(
    title="ThreadHouse + Customer Intelligence Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    # Allow any localhost / 127.0.0.1 port during dev (Vite, admin panel, etc.).
    # In production, replace with explicit allow_origins.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Intel / CIE routers - match what frontend/src/services/api.js expects.
app.include_router(upload.router,   prefix="/api",            tags=["Upload"])
app.include_router(results.router,  prefix="/api",            tags=["Results"])
app.include_router(query.router,    prefix="/api",            tags=["Query"])
app.include_router(admin.router,    prefix="/api",            tags=["Admin"])

# Shop routers - match what Login.jsx, ShopContext.jsx, useAnalytics.js expect.
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(orders.router,    prefix="/api/orders",    tags=["Orders"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# Legacy alias for admin/Login.jsx (POST /api/user/admin)
app.include_router(auth.admin_alias_router, prefix="/api/user", tags=["Auth (legacy alias)"])

# Admin panel singular-path endpoints.
app.include_router(products.router,      prefix="/api/product", tags=["Products (admin)"])
app.include_router(admin_orders.router,  prefix="/api/order",   tags=["Orders (admin)"])
app.include_router(intel_live.router,    prefix="/api/intel",   tags=["Intel (live)"])


# Static files (product images uploaded via the admin panel).
import os as _os
_STATIC_DIR = _os.path.join(_os.path.dirname(__file__), "..", "static")
_os.makedirs(_os.path.join(_STATIC_DIR, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")


@app.get("/health")
def health():
    return {"status": "healthy"}


# Optional: if the frontend has been built into ../frontend/dist, serve it.
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend not built yet."}

else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "message": "ThreadHouse + Customer Intelligence Engine API",
            "note": "Frontend not built. Run: cd frontend && npm run build",
            "docs": "/docs",
        }
