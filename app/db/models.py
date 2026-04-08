from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.    session import Base
import uuid
from datetime import datetime

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid = True), primary_key = True, default = uuid.uuid4)
    status = Column(String, default = "processing")
    filename = Column(String)
    row_count = Column(Integer)
    customer_count = Column(Integer)
    error_message = Column(String, nullable = True)
    created_at = Column(DateTime, default = datetime.utcnow)
    completed_at   = Column(DateTime, nullable=True)

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(UUID(as_uuid = True), primary_key = True, default = uuid.uuid4)
    job_id = Column(UUID(as_uuid = True), ForeignKey("jobs.id"))
    customer_id = Column(String)

    recency = Column(Float)
    frequency = Column(Float)
    monetary = Column(Float)
    avg_order_value = Column(Float)
    total_items = Column(Float)
    distinct_products = Column(Float)
    tenure_days = Column(Float)
    avg_items_per_order = Column(Float)

    r_score = Column(Integer)
    f_score = Column(Integer)
    m_score = Column(Integer)
    segment = Column(String)

    clv_12months = Column(Float, nullable = True)
    clv_segment = Column(String, nullable = True)
    prob_alive = Column(Float, nullable = True)
    predicted_purchases_90d = Column(Float, nullable = True)

    hvr_probability = Column(Float, nullable = True)
    hvr_potential = Column(String, nullable = True)
    
    anomaly_score = Column(Float)
    is_anomaly = Column(Boolean)
    anomaly_severity = Column(String)
    anomaly_type = Column(String)


class Insight(Base):
    __tablename__ = "insights"

    id = Column(UUID(as_uuid = True), primary_key = True, default = uuid.uuid4)
    job_id = Column(UUID(as_uuid = True), ForeignKey("jobs.id"))
    category = Column(String)
    title = Column(String)
    body = Column(String)
    priority = Column(Integer) # 1 = critical, 2 = high, 3 = medium
