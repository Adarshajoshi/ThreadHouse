import os
import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import init_db
from app.db.session import engine, Base
from app.routers import upload, results, query, admin
from app.routers import analytics, auth, products, orders


load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated Customer Intelligence Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["https://reactapp.vercel.app"],
    allow_headers=["*"],
)

app.include_router(upload.router,  prefix="/api", tags=["Upload"])
app.include_router(results.router, prefix="/api", tags=["Results"])
app.include_router(query.router,   prefix="/api", tags=["Query"])
app.include_router(admin.router,   prefix="/api", tags=["Admin"])
app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
app.include_router(auth.router,  prefix="/api/auth",  tags=["Auth"])
app.include_router(orders.router,  prefix="/api/orders",  tags=["Orders"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])

@app.get("/")
def root():
    return {"message": "Automated Customer Intelligence Engine API"}

@app.get("/health")
def health():
    return {"status": "healthy"}