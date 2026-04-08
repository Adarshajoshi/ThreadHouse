from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import CustomerProfile
from app.schemas.customers import QueryRequest, QueryResponse
from groq import Groq
from app.core.config import settings
from decouple import config
import json

router = APIRouter()

SECRET_KEY = config("SECRET_KEY")
client = Groq(api_key=config('GROQ_API_KEY'))

@router.post("/results/{job_id}/query", response_model=QueryResponse)
def natural_language_query(
    job_id: str,
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    profiles = db.query(CustomerProfile).filter(
        CustomerProfile.job_id == job_id
    ).all()

    if not profiles:
        raise HTTPException(status_code=404, detail="No results found")

    total     = len(profiles)
    revenue   = sum(p.monetary for p in profiles)
    segments  = {}
    for p in profiles:
        segments[p.segment] = segments.get(p.segment, 0) + 1

    context = f"""
    Customer Analytics Data:
    - Total customers: {total}
    - Total revenue: £{revenue:,.2f}
    - Segments: {json.dumps(segments)}
    - Anomalies: {sum(1 for p in profiles if p.is_anomaly)}
    """

    response = client.chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[
            {
                "role": "system",
                "content": "You are a customer analytics assistant. Answer questions using the provided data. Be specific and cite numbers."
            },
            {
                "role": "user",
                "content": f"Data:\n{context}\n\nQuestion: {request.question}"
            }
        ],
        temperature=0.3,
        max_tokens=400
    )

    return QueryResponse(
        question=request.question,
        answer=response.choices[0].message.content
    )