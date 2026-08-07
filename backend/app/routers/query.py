from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import CustomerProfile
from app.auth_deps import get_current_admin
from app.schemas.customers import QueryRequest, QueryResponse
from groq import Groq
from app.core.config import settings, get_groq_key, _ENV_PATH
from decouple import config
import json
import re

router = APIRouter()

SECRET_KEY = config("SECRET_KEY", default="")


_groq_client = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = get_groq_key()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail=(
                    "GROQ_API_KEY is not configured on the server "
                    f"(checked .env at {_ENV_PATH}, exists={_ENV_PATH.exists()})"
                ),
            )
        print(f"[groq] key loaded (len={len(api_key)}) — LLM query ready")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def _build_context(profiles) -> str:
    total = len(profiles)
    revenue = sum((p.monetary or 0) for p in profiles)
    anomalies = sum(1 for p in profiles if p.is_anomaly)
    clv_vals = [p.clv_12months for p in profiles if p.clv_12months]
    avg_clv = (sum(clv_vals) / len(clv_vals)) if clv_vals else 0

    # Per-segment breakdown: count, revenue, share of revenue, avg CLV
    seg = {}
    for p in profiles:
        s = seg.setdefault(p.segment or "Unknown",
                           {"count": 0, "revenue": 0.0, "clv": 0.0, "clv_n": 0})
        s["count"] += 1
        s["revenue"] += (p.monetary or 0)
        if p.clv_12months:
            s["clv"] += p.clv_12months
            s["clv_n"] += 1
    seg_lines = []
    for name, d in sorted(seg.items(), key=lambda x: -x[1]["revenue"]):
        pct = (d["revenue"] / revenue * 100) if revenue else 0
        avg_c = (d["clv"] / d["clv_n"]) if d["clv_n"] else 0
        seg_lines.append(
            f'    - {name}: {d["count"]} customers, revenue GBP {d["revenue"]:,.2f} '
            f'({pct:.1f}% of total), avg 12m CLV GBP {avg_c:,.2f}'
        )

    # HVR potential + anomaly type breakdowns
    hvr = {}
    for p in profiles:
        if p.hvr_potential:
            hvr[p.hvr_potential] = hvr.get(p.hvr_potential, 0) + 1
    an = {}
    for p in profiles:
        if p.is_anomaly:
            an[p.anomaly_type or "Unknown"] = an.get(p.anomaly_type or "Unknown", 0) + 1

    # Top 5 customers by revenue
    top = sorted(profiles, key=lambda p: (p.monetary or 0), reverse=True)[:5]
    top_lines = [
        f'    - customer {p.customer_id}: revenue GBP {(p.monetary or 0):,.2f}, '
        f'segment {p.segment}, 12m CLV GBP {(p.clv_12months or 0):,.2f}'
        for p in top
    ]

    return (
        "Customer Analytics Data (all monetary values in GBP):\n"
        f"- Total customers: {total}\n"
        f"- Total revenue: GBP {revenue:,.2f}\n"
        f"- Average 12-month CLV: GBP {avg_clv:,.2f}\n"
        f"- Anomalous customers: {anomalies}\n"
        "- Revenue and CLV by segment (ordered by revenue, highest first):\n"
        + "\n".join(seg_lines) + "\n"
        f"- High-Value-Repeater potential counts: {json.dumps(hvr)}\n"
        f"- Anomaly type counts: {json.dumps(an)}\n"
        "- Top customers by revenue:\n"
        + "\n".join(top_lines) + "\n"
    )


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

    context = _build_context(profiles)

    try:
        groq_response = _get_groq_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a customer analytics assistant. Answer the question "
                        "using ONLY the provided data. Be specific and cite the numbers "
                        "(including the per-segment revenue figures). If the data truly "
                        "does not contain the answer, say so briefly./no_think"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Data:\n{context}\n\nQuestion: {request.question}/no_think",
                },
            ],
            temperature=0.3,
            max_tokens=500,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[groq] LLM request FAILED: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail=f"LLM request failed: {e}")

    raw_content = groq_response.choices[0].message.content
    clean_content = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
    return QueryResponse(
        question=request.question,
        answer=clean_content,
    )
