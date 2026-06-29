from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import CustomerProfile
from app.auth_deps import get_current_admin
from app.schemas.customers import QueryRequest, QueryResponse
from groq import Groq
from app.core.config import settings
from decouple import config
import json
import re

router = APIRouter()

SECRET_KEY = config("SECRET_KEY", default="")


_groq_client = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = config("GROQ_API_KEY", default="")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="GROQ_API_KEY is not configured on the server",
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


@router.post("/results/{job_id}/query", response_model=QueryResponse)
def natural_language_query(
    job_id: str,
    request: QueryRequest,
    db: Session = Depends(get_db),
    _admin: int = Depends(get_current_admin),
):
    profiles = db.query(CustomerProfile).filter(
        CustomerProfile.job_id == job_id
    ).all()

    if not profiles:
        raise HTTPException(status_code=404, detail="No results found")

    total = len(profiles)
    revenue = sum(p.monetary for p in profiles)
    segments = {}
    for p in profiles:
        segments[p.segment] = segments.get(p.segment, 0) + 1

    context = (
        "Customer Analytics Data:\n"
        f"- Total customers: {total}\n"
        f"- Total revenue: GBP {revenue:,.2f}\n"
        f"- Segments: {json.dumps(segments)}\n"
        f"- Anomalies: {sum(1 for p in profiles if p.is_anomaly)}\n"
    )

    groq_response = _get_groq_client().chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[
            {
                "role": "system",
                "content": "You are a customer analytics assistant. Answer questions using the provided data. Be specific and cite numbers./no_think",
            },
            {
                "role": "user",
                "content": f"Data:\n{context}\n\nQuestion: {request.question}/no_think",
            },
        ],
        temperature=0.3,
        max_tokens=400,
    )
    raw_content = groq_response.choices[0].message.content
    clean_content = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
    return QueryResponse(
        question=request.question,
        answer=clean_content,
    )
