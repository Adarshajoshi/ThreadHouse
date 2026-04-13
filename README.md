# Automated Customer Intelligence Engine

> A full-stack AI-powered customer analytics platform that automatically segments customers, predicts lifetime value, detects anomalies, and generates actionable business insights all from a single CSV upload.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Intelligence Pipeline](#intelligence-pipeline)
  - [Layer 0 — Schema Detection & RFM Extraction](#layer-0--schema-detection--rfm-extraction)
  - [Layer 1 — RFM Scoring & Segmentation](#layer-1--rfm-scoring--segmentation)
  - [Layer 2 — Predictive ML (HVR)](#layer-2--predictive-ml-hvr)
  - [Layer 3 — Customer Lifetime Value](#layer-3--customer-lifetime-value)
  - [Layer 4 — Anomaly Detection](#layer-4--anomaly-detection)
  - [Layer 5 — LLM Insight Generation](#layer-5--llm-insight-generation)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Dataset](#dataset)
- [Results & Evaluation](#results--evaluation)
- [Known Limitations](#known-limitations)
- [Future Work](#future-work)
- [Team](#team)

---

## Overview

The **Automated Customer Intelligence Engine** is a final year project that addresses a real business problem: most small and medium businesses collect transaction data but lack the tools or expertise to extract meaningful insights from it.

This system solves that by accepting any transactional CSV dataset, automatically detecting its structure, and running a full customer analytics pipeline without any manual configuration. The output is a rich dashboard of customer segments, lifetime value predictions, anomaly flags, and AI-generated business recommendations.

**What makes it different from a standard analytics dashboard:**

- Works on **any** transactional dataset — not just a fixed format
- The entire pipeline runs **automatically** on upload — no manual steps
- Combines **statistical models** (BG/NBD), **ML models** (GradientBoosting), and **deep learning** (Autoencoder) in a single pipeline
- Generates **natural language insights** using an open-source LLM
- Supports **natural language Q&A** — ask questions about your customers in plain English

---

## Live Demo

| Service | URL |
|---|---|
| Backend API | `https://huggingface.co/spaces/paudelapil/Mindless_System` |
| API Documentation | `https://paudelapil-mindless-system.hf.space/docs` |
| Frontend Dashboard | `ADD_YOUR_VERCEL_URL_HERE` |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│         (Recharts, Axios, Tailwind CSS)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                        │
│              (HuggingFace Spaces)                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Intelligence Pipeline              │    │
│  │                                                 │    │
│  │  Schema Detection → RFM Extraction              │    │
│  │       → Segmentation → HVR Prediction           │    │
│  │       → CLV (BG/NBD) → Anomaly Detection        │    │
│  │       → LLM Insights                            │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────────┐
│              PostgreSQL (Supabase)                      │
│         jobs | customer_profiles | insights             │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                 External Services                       │
│         Groq API (Qwen3) — LLM insight generation       │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| Web Framework | FastAPI |
| Database ORM | SQLAlchemy |
| Database | PostgreSQL (Supabase) |
| Task Management | FastAPI BackgroundTasks |
| Data Processing | Pandas, NumPy |
| ML Framework | PyTorch, Scikit-learn |
| CLV Modeling | Lifetimes (BG/NBD + Gamma-Gamma) |
| LLM Provider | Groq API (Qwen3) |
| Fuzzy Matching | RapidFuzz |
| Deployment | HuggingFace Spaces (Docker) |

### Frontend
| Component | Technology |
|---|---|
| Framework | React |
| Charts | Recharts |
| HTTP Client | Axios |
| Styling | Tailwind CSS |
| Deployment | Vercel |

### ML Models
| Model | Purpose | Performance |
|---|---|---|
| Autoencoder (PyTorch) | Dimensionality reduction + Anomaly detection | MSE: 0.099 |
| GradientBoostingClassifier | High Value Repeat buyer prediction | AUC: 0.71 (temporal) |
| BG/NBD | Purchase frequency prediction | — |
| Gamma-Gamma | Average order value prediction | — |

---

## Intelligence Pipeline

The pipeline runs automatically when a CSV is uploaded. Each layer builds on the previous one.

```
CSV Upload
    │
    ▼
Layer 0 ── Schema Detection + RFM Extraction
    │         Detect column names automatically
    │         Compute 8 behavioral features per customer
    ▼
Layer 1 ── RFM Scoring + Segmentation
    │         Score R, F, M from 1-5
    │         Assign one of 10 named segments
    ▼
Layer 2 ── HVR Prediction
    │         Predict probability of becoming high-value repeat buyer
    │         Trained with temporal validation (genuine future prediction)
    ▼
Layer 3 ── CLV Prediction
    │         BG/NBD: predict future purchase frequency
    │         Gamma-Gamma: predict average order value
    │         Output: 12-month CLV per customer
    ▼
Layer 4 ── Anomaly Detection
    │         Autoencoder reconstruction error as anomaly score
    │         Classify: Bulk Buyer / Ghost / Return Abuser / Erratic
    ▼
Layer 5 ── LLM Insight Generation
              Executive summary (Qwen3)
              Segment recommendations (Qwen3)
              Priority alerts (rule-based)
              Natural language Q&A (Qwen3)
```

---

### Layer 0 — Schema Detection & RFM Extraction

**Problem:** Every client's CSV has different column names.

**Solution:** Three-tier detection:

```
Tier 1 — Exact match      "CustomerID" → detected instantly
Tier 2 — Fuzzy match      "customer_no" → 85% similarity → detected
Tier 3 — LLM fallback     Send columns + sample to Qwen3 → identified
```

**RFM Features Extracted:**

| Feature | Description |
|---|---|
| Recency | Days since last purchase |
| Frequency | Number of unique orders |
| Monetary | Total spend |
| AvgOrderValue | Average spend per order |
| TotalItems | Total quantity purchased |
| DistinctProducts | Number of different products bought |
| TenureDays | Days between first and last purchase |
| AvgItemsPerOrder | Average basket size |

---

### Layer 1 — RFM Scoring & Segmentation

Each customer is scored 1-5 on Recency, Frequency, and Monetary using quantile binning, then assigned to one of 10 business segments:

| Segment | Description | Action |
|---|---|---|
| **Champion** | Best customers — frequent, recent, high spend | Reward and retain |
| **Loyal Customer** | Consistent buyers with solid history | Upsell premium products |
| **Potential Loyalist** | Showing loyalty signals | Nurture toward loyalty |
| **New Customer** | Recent first-time buyers | Drive second purchase |
| **Promising** | Recent with high first order | Fast-track to loyalty |
| **Needs Attention** | Below average on multiple dimensions | Re-engage |
| **About to Sleep** | Declining engagement | Wake-up campaign |
| **At Risk** | Were good customers, gone quiet | Win-back campaign |
| **Can't Lose Them** | High value but inactive | Immediate outreach |
| **Lost Customer** | Low everything, probably gone | Last chance offer |
| **Anomalous** | Zero monetary — return-only customers | Manual review |

**Why rule-based over clustering:**
Clustering produces arbitrary, unstable segments that change with parameters. Rule-based scoring always produces the same named, interpretable segments — which is what real CRM tools like Klaviyo and HubSpot use.

---

### Layer 2 — Predictive ML (HVR)

**Goal:** Predict which customers will become high-value repeat buyers in the future.

**Target Definition:**
```
High Value Future Buyer =
    future_monetary >= 60th percentile
    AND future_frequency >= 2 orders
    in the held-out future period
```

**Temporal Validation (key design decision):**

```
   Wrong approach (what we tried first):
   Random train/test split → model sees future data → AUC = 1.00 (fake)

   Correct approach:
   Train:  Dec 2010 → Aug 2011 (first 8 months)
   Test:   Sep 2011 → Dec 2011 (last 4 months)
   Model genuinely predicts future behavior → AUC = 0.71 (real)
```

**Result:** 0.71 AUC with genuine temporal validation — consistent with industry benchmarks of 0.70-0.80 for customer analytics models.

---

### Layer 3 — Customer Lifetime Value

Uses the **BG/NBD + Gamma-Gamma** statistical framework:

**BG/NBD Model** — models two simultaneous processes:
- *Transaction process:* How often does a customer buy while active? (Negative Binomial)
- *Dropout process:* After each purchase, what is the probability they leave forever? (Beta-Geometric)

**Gamma-Gamma Model** — models average order value:
- Each customer has a personal average spend
- Spend is assumed independent of purchase frequency (verified via correlation check)

**Output per customer:**
```
prob_alive              → probability still an active customer (0-1)
predicted_purchases_90d → expected orders in next 90 days
clv_12months            → predicted revenue over next 12 months
clv_segment             → Low / Medium / High / Premium CLV
```

**CLV Segments (UCI Dataset):**

| Segment | Average CLV (12 months) |
|---|---|
| Premium CLV | £8,800 |
| High CLV | £2,100 |
| Medium CLV | £1,100 |
| Low CLV | £500 |

---

### Layer 4 — Anomaly Detection

**Approach:** Autoencoder reconstruction error as anomaly score.

```
Normal customer   → autoencoder reconstructs well → LOW error  → normal
Abnormal customer → autoencoder struggles          → HIGH error → anomaly
```

**Architecture:**
```
Input(8) → Linear(16) → ReLU → Linear(8) → ReLU → Latent(2)
Latent(2) → Linear(8) → ReLU → Linear(16) → ReLU → Output(8)
```

**Anomaly Types Detected:**

| Type | Description | Count (UCI) |
|---|---|---|
| Erratic Behavior | Unpredictable purchase patterns | 125 |
| Bulk Buyer / Reseller | Orders 10-100x normal quantities | 85 |
| Ghost Customer | Registered but barely active | 7 |
| Return Abuser | Buy and return everything | 2 |

**Thresholds:**
- 95th percentile reconstruction error → Suspicious
- 99th percentile reconstruction error → High Risk

**Statistical fallback:** If autoencoder model is unavailable, Z-score based detection runs automatically.

---

### Layer 5 — LLM Insight Generation

Uses **Qwen3** via **Groq API** (free tier, ~0.5 second response time).

**Four insight types generated:**

```
1. Executive Summary
   → 3 paragraph business narrative
   → Key findings, opportunities, urgent risks

2. Segment Recommendations
   → Per segment: description, action, campaign idea, priority
   → JSON format, parsed and stored in database

3. Anomaly Report
   → Business-language explanation of each anomaly type
   → Risk assessment and recommended actions

4. Priority Alerts (rule-based, no LLM)
   → Always reliable, computed directly from data
   → Example: "449 At-Risk customers — £682,000 CLV at risk"
```

**Why rule-based alerts don't use LLM:**
Alerts are the most critical output — clients act on them immediately. Rule-based computation ensures accuracy and eliminates hallucination risk.

**Natural Language Q&A:**
```
Client: "Which customers should I target for Black Friday?"
Engine: [builds context from database] → [sends to Qwen3] → answer in 0.5s
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                     ← FastAPI app, CORS, router registration
│   ├── core/
│   │   └── config.py               ← pydantic-settings, environment variables
│   ├── db/
│   │   ├── session.py              ← SQLAlchemy engine, SessionLocal, get_db
│   │   └── models.py               ← Job, CustomerProfile, Insight tables
│   ├── pipeline/
│   │   ├── schema_detection.py     ← 3-tier column detection (exact/fuzzy/LLM)
│   │   ├── rfm_extraction.py       ← transaction → 8 RFM features per customer
│   │   ├── segmentation.py         ← quantile scoring → 10 named segments
│   │   ├── prediction.py           ← HVR model inference
│   │   ├── clv.py                  ← BG/NBD + Gamma-Gamma CLV
│   │   ├── anomaly.py              ← autoencoder reconstruction error
│   │   └── insights.py             ← LLM insight generation via Groq
│   ├── routers/
│   │   ├── upload.py               ← POST /api/upload
│   │   ├── results.py              ← GET /api/results/* endpoints
│   │   └── query.py                ← POST /api/results/{id}/query
│   └── services/
│       └── ml_service.py           ← pipeline orchestrator, background task
├── models/                         ← saved ML model files
│   ├── best_autoencoder.pt
│   ├── hvr_model.pkl
│   ├── hvr_scaler.pkl
│   └── hvr_features.pkl
├── uploads/                        ← temporary CSV storage
├── Dockerfile                      ← HuggingFace Spaces deployment
├── requirements.txt
└── .env.example
```

---

## API Reference

### Upload

```http
POST /api/upload
Content-Type: multipart/form-data

file: <CSV file>
```

Response:
```json
{
  "job_id": "uuid",
  "status": "processing",
  "message": "Dataset uploaded successfully. Pipeline is running."
}
```

---

### Status

```http
GET /api/results/{job_id}/status
```

Response:
```json
{
  "job_id": "uuid",
  "status": "complete",
  "filename": "transactions.csv",
  "row_count": 541909,
  "customer_count": 4373,
  "created_at": "2024-01-01T00:00:00",
  "completed_at": "2024-01-01T00:01:30"
}
```

---

### Overview

```http
GET /api/results/{job_id}/overview
```

Response:
```json
{
  "total_customers": 4373,
  "total_revenue": 9747747.93,
  "avg_clv_12months": 1842.50,
  "total_anomalies": 219,
  "segment_distribution": {
    "Champion": 972,
    "Lost Customer": 809,
    "Needs Attention": 650
  }
}
```

---

### Plots

```http
GET /api/results/{job_id}/plots
```

Returns all chart data ready for Recharts:
```json
{
  "segment_distribution": [{"segment": "Champion", "count": 972}],
  "clv_distribution": [{"range": "0-500", "count": 1200}],
  "clv_by_segment": [{"segment": "Premium CLV", "avg_clv": 8800}],
  "rfm_scatter": [{"recency": 12, "frequency": 13, "monetary": 5804, "segment": "Champion"}],
  "anomaly_breakdown": [{"type": "Erratic Behavior", "count": 125}],
  "monetary_distribution": [],
  "frequency_distribution": [],
  "hvr_potential": [],
  "prob_alive_distribution": []
}
```

---

### Customers

```http
GET /api/results/{job_id}/customers?segment=Champion&is_anomaly=false&limit=100&offset=0
```

---

### Insights

```http
GET /api/results/{job_id}/insights
```

---

### Top Customers

```http
GET /api/results/{job_id}/top-customers?n=10
```

---

### Natural Language Query

```http
POST /api/results/{job_id}/query
Content-Type: application/json

{
  "question": "Which customers should I target for Black Friday?"
}
```

Response:
```json
{
  "question": "Which customers should I target for Black Friday?",
  "answer": "Based on your data, I recommend prioritizing your 972 Champion customers first..."
}
```

---

## Database Schema

### jobs
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| status | String | processing / complete / failed |
| filename | String | Original CSV filename |
| row_count | Integer | Total transaction rows |
| customer_count | Integer | Unique customers found |
| error_message | String | Error detail if failed |
| created_at | DateTime | Upload timestamp |
| completed_at | DateTime | Pipeline completion time |

### customer_profiles
| Column | Type | Description |
|---|---|---|
| job_id | UUID | Foreign key to jobs |
| customer_id | String | Original customer identifier |
| recency | Float | Days since last purchase |
| frequency | Float | Number of unique orders |
| monetary | Float | Total spend |
| avg_order_value | Float | Average spend per order |
| total_items | Float | Total quantity purchased |
| distinct_products | Float | Product variety |
| tenure_days | Float | Active customer duration |
| avg_items_per_order | Float | Average basket size |
| r_score | Integer | Recency score 1-5 |
| f_score | Integer | Frequency score 1-5 |
| m_score | Integer | Monetary score 1-5 |
| segment | String | Named customer segment |
| clv_12months | Float | Predicted 12-month CLV |
| clv_segment | String | CLV tier |
| prob_alive | Float | Probability still active |
| predicted_purchases_90d | Float | Expected orders next 90 days |
| hvr_probability | Float | High value repeat probability |
| hvr_potential | String | Low / Medium / High Potential |
| anomaly_score | Float | Reconstruction error |
| is_anomaly | Boolean | Anomaly flag |
| anomaly_severity | String | Normal / Suspicious / High Risk |
| anomaly_type | String | Anomaly classification |

### insights
| Column | Type | Description |
|---|---|---|
| job_id | UUID | Foreign key to jobs |
| category | String | Insight type |
| title | String | Short heading |
| body | String | Full content or JSON |
| priority | Integer | 1=critical, 2=high, 3=medium |

---

## Local Development

### Prerequisites

```
Python 3.11+
PostgreSQL 14+
Git
```

### Setup

```bash
# Clone repository
git clone https://huggingface.co/spaces/your-username/Mindless_Systems
cd Mindless_Systems

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install PyTorch CPU version
pip install torch==2.4.1+cpu --index-url https://download.pytorch.org/whl/cpu
```

### Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
DATABASE_URL=postgresql://user:password@localhost:5432/customer_intel
GROQ_API_KEY=your_groq_api_key
UPLOAD_DIR=uploads
MODEL_DIR=models
```

### Create Database Tables

```python
python -c "
from app.db.session import engine
from app.db.models import Base
Base.metadata.create_all(bind=engine)
print('Tables created')
"
```

### Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Swagger docs at: `http://localhost:8000/docs`

---

## Deployment

### Backend — HuggingFace Spaces

1. Create a new Space at huggingface.co/spaces
2. Select Docker SDK
3. Clone the Space repo locally
4. Copy backend code into the cloned folder
5. Ensure `Dockerfile` is at the root
6. Add secrets in Space Settings:
   ```
   DATABASE_URL
   GROQ_API_KEY
   UPLOAD_DIR=uploads
   MODEL_DIR=models
   ```
7. Push to trigger deployment:
   ```bash
   git add .
   git commit -m "deploy"
   git push
   ```

**Important:** HuggingFace Spaces uses port `7860`. Ensure Dockerfile exposes this port:
```dockerfile
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Database — Supabase

1. Create project at supabase.com
2. Go to Settings → Database → Connection string
3. Copy the URI format connection string
4. Set as `DATABASE_URL` secret in HF Spaces

**SSL configuration required for Supabase:**
```python
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True
)
```

### Frontend — Vercel

1. Push React code to GitHub
2. Import repo at vercel.com
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=ADD_YOUR_HF_URL_HERE
   ```
4. Deploy

---

## Dataset

This project was developed and tested using the **UCI Online Retail Dataset**:

| Property | Value |
|---|---|
| Source | UCI Machine Learning Repository |
| Records | 541,909 transactions |
| Customers | 4,373 unique |
| Date Range | Dec 2010 — Dec 2011 |
| Geography | Primarily United Kingdom |
| Features | InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country |

**Dataset characteristics handled:**
- Negative quantities (returns/cancellations) — filtered out
- Missing CustomerIDs — removed
- Zero-monetary customers — flagged as suspicious
- Extreme outliers (bulk buyers spending £250,000+) — detected as anomalies

The system is designed to work on **any** transactional dataset with equivalent columns, not just this specific dataset.

---

## Results & Evaluation

### Segmentation (UCI Dataset)

| Segment | Count | Avg Recency | Avg Frequency | Avg Monetary |
|---|---|---|---|---|
| Champion | 972 | 12 days | 13 orders | £5,804 |
| Lost Customer | 809 | 228 days | 1 order | £203 |
| Needs Attention | 650 | 142 days | 2 orders | £537 |
| Loyal Customer | 481 | 37 days | 6 orders | £1,706 |
| At Risk | 449 | 137 days | 4 orders | £1,519 |
| Potential Loyalist | 447 | 30 days | 2 orders | £1,052 |
| About to Sleep | 286 | 52 days | 1 order | £329 |
| New Customer | 241 | 18 days | 1 order | £237 |
| Promising | 22 | 16 days | 1 order | £828 |
| Anomalous | 15 | — | — | £0 |

### HVR Prediction

| Metric | Value |
|---|---|
| ROC-AUC | 0.71 |
| Validation Method | Temporal split |
| Train Period | Dec 2010 — Aug 2011 |
| Test Period | Sep 2011 — Dec 2011 |
| Industry Benchmark | 0.70 — 0.80 |

### Anomaly Detection

| Metric | Value |
|---|---|
| Customers Flagged | 219 (5%) |
| Min Anomaly Score | 0.0003 |
| Max Anomaly Score | 19.41 |
| Median Anomaly Score | 0.021 |

### CLV Segments

| Segment | Average 12-Month CLV |
|---|---|
| Premium CLV | £8,800 |
| High CLV | £2,100 |
| Medium CLV | £1,100 |
| Low CLV | £500 |

---

## Known Limitations

**Data Requirements:**
- Minimum ~100 customers for meaningful segmentation
- BG/NBD requires repeat purchasers — one-time buyers excluded from CLV modeling
- HVR model requires sufficient date range for temporal split

**Model Assumptions:**
- BG/NBD assumes constant purchase rate per customer (ignores seasonality)
- Gamma-Gamma assumes spend is independent of frequency
- Autoencoder trained on UCI dataset — may need retraining for very different business types

**Infrastructure:**
- HuggingFace Spaces resets filesystem on restart — model files must be committed to repo
- Free tier Groq API has rate limits (14,400 requests/day)
- Pipeline runs synchronously — large datasets (1M+ rows) may be slow

**LLM:**
- Qwen3 insights may occasionally hallucinate — rule-based alerts are always used for critical business decisions
- Groq API requires internet connectivity — no offline fallback for insight generation

---

## Future Work

- **Client-specific model retraining** — retrain autoencoder and HVR model on each client's data for better accuracy
- **Confidence intervals on CLV** — Monte Carlo simulation to provide CLV ranges rather than point estimates
- **Segment drift detection** — compare two analysis runs to identify customers moving between segments
- **SHAP explanations** — explain why each customer received their HVR score
- **Celery + Redis task queue** — replace BackgroundTasks for production-grade async processing
- **Real-time pipeline** — stream live transaction data rather than batch CSV uploads
- **A/B testing framework** — track campaign effectiveness per segment recommendation
- **Ensemble anomaly detection** — combine autoencoder with Isolation Forest for higher confidence flags
- **Multi-language support** — LLM insights in languages other than English

---

## Team

**Mindless Systems**

| Role | Responsibility |
|---|---|
| ML Engineer | Autoencoder, BG/NBD, HVR model, anomaly detection |
| Backend Engineer | FastAPI, pipeline orchestration, database design |
| Frontend Engineer | React dashboard, Recharts visualizations |

---

## Methodology

This project follows the **CRISP-DM** (Cross-Industry Standard Process for Data Mining) methodology:

| Phase | Implementation |
|---|---|
| Business Understanding | Customer segmentation, CLV prediction, anomaly detection |
| Data Understanding | UCI Online Retail dataset analysis, feature exploration |
| Data Preparation | RFM extraction, normalization, temporal splitting |
| Modeling | Autoencoder, GradientBoosting, BG/NBD + Gamma-Gamma |
| Evaluation | Temporal AUC validation, reconstruction error analysis |
| Deployment | HuggingFace Spaces + Supabase + Vercel |

---

## License

This project is developed as a final year academic project.

---

*Built by Mindless Systems*
