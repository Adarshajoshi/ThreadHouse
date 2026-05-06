from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class JobResponse(BaseModel):
    """
    Response schema representing a processing job.

    Used to return job metadata and processing status to API consumers.
    """
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
    """
    Response schema representing a customer analytics profile.

    Contains RFM metrics, segmentation, predictive scores and anomaly signals
    derived from customer transaction behavior.
    """
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
    """
    Request schema for natural language query input.
    """
    question: str

class QueryResponse(BaseModel):
    """
    Response schema for answering natural language queries.
    """
    question: str
    answer: str

class AlertResponse(BaseModel):
    """
    Schema representing a generated business alert or insight.

    Used to communicate prioritized recommendations or warnings
    derived from analytics
    """
    priority: str
    type: str
    title: str
    metric: str
    action: str