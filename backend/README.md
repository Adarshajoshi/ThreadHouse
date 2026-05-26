# ThreadHouse — Backend

A FastAPI application that powers both halves of the project: the **shop** (auth, products, orders, analytics) and the **customer-intelligence engine** (CSV upload → RFM / CLV / anomaly / insights ML pipeline). Both halves talk to the same Postgres database; the shop half uses raw `asyncpg`, the intel half uses SQLAlchemy 2.

---

## Quick start

### 1. Prerequisites

- **Python 3.11+** (3.10 also works)
- **Postgres 14+** running locally
- **Git** (for cloning)

### 2. Create the database

Open `psql` or pgAdmin and create an empty database called `mindless`:

```sql
CREATE DATABASE mindless;
```

You don't need to create any tables — the app auto-creates them on first boot.

### 3. Set up the Python environment

From inside the `backend/` folder:

```bash
# Create a virtual environment (recommended)
python -m venv .venv

# Activate it
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (cmd):
.venv\Scripts\activate.bat
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

`torch` is the largest dependency (~700 MB on Windows). If your network is slow, run `pip install torch --index-url https://download.pytorch.org/whl/cpu` first to grab the smaller CPU-only build, then `pip install -r requirements.txt`.

### 4. Configure `.env`

Copy the template (or just create `.env` directly) inside `backend/`:

```
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=mindless
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/mindless

# JWT secrets must be >= 32 chars. Generate with:
# python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET=PUT_A_LONG_RANDOM_STRING_HERE
SECRET_KEY=PUT_A_LONG_RANDOM_STRING_HERE

UPLOAD_DIR=uploads
MODEL_DIR=app/ML/artifacts
PRODUCTS_JSON=products.json

# Optional — only needed for /api/results/{id}/query and LLM-narrated insights.
GROQ_API_KEY=
```

The app refuses to boot if `JWT_SECRET` is shorter than 32 characters.

### 5. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

You should see:

```
SQLAlchemy tables ready: jobs, customer_profiles, insights.
asyncpg pool ready: users, orders, analytics_events, products tables verified.
INFO:     Application startup complete.
```

Test it:

- API root: <http://localhost:8000>
- Health check: <http://localhost:8000/health>
- Interactive API docs: <http://localhost:8000/docs>

### 6. Create an admin user

```bash
python scripts/create_admin.py --email you@example.com --password StrongPass1
```

Use a public-TLD email — pydantic's email-validator rejects `.local` / `.test`.

You can now log into the admin panel with these credentials.

---

## How it works (architecture)

```
┌─────────────┐   POST /api/analytics/event       ┌────────────────────┐
│ Shop SPA    │ ────────────────────────────────► │                    │
│ (React)     │   POST /api/orders/               │   FastAPI          │
└─────────────┘ ────────────────────────────────► │   (this folder)    │
                                                  │                    │
┌─────────────┐   POST /api/order/list            │                    │
│ Admin SPA   │ ────────────────────────────────► │  asyncpg pool ────┐│
│ (React)     │   WS  /api/analytics/ws ◄────────►│  SQLAlchemy ────┐ ││
└─────────────┘                                   └──────────────┬──┴─┘
                                                                 │  │
                                                          ┌──────▼──▼──┐
                                                          │ Postgres   │
                                                          │ (mindless) │
                                                          └────────────┘
```

### Two database drivers, one database

- **`asyncpg` pool** — for the shop half (auth, products, orders, analytics, audit log). Async, fast, hand-written SQL. Tables: `users`, `orders`, `analytics_events`, `products`, `audit_log`.
- **SQLAlchemy 2** — for the intel half (the CSV → ML pipeline). Synchronous, ORM-driven. Tables: `jobs`, `customer_profiles`, `insights`.

Both are bootstrapped in `app/main.py`'s `lifespan` handler on startup. The shop tables are created/migrated via idempotent `CREATE TABLE … IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, so re-running on a populated DB is safe.

### The ML pipeline

