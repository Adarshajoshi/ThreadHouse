# ThreadHouse — E-commerce + Customer Intelligence

A full-stack e-commerce site that tracks user behaviour and segments
customers in real time. Two ideas glued together: a working shop, and an
admin panel that can actually do something interesting with the data the
shop produces.

```
shop frontend ─┐
admin panel ───┼──→ FastAPI backend ──→ Postgres
               │                ↘
               └──── live events ──→ in-memory pub/sub ──→ admin dashboard
```

## What it does

**Shop side** — browse products, add to cart, wishlist, place orders
(Cash on Delivery). Every page view, click,
search, add-to-cart, checkout-start, and purchase is tagged with the
user's id and recorded as an analytics event with monetary value.

**Admin side** — full product CRUD with image upload, order management
with status updates, a
Live Tracking page that shows events streaming in over WebSocket as they
happen, and an Intel page that runs an ML pipeline over either an
uploaded CSV or the live shop data:

- **RFM** scoring (Recency / Frequency / Monetary, 1–5 quintiles)
- **Segmentation** into 11 named segments (Champions, At Risk, Loyal, …)
- **CLV** prediction over 12 months using BG/NBD + Gamma-Gamma
- **HVR** (High-Value Repeater) probability via a pre-trained Gradient
  Boosting Classifier
- **Anomaly detection** via a PyTorch autoencoder reconstruction error
- **LLM-narrated insights** (Groq + qwen3-32b) that summarise findings
  in plain English

There's also a natural-language "Ask the data" box that takes a question
like "which segments drive most revenue?" and answers it from the
analysed dataset.

## Architecture

```
ecommerce/
├── frontend/        Shop SPA (Vite + React + Tailwind v4)
├── admin/           Admin SPA (Vite + React + Tailwind v4)
└── backend/
    └── app/
        ├── main.py              FastAPI — both intel and shop routers
        ├── db/
        │   ├── session.py       SQLAlchemy (intel tables)
        │   ├── models.py        jobs, customer_profiles, insights
        │   └── asyncpg_pool.py  asyncpg pool (shop tables, audit log)
        ├── routers/             auth, orders, analytics, products,
        │                        admin_orders, intel_live, upload,
        │                        results, query, admin
        ├── pipeline/            rfm_extraction, segmentation, clv,
        │                        prediction, anomaly, insights,
        │                        schema_detection
        ├── services/            ml_services.run_full_pipeline orchestrator
        ├── live_tracking.py     In-memory pub/sub for the WebSocket stream
        ├── audit.py             Audit-log helper
        └── auth_deps.py         JWT dependencies
```

### Two database drivers, one DB

The intel half (uploaded CSV → ML pipeline → results tables) is on
SQLAlchemy. The shop half (auth / orders / analytics events) is on raw
asyncpg. Both share the same Postgres database; the lifespan handler
runs SQLAlchemy `Base.metadata.create_all` for the intel tables and an
asyncpg pool with idempotent `ALTER TABLE … IF NOT EXISTS` migrations
for the shop tables.

## Running it locally

### Prerequisites

- **Postgres** running with a database called `mindless`
- **Python 3.11+** (Anaconda works)
- **Node 18+**

### 1. Backend

```
cd backend
cp .env.example .env
```

Edit `.env`:
- Set `DB_PASSWORD` and the password inside `DATABASE_URL` to your real
  Postgres password
- Generate `JWT_SECRET` and `SECRET_KEY` with
  `python -c "import secrets; print(secrets.token_urlsafe(48))"` (≥32 chars each)
- (optional) `GROQ_API_KEY` for the LLM features

```
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You should see:

```
SQLAlchemy tables ready: jobs, customer_profiles, insights.
asyncpg pool ready: users, orders, analytics_events, products tables verified.
```

### 2. Create an admin user

```
python scripts/create_admin.py --email you@example.com --password StrongPass1
```

Use a public-TLD email — pydantic-email-validator rejects `.local` /
`.test`.

### 3. Shop frontend

```
cd ../frontend
npm install
npm run dev    # http://localhost:5173
```

### 4. Admin panel

```
cd ../admin
npm install
npm run dev    # http://localhost:5174
```

Log in with the admin credentials from step 2.

## Demo flow

1. Sign up as a regular user in the shop, browse, wishlist a couple of
   products, add to cart, check out.
2. Admin → **Live Tracking**: every click and page view in the shop
   appears in the feed in real time.
3. Admin → **Intel (ML)** → "Analyze current users". The live orders
   are exported to a CSV and the full ML pipeline runs on them. KPIs,
   segment distribution, top customers, insights and a NL-query box
   populate when complete.
4. Admin → **Orders**: flip status to "Shipped" — audit log records the change.

## API surface

```
Public
  POST  /api/auth/{login, signup, admin/login}
  POST  /api/user/admin                  (admin login alias for the legacy admin UI)
  POST  /api/analytics/event             (event ingestion)
  POST  /api/orders/                     (places an order; user_id from JWT if present)
  GET   /api/product/list, /{id}
  POST  /api/product/seed                (one-shot dev importer)
  GET   /health

Authenticated user
  GET   /api/auth/me
  PATCH /api/auth/profile
  POST  /api/auth/logout
  GET   /api/orders/me

Admin only
  POST  /api/upload                      (CSV → ML pipeline)
  GET   /api/results/{job_id}/{status, overview, customers, insights, top-customers}
  POST  /api/results/{job_id}/query      (NL Q&A)
  POST  /api/admin/train                 (HVR model retrain)
  POST  /api/intel/run-on-current-users  (analyse live shop data)
  GET   /api/analytics/{summary, segments, live, customer/{id}}
  WS    /api/analytics/ws                (live event stream)
  POST  /api/product/add, /remove
  PATCH /api/product/{id}
  POST  /api/order/list, /status
```

`/docs` (Swagger UI) shows them all interactively.

## Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2 + asyncpg, Pydantic v2,
  bcrypt, PyJWT
- **ML:** scikit-learn, PyTorch, `lifetimes` (BG/NBD + Gamma-Gamma),
  shap, rapidfuzz
- **LLM:** Groq (qwen/qwen3-32b)
- **Frontend:** React 19, Vite 5, Tailwind v4, axios, react-toastify,
  react-router 7
- **DB:** Postgres 14+

## Acknowledgements

This project stands on a few shoulders, and credit is due:

- **Shop UI scaffolding** adapted from the public *GreatStack* MERN
  e-commerce tutorial (route layout, ShopContext pattern, asset
  structure). Heavily extended: dual-app integration, live-tracking
  page, wishlist as an RFM signal, ambient palette.
- **Customer Intelligence Engine** (`app/pipeline/`,
  `app/services/ml_services.py`) is based on the private *ThreadHouse*
  Customer Intelligence repo (RFM extraction, BG/NBD CLV, autoencoder
  anomaly detector, schema detection). Adapted to live-data ingestion
  via the `intel_live` router and made small-sample-safe so it works
  with any number of customers.
- **`lifetimes`** (Cameron Davidson-Pilon) for the BG/NBD and Gamma-Gamma
  implementations.
- **GreatStack admin panel** for the Add / List / Orders page
  scaffolding (now substantially rewritten).

What's original to this repo:

- The merge of the two backends (dual-driver Postgres, single lifespan)
- Live-tracking module (in-memory pub/sub + WebSocket stream)
- "Analyze current users" path that synthesises a CSV from the live
  orders table at request time
- RFM-aware analytics events (`useAnalytics.js` helpers + `Trackable`
  component) that capture monetary value and user identity
- The wishlist as an explicit RFM signal
- Live-segmentation endpoint that runs RFM directly on the orders table
  with no CSV upload
- Customer detail drawer in admin Live Tracking
- Admin Intel page (full ML pipeline UI, NL query, HVR retrain trigger)
- Stock decrement, audit log, status-change flow
- Image-validated product upload + edit modal

## Status

This is a working portfolio / coursework project. It is **not**
production-ready — specifically it has no real payment processing
(Cash on Delivery only), no session revocation beyond JWT expiry, no
rate limiting, secrets are loaded from `.env` rather than a vault, and
it uses the development `uvicorn --reload` server. The architecture
supports moving any of those forward; nothing here forecloses
production deployment.

## License

MIT for the original code in this repository. Borrowed scaffolding
remains under the licenses of its respective sources (see
Acknowledgements).
