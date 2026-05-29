import csv
import json
import os
import uuid
from datetime import datetime

import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_deps import get_current_admin
from app.core.config import settings
from app.db.asyncpg_pool import get_asyncpg_conn
from app.db.models import Job
from app.db.session import SessionLocal
from app.services.ml_services import run_full_pipeline

router = APIRouter()


@router.post("/run-on-current-users")
async def run_on_current_users(
    background_tasks: BackgroundTasks,
    conn: asyncpg.Connection = Depends(get_asyncpg_conn),
    _admin: int = Depends(get_current_admin),
):
    rows = await conn.fetch(
        """
        SELECT order_id, user_id, items, total, created_at
        FROM orders
        WHERE user_id IS NOT NULL
        ORDER BY created_at
        """
    )

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No orders with linked user_id yet. Place at least one order while logged in.",
        )

    # Expand items[] into line items.
    line_items: list[dict] = []
    for r in rows:
        items = r["items"]
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except json.JSONDecodeError:
                items = []
        if not isinstance(items, list):
            continue

        invoice_date = r["created_at"]
        invoice_no   = r["order_id"]
        customer_id  = r["user_id"]

        for it in items:
            if not isinstance(it, dict):
                continue
            try:
                quantity = int(it.get("quantity", 1) or 1)
                price    = float(it.get("price", 0) or 0)
            except (TypeError, ValueError):
                continue
            line_items.append({
                "InvoiceNo":   invoice_no,
                "StockCode":   str(it.get("_id", "")),
                "Description": it.get("name", "")[:200],
                "Quantity":    quantity,
                "InvoiceDate": invoice_date.strftime("%d-%m-%Y %H:%M") if invoice_date else "",
                "UnitPrice":   price,
                "CustomerID":  customer_id,
                "Country":     it.get("country", "Unknown"),
            })

    if not line_items:
        raise HTTPException(
            status_code=400,
            detail="Orders found, but their items[] arrays are empty / malformed - nothing to analyze.",
        )

    # Write to disk.
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    job_id = str(uuid.uuid4())
    filename = f"live_export_{job_id}.csv"
    filepath = os.path.join(upload_dir, filename)

    fieldnames = ["InvoiceNo","StockCode","Description","Quantity","InvoiceDate","UnitPrice","CustomerID","Country"]
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for li in line_items:
            w.writerow(li)

    # Insert Job row via SQLAlchemy (the pipeline expects it to exist).
    db = SessionLocal()
    try:
        job = Job(id=job_id, status="processing", filename=filename)
        db.add(job)
        db.commit()
    finally:
        db.close()

    background_tasks.add_task(run_full_pipeline, job_id, filepath)

    return {
        "job_id":          job_id,
        "status":          "processing",
        "source":          "current_users",
        "row_count":       len(line_items),
        "distinct_users":  len({li["CustomerID"] for li in line_items}),
        "message":         f"Exported {len(line_items)} line items from {len(rows)} orders. Pipeline running.",
    }