```
CSV upload ──► schema_detection ──► rfm_extraction ──► segmentation
                                                            │
                                  ┌─────────────────────────┤
                                  ▼                         ▼
                            HVR prediction              CLV (BG/NBD + Gamma-Gamma)
                                  │                         │
                                  └────────────┬────────────┘
                                               ▼
                                       anomaly detection
                                       (PyTorch autoencoder)
                                               │
                                               ▼
                                       insights (LLM)
                                               │
                                               ▼
                                   write CustomerProfile + Insight
                                          mark Job complete
```

Each stage lives in `app/pipeline/`. The orchestrator is `app/services/ml_services.py::run_full_pipeline`, kicked off as a FastAPI `BackgroundTask` by either `POST /api/upload` (CSV) or `POST /api/intel/run-on-current-users` (live orders).

### Real-time analytics (WebSocket)

`app/live_tracking.py` is an in-process pub/sub built on `asyncio.Queue`. Every `POST /api/analytics/event` insert is followed by `publish()` which fans the event to every subscribed queue. The `/api/analytics/ws` WebSocket endpoint holds one queue per connected admin and forwards events as JSON.

⚠️ **Single-process only.** If you run multiple uvicorn workers, an event posted on worker A won't reach a WebSocket on worker B. For production, swap the queue for Redis pub/sub or NATS.

---

## File map

```
backend/
├── .env                   # secrets (NOT committed)
├── requirements.txt
├── app/
│   ├── main.py            # FastAPI app, router wiring, lifespan
│   ├── auth_deps.py       # JWT dependencies (user / admin)
│   ├── audit.py           # audit_log helper
│   ├── live_tracking.py   # WebSocket pub/sub
│   ├── core/config.py     # pydantic-settings Settings
│   ├── db/
│   │   ├── session.py     # SQLAlchemy engine + SessionLocal
│   │   ├── models.py      # ORM: Job, CustomerProfile, Insight
│   │   └── asyncpg_pool.py# pool + DDL for shop tables
│   ├── routers/
│   │   ├── auth.py        # /api/auth/{signup,login,admin/login,me,profile,logout}
│   │   ├── orders.py      # /api/orders/ + /me
│   │   ├── admin_orders.py# /api/order/{list,status}  (admin UI alias)
│   │   ├── analytics.py   # /api/analytics/{event,summary,segments,live,customer/{id},ws}
│   │   ├── products.py    # /api/product/{list,add,remove,{id},seed}
│   │   ├── upload.py      # POST /api/upload   (CSV → pipeline)
│   │   ├── intel_live.py  # POST /api/intel/run-on-current-users
│   │   ├── results.py     # GET  /api/results/{id}/{status,overview,customers,insights,top-customers}
│   │   ├── query.py       # POST /api/results/{id}/query   (NL Q&A)
│   │   └── admin.py       # POST /api/admin/train (retrain HVR model)
│   ├── schemas/
│   │   ├── shop.py        # AnalyticsEvent, SignUpRequest, LoginRequest, AuthResponse, …
│   │   └── customers.py   # QueryRequest, QueryResponse
│   ├── services/ml_services.py   # run_full_pipeline orchestrator
│   ├── pipeline/
│   │   ├── schema_detection.py
│   │   ├── rfm_extraction.py
│   │   ├── segmentation.py
│   │   ├── clv.py
│   │   ├── prediction.py
│   │   ├── anomaly.py
│   │   └── insights.py
│   └── ML/artifacts/      # hvr_model.pkl + hvr_scaler.pkl + hvr_features.pkl
├── scripts/
│   └── create_admin.py    # CLI to create/promote an admin user
├── static/images/         # uploaded product images (served at /static/images/...)
└── uploads/               # uploaded CSVs (gitignored)
```

---

## API reference

