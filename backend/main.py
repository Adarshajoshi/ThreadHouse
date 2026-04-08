from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncpg
import os
from backend.db.session import init_db
from routers import analytics, auth, products, orders

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="ThreadHouse API",
    description="Backend API for ThreadHouse e-commerce store",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
app.include_router(auth.router,  prefix="/api/auth",  tags=["Auth"])
app.include_router(orders.router,  prefix="/api/orders",  tags=["Orders"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])



@app.get("/")
async def root():
    return {"message": "ThreadHouse API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
