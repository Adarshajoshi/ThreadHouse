import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Job, CustomerProfile, Insight

from app.pipeline.schema_detection import detect_schema
from app.pipeline.prediction import predict_hvr
from app.pipeline.rfm_extraction import extract_rfm
from app.pipeline.segmentation import score_and_segment
from app.pipeline.clv import compute_clv
from app.pipeline.anomaly import detect_anomalies
from app.pipeline.insights import generate_all_insights


def standardize_customer_id(df: pd.DataFrame) -> pd.DataFrame:
    df["CustomerID"] = (
        df["CustomerID"]
        .astype(str)
        .str.strip()
        .str.replace(".0", "", regex=False)
    )
    return df

def run_full_pipeline(job_id: str, filepath: str):
    db = SessionLocal()

    try:
        df_raw = pd.read_csv(filepath)

        job = db.query(Job).filter(Job.id == job_id).first()
        job.row_count = len(df_raw)
        db.commit()

        schema = detect_schema(df_raw)
        if not schema["success"]:
            raise ValueError(f"Schema detection failed: {schema['missing']}")

        rfm_df = extract_rfm(df_raw, schema["mapping"])
        rfm_df    = standardize_customer_id(rfm_df)

        scored_df = score_and_segment(rfm_df)
        scored_df = standardize_customer_id(scored_df)

        if len(scored_df) >= 100:
            scored_df = predict_hvr(scored_df)
        else:
            scored_df["hvr_probability"] = None
            scored_df["hvr_potential"]   = None

        clv_df = compute_clv(df_raw, schema["mapping"])
        clv_df = standardize_customer_id(clv_df)
        scored_df = scored_df.merge(
            clv_df[["CustomerID", "clv_12months", "clv_segment",
                    "prob_alive", "predicted_purchases_90d"]],
            on="CustomerID", how="left"
        )

        scored_df = detect_anomalies(scored_df)

        job.customer_count = len(scored_df)
        db.commit()

        profiles = []
        for _, row in scored_df.iterrows():
            profile = CustomerProfile(
                job_id           = job_id,
                customer_id      = str(row["CustomerID"]),
                recency          = float(row["Recency"]),
                frequency        = float(row["Frequency"]),
                monetary         = float(row["Monetary"]),
                avg_order_value  = float(row.get("AvgOrderValue", 0)),
                total_items      = float(row.get("TotalItems", 0)),
                distinct_products= float(row.get("DistinctProducts", 0)),
                tenure_days      = float(row.get("TenureDays", 0)),
                avg_items_per_order = float(row.get("AvgItemsPerOrder", 0)),
                r_score          = int(row.get("R_score", 0)),
                f_score          = int(row.get("F_score", 0)),
                m_score          = int(row.get("M_score", 0)),
                segment          = str(row.get("Segment", "Unknown")),
                clv_12months     = float(row["clv_12months"]) if pd.notna(row.get("clv_12months")) else None,
                clv_segment      = str(row["clv_segment"]) if pd.notna(row.get("clv_segment")) else None,
                prob_alive       = float(row["prob_alive"]) if pd.notna(row.get("prob_alive")) else None,
                predicted_purchases_90d = float(row["predicted_purchases_90d"]) if pd.notna(row.get("predicted_purchases_90d")) else None,
                hvr_probability  = float(row["hvr_probability"]) if pd.notna(row.get("hvr_probability")) else None,
                hvr_potential    = str(row["hvr_potential"]) if pd.notna(row.get("hvr_potential")) else None,
                anomaly_score    = float(row.get("anomaly_score", 0)),
                is_anomaly       = bool(row.get("is_anomaly", False)),
                anomaly_severity = str(row.get("anomaly_severity", "Normal")),
                anomaly_type     = str(row.get("anomaly_type", "Normal")),
            )
            profiles.append(profile)

        db.bulk_save_objects(profiles)
        db.commit()

        insights = generate_all_insights(scored_df)

        insight_objects = []
        for category, content in insights.items():
            insight = Insight(
                job_id   = job_id,
                category = category,
                title    = content.get("title", category),
                body     = content.get("body", str(content)),
                priority = content.get("priority", 3)
            )
            insight_objects.append(insight)

        db.bulk_save_objects(insight_objects)
        db.commit()

        job.status       = "complete"
        job.completed_at = datetime.utcnow()
        db.commit()

        # Best-effort: render and save the dashboard charts locally
        # (static/plots/<job_id>/*.png). Never fail the pipeline over this.
        try:
            from app.services.plots import save_plots
            saved = save_plots(job_id, profiles)
            print(f"Saved {len(saved)} chart images for job {job_id}")
        except Exception as e:
            print(f"Chart saving skipped for job {job_id}: {e}")

        print(f"Pipeline complete for job {job_id}")

    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status        = "failed"
        job.error_message = str(e)
        db.commit()
        print(f"Pipeline failed for job {job_id}: {e}")

    finally:
        db.close()