Open <http://localhost:8000/docs> for interactive Swagger UI. Quick summary:

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/api/auth/signup` | Register; returns JWT |
| POST | `/api/auth/login` | Login; returns JWT |
| POST | `/api/auth/admin/login` | Admin login; returns JWT (role-checked) |
| POST | `/api/user/admin` | Legacy alias for the admin UI |
| POST | `/api/analytics/event` | Ingest one analytics event (no auth — best-effort) |
| POST | `/api/orders/` | Place an order (optional auth — guests allowed) |
| GET | `/api/product/list` | Public catalogue |
| GET | `/api/product/{id}` | One product |
| POST | `/api/product/seed` | Dev importer from `products.json` |

### Authenticated user

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Current user from JWT |
| PATCH | `/api/auth/profile` | Update name / password |
| POST | `/api/auth/logout` | Symbolic (JWT is stateless) |
| GET | `/api/orders/me` | List my orders newest-first |

### Admin only

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/product/add` | Multipart with up to 4 images |
| PATCH | `/api/product/{id}` | Edit product |
| POST | `/api/product/remove` | Delete product |
| POST | `/api/order/list` | List every order in admin shape |
| POST | `/api/order/status` | Update order status + audit |
| GET | `/api/analytics/summary` | Aggregations (totals, top pages, funnel, …) |
| GET | `/api/analytics/segments` | Live RFM segmentation over `orders` |
| GET | `/api/analytics/live?minutes=5` | Last-N-minutes snapshot |
| GET | `/api/analytics/customer/{user_id}` | Per-user drilldown |
| WS  | `/api/analytics/ws?token=<JWT>` | Real-time event stream |
| POST | `/api/upload` | CSV upload → pipeline |
| POST | `/api/intel/run-on-current-users` | Build CSV from live orders → pipeline |
| GET | `/api/results/{job_id}/status` | Poll job status |
| GET | `/api/results/{job_id}/overview` | KPIs + segment distribution |
| GET | `/api/results/{job_id}/customers` | Filterable customer table |
| GET | `/api/results/{job_id}/insights` | LLM insight cards |
| GET | `/api/results/{job_id}/top-customers` | Top N by 12-month CLV |
| POST | `/api/results/{job_id}/query` | Natural-language Q&A (Groq) |
| POST | `/api/admin/train` | Retrain HVR model from `models/train_data.csv` |

### Auth header conventions

Most endpoints accept **either**:

```
Authorization: Bearer <JWT>
```

**or** (for the legacy admin UI):

```
token: <JWT>
```

`app/auth_deps.py::_strip_bearer` handles both.

---

## Database schema

The first time you start the server it creates these tables.

**Shop side (asyncpg, hand-written SQL):**

```
users(id, name, email UNIQUE, password_hash, role, created_at)
orders(order_id UNIQUE, user_id FK, items JSONB, delivery_info JSONB,
       payment_method, status, total, created_at)
products(name, description, price, image JSONB, category, sub_category,
         sizes JSONB, bestseller, date, stock, created_at)
analytics_events(session_id, user_id, event_type, page, element, value,
                 monetary_value, timestamp, created_at)
audit_log(actor_id, actor_email, action, target, detail JSONB, created_at)
```

**Intel side (SQLAlchemy ORM):**

```
jobs(id UUID PK, status, filename, row_count, customer_count,
     error_message, created_at, completed_at)
customer_profiles(id UUID, job_id FK, customer_id,
                  recency, frequency, monetary, avg_order_value,
                  total_items, distinct_products, tenure_days,
                  avg_items_per_order,
                  r_score, f_score, m_score, segment,
                  clv_12months, clv_segment, prob_alive, predicted_purchases_90d,
                  hvr_probability, hvr_potential,
                  anomaly_score, is_anomaly, anomaly_severity, anomaly_type)
insights(id UUID, job_id FK, category, title, body, priority)
```

---

## How the ML pipeline works

The pipeline accepts any reasonably-named transactions CSV (`customer_id`, `date`, `amount`, `quantity`, `invoice_id` — exact names auto-detected by fuzzy matching).

1. **`schema_detection.py`** — `detect_schema(df)` matches your CSV's columns against the canonical names using `rapidfuzz`. Falls back to an LLM call if confidence is low.
2. **`rfm_extraction.py`** — groups by `CustomerID`, computes Recency, Frequency, Monetary plus `AvgOrderValue / TotalItems / DistinctProducts / TenureDays / AvgItemsPerOrder`.
3. **`segmentation.py`** — quintile-scores R, F, M into 1–5 with the small-sample-safe `_safe_score`. Maps `(r, f, m)` onto 11 named segments.
4. **`prediction.py`** — loads `hvr_model.pkl` and adds `hvr_probability` + `hvr_potential` (High/Med/Low). Silent no-op if the model file isn't there.
5. **`clv.py`** — BG/NBD + Gamma-Gamma from `lifetimes`. Predicts 12-month value, `prob_alive`, `predicted_purchases_90d`.
6. **`anomaly.py`** — small PyTorch autoencoder (8→16→8→2→8→16→8). Reconstruction MSE → anomaly score. Top quantile flagged. Type assigned rule-based (Whale / Dormant / Bot-like …).
7. **`insights.py`** — Groq (qwen3-32b) generates Executive Summary, Anomaly Report, Segment Spotlight. Skipped entirely if `GROQ_API_KEY` is empty.

The orchestrator (`services/ml_services.py`) writes one `CustomerProfile` row per customer and one `Insight` row per card, then marks the job `complete`.

### Retraining the HVR model

If you have a transactions CSV at `app/ML/artifacts/train_data.csv`, you can retrain:

```
POST /api/admin/train
```

The handler does a temporal split (first 8 months → features, remainder → label = high future spend AND ≥2 future orders), engineers extra features (`monetary_per_day`, `orders_per_day`, `avg_gap`, `spend_diversity`, `basket_value`), clips outliers at the 99.9th percentile, fits a `GradientBoostingClassifier` (200 estimators, depth 3, LR 0.05, positives weighted 2×), and saves `hvr_model.pkl + hvr_scaler.pkl + hvr_features.pkl`. Test AUC is returned in the response.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `RuntimeError: JWT_SECRET must be set to a secure value` on boot | Set `JWT_SECRET` in `.env` to a string ≥32 chars |
| `asyncpg.InvalidPasswordError` | `DB_PASSWORD` in `.env` doesn't match your Postgres install |
| `Connection refused on localhost:5432` | Postgres isn't running |
| `ModuleNotFoundError: No module named 'torch'` | `pip install -r requirements.txt` (torch is the big one) |
| `/api/intel/run-on-current-users` returns *No orders with linked user_id* | Place at least one order while logged in |
| `/api/results/{id}/query` returns 503 | `GROQ_API_KEY` not set in `.env` |
| CORS error in browser | Make sure you're hitting localhost / 127.0.0.1 — regex allows any port |
| WebSocket closes immediately with code 4401 | Token missing/invalid in the query string |
| WebSocket closes with code 4403 | User isn't an admin — run `scripts/create_admin.py --email …` |

---

## Notes for collaborators

- **Don't commit `.env`** — it's gitignored on purpose. Share secrets out of band.
- The `static/images/` and `uploads/` folders are created on first run. The latter is gitignored; the former contains product images uploaded via the admin panel.
- The OpenAPI schema at `/openapi.json` is the source of truth. Generate client SDKs from it if you build new frontends.
- If you're seeing a Pydantic validation error on a JSON request, check that field names match `schemas/shop.py`. The frontend sometimes sends `subCategory` but the backend uses `sub_category` in some places — `routers/products.py` normalises this for the admin form.

---

## Stack

- Python 3.11, FastAPI, Uvicorn, Pydantic v2
- SQLAlchemy 2 + asyncpg (dual-driver Postgres)
- bcrypt, PyJWT, email-validator
- scikit-learn, PyTorch (CPU), `lifetimes`, shap, rapidfuzz, joblib
- Groq SDK (`qwen/qwen3-32b`)
- python-dotenv, python-decouple, pydantic-settings
