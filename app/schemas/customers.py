from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class JobResponse(BaseModel):
    id: UUID
    status: str
    filename: str
    row_count: Optional[int]
    customer_count: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class CustomerProfileResponse(BaseModel):
    customer_id: str
    recency: float
    frequency: float
    monetary: float
    segment: str
    clv_12months: Optional[float]
    clv_segment: Optional[str]
    prob_alive: Optional[float]
    hvr_probability: Optional[float]
    hvr_potential: Optional[str]
    anomaly_score: float
    is_anomaly: bool
    anomaly_type: str

    class Config:
        from_attributes = True

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    question: str
    answer: str

class AlertResponse(BaseModel):
    priority: str
    type: str
    title: str
    metric: str
    action: str