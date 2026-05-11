from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Job, CustomerProfile, Insight
from app.auth_deps import get_current_admin

router = APIRouter()

@router.get("/results/{job_id}/status")
def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id":          str(job.id),
        "status":          job.status,
        "filename":        job.filename,
        "row_count":       job.row_count,
        "customer_count":  job.customer_count,
        "error_message":   job.error_message,
        "created_at":      job.created_at,
        "completed_at":    job.completed_at
    }

@router.get("/results/{job_id}/overview")
def get_overview(job_id: str, db: Session = Depends(get_db)):
    profiles = db.query(CustomerProfile).filter(
        CustomerProfile.job_id == job_id
    ).all()

    if not profiles:
        raise HTTPException(status_code=404, detail="No results found")

    total_customers = len(profiles)
    total_revenue   = sum(p.monetary for p in profiles)
    avg_clv         = sum(p.clv_12months for p in profiles if p.clv_12months) / total_customers
    total_anomalies = sum(1 for p in profiles if p.is_anomaly)

    segment_distribution = {}
    for p in profiles:
        segment_distribution[p.segment] = segment_distribution.get(p.segment, 0) + 1

    return {
        "total_customers":      total_customers,
        "total_revenue":        round(total_revenue, 2),
        "avg_clv_12months":     round(avg_clv, 2),
        "total_anomalies":      total_anomalies,
        "segment_distribution": segment_distribution
    }

@router.get("/results/{job_id}/customers")
def get_customers(
    job_id: str,
    segment: str = None,
    is_anomaly: bool = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: int = Depends(get_current_admin),
):
    query = db.query(CustomerProfile).filter(CustomerProfile.job_id == job_id)

    if segment:
        query = query.filter(CustomerProfile.segment == segment)
    if is_anomaly is not None:
        query = query.filter(CustomerProfile.is_anomaly == is_anomaly)

    total = query.count()
    customers = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "customers": [
            {
                "customer_id":      c.customer_id,
                "segment":          c.segment,
                "recency":          c.recency,
                "frequency":        c.frequency,
                "monetary":         c.monetary,
                "clv_12months":     c.clv_12months,
                "clv_segment":      c.clv_segment,
                "prob_alive":       c.prob_alive,
                "hvr_probability":  c.hvr_probability,
                "anomaly_score":    c.anomaly_score,
                "is_anomaly":       c.is_anomaly,
                "anomaly_type":     c.anomaly_type,
            }
            for c in customers
        ]
    }

@router.get("/results/{job_id}/insights")
def get_insights(job_id: str, db: Session = Depends(get_db)):
    insights = db.query(Insight).filter(
        Insight.job_id == job_id
    ).order_by(Insight.priority).all()

    return {
        "insights": [
            {
                "category": i.category,
                "title":    i.title,
                "body":     i.body,
                "priority": i.priority
            }
            for i in insights
        ]
    }

@router.get("/results/{job_id}/top-customers")
def get_top_customers(
    job_id: str,
    n: int = 10,
    db: Session = Depends(get_db),
    _admin: int = Depends(get_current_admin),
):
    customers = db.query(CustomerProfile).filter(
        CustomerProfile.job_id == job_id,
        CustomerProfile.clv_12months != None
    ).order_by(CustomerProfile.clv_12months.desc()).limit(n).all()

    return {
        "top_customers": [
            {
                "customer_id":  c.customer_id,
                "segment":      c.segment,
                "monetary":     c.monetary,
                "clv_12months": c.clv_12months,
                "prob_alive":   c.prob_alive,
                "anomaly_type": c.anomaly_type
            }
            for c in customers
        ]
    }


