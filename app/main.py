import os
import asyncpg
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import init_db
from app.db.session import engine, Base
from app.routers import upload, results, query, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("Databases table ready")
    except Exception as e:
        print(f"Database startup error: {e}")
    yield

app = FastAPI(
    title="Automated Customer Intelligence Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"

)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,  prefix="/api", tags=["Upload"])
app.include_router(results.router, prefix="/api", tags=["Results"])
app.include_router(query.router,   prefix="/api", tags=["Query"])
app.include_router(admin.router,   prefix="/api", tags=["Admin"])


@app.get("/")
def root():
    return {"message": "Automated Customer Intelligence Engine API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
        name="assets"
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react(full_path: str):
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail = "API route not found")
        
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        return {"error": "Frontend not built yet."}

else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "message": "Automated Customer Intelligence Engine API",
            "note": "Frontend not build. Run: cd frontend && npm run build",
            "docs": "/docs"
        }