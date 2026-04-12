from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.routers import upload, results, query

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Automated Customer Intelligence Engine",
    version="1.0.0"
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

@app.get("/")
def root():
    return {"message": "Automated Customer Intelligence Engine API"}

@app.get("/health")
def health():
    return {"status": "healthy"}