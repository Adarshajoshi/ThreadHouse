# What changed + how to run this locally

This document has two parts:

1. **Changelog** — every meaningful change made on top of the two source
   projects (the GreatStack MERN shop + the private ThreadHouse intel
   repo).
2. **Setup for a teammate** — exact step-by-step for someone cloning
   this repo onto a fresh Windows / macOS / Linux machine.

---

## Part 1 — Changelog

### Backend (FastAPI)

**Architecture**

- Merged two previously-separate backends (the GreatStack shop API and the
  ThreadHouse intelligence pipeline) into a single FastAPI app sharing one
  Postgres database.
- Dual-driver DB setup: SQLAlchemy 2 for the intel tables
  (`jobs / customer_profiles / insights`) and raw asyncpg for the shop
  tables (`users / orders / analytics_events / products / audit_log`).
- Single `lifespan` handler boots both: SQLAlchemy `create_all` for intel,
  asyncpg pool + idempotent `ALTER TABLE … IF NOT EXISTS` migrations for
  shop. New columns added safely on every restart.

**New routers and endpoints**

- `app/routers/auth.py` — JWT-based signup / login / admin-login; added
  `/me`, `PATCH /profile`, `POST /logout`; legacy `/api/user/admin` alias
  for the admin frontend's expected URL.
- `app/routers/orders.py` — `POST /` places an order, auto-attaches
  `user_id` from JWT, decrements product stock per line item.
- `app/routers/products.py` — full CRUD (`/list /add /remove /{id} /seed`),
  image-upload validation (max 5 MB, JPG/PNG/WebP/GIF only), PATCH for
  edit, stock field exposed.
- `app/routers/admin_orders.py` — `POST /api/order/list` + `/api/order/status`
  in the singular-path shape the admin frontend expects.
- `app/routers/analytics.py` — event ingestion that broadcasts to a live
  pub/sub, admin-only `/summary`, **`/segments`** (real-time RFM on the
  orders table), **`/live`** (5-minute snapshot dashboard),
  **`/customer/{user_id}`** (per-user drilldown), and a **WebSocket** at
  `/ws` for true streaming.
- `app/routers/intel_live.py` — new endpoint
  `POST /api/intel/run-on-current-users` that builds a CSV from the live
  orders table and runs the full ML pipeline on it (no upload required).

**New modules**

- `app/auth_deps.py` — JWT dependency helpers (`get_current_user_id`,
  `get_optional_user_id`, `get_current_admin`).
- `app/live_tracking.py` — in-memory pub/sub (one asyncio.Queue per
  subscriber) that powers the WebSocket stream.
- `app/audit.py` — audit-log helper. Every product CRUD and order-status
  change writes a row to `audit_log`.
- `scripts/create_admin.py` — CLI to create or promote an admin user
  without hitting the DB directly.

**ML pipeline fixes**

- Made `pd.qcut` calls in `segmentation.py` and `clv.py` small-sample-safe
  (they used to crash with "Bin labels must be one fewer than the number
  of bin edges" on very small live datasets).
- Three module-level `Groq()` instantiations (`query.py`,
  `insights.py`, `pipeline/schema_detection.py`) became lazy
  getters — the app now imports cleanly without `GROQ_API_KEY`.
- `insights.py` outputs human-readable formatted text instead of raw
  JSON dumps; LLM-only cards (Executive Summary, Anomaly Report) are
  skipped entirely when no key is configured.

**Security**

- JWT secret length enforced at import time (≥32 chars or boot fails).
- bcrypt password hashing on signup; timing-safe `_verify_password`
  with a dummy-hash compare for unknown users.
- Strong password policy on signup (`validate_password_strength`).
- Admin-only guards on every intel + analytics endpoint via
  `get_current_admin`.
- CORS widened with a localhost-only regex (`localhost|127.0.0.1:any-port`).

### Frontend (shop SPA)

- `hooks/useAnalytics.js` — rewritten with per-event helpers:
  `trackProductView`, `trackAddToCart`, `trackRemoveFromCart`,
  `trackCheckoutStart`, `trackPurchase`, `trackLogin`, `trackSignup`,
  `trackLogout`, `trackSearch`. Every event now carries `user_id` (from
  localStorage) and `monetary_value` where relevant — so the analytics
  table directly powers RFM.
- Wired the trackers into `Login.jsx` (login/signup), `ShopContext.jsx`
  (addToCart, placeOrder, logout), `Product.jsx` (view), and
  `SearchBar.jsx` (debounced search).
- `ShopContext.jsx` — added wishlist with `toggleWishlist` /
  `isWishlisted`, persisted to localStorage. Each toggle fires
  `wishlist_add` or `wishlist_remove` as an analytics event with the
  product's price as `monetary_value`.
- `ProductItem.jsx` — heart-icon overlay for wishlist toggling.
- `services/api.js` — global 401 interceptor that auto-clears the JWT
  and redirects to `/login?reason=session_expired`. Plus JSDoc-typed
  wrappers for `login` / `signup` / `placeOrder`.
- `ShopContext.placeOrder` — sends the JWT as `Authorization: Bearer …`
  so the backend can link the order to a user.
- Removed Track Order button from `Orders.jsx`.
- Removed eSewa + Khalti payment options from `PlaceOrder.jsx` (Cash on
  Delivery only).

### Frontend (admin SPA)

- **New `Intel.jsx` page** — full ML pipeline UI: CSV upload OR "Analyze
  current users" button, polling status, KPI cards, segment-distribution
  bars, top customers by CLV, auto-generated insights, customers table
  with segment/anomaly filters, "Ask the data" NL query box, and an HVR
  retrain button.
- **New `LiveTracking.jsx` page** — KPI strip (active sessions, events,
  WS subscribers, segmented users), events-per-minute sparkline, top
  pages, RFM segment distribution, real-time event feed (via WebSocket),
  recent-events snapshot table, and a clickable user-detail drawer that
  shows that user's orders + recent events.
- `Sidebar.jsx` — added nav entries for **Live Tracking** and
  **Intel (ML)**.
- `List.jsx` — added the missing **Edit product** flow (modal with
  name / description / price / category / sub-category / sizes /
  bestseller / stock). Pill-shaped action buttons replaced the previous
  cramped × icon.
- Stock display in the product list (gray > 5, amber 1-5, red 0); stock
  is part of the edit modal.

### Shop catalog scaffolding kept (intentionally)

- Static `products` in `frontend/src/assets/frontend_assets/assets.js`
  still feeds the shop UI. The admin-managed `products` table is
  separate; if you want one source of truth later, the shop just needs
  to swap its import for a `fetch('/api/product/list')`.

### Removed during cleanup

- The "Track Order" button on the customer Orders page.
- eSewa and Khalti payment buttons.
- Dark-mode infrastructure (was added then reverted): `dark:` Tailwind
  variants stripped from 39 files, ThemeToggle components stubbed.
- Transactional email feature: `app/mailer.py` reduced to a no-op stub,
  `SMTP_*` env vars removed from `.env`/`.env.example`, order-placement
  and status-change email blocks deleted.
- Old `backend_old/` directory (the pre-merger code) is in `.gitignore`.

### Project hygiene

- `.gitignore` covers Python caches, `node_modules`, both
  `.env` files, ML datasets/plots/notebooks, uploads, OS junk.
- `backend/.env.example` is committed — fresh placeholders, no secrets.
- `README.md` documents architecture, run steps, demo flow, API
  surface, and acknowledgements.

---

## Part 2 — Setup for a teammate

Send your friend this repo and these steps. Total time: about 15 minutes
on a clean machine.

### Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| **Git** | clone the repo | `https://git-scm.com/downloads` |
| **PostgreSQL 14+** | database | `https://www.postgresql.org/download/` |
| **Python 3.11+** | backend | `https://www.python.org/downloads/` — or just use Anaconda |
| **Node 18+** | both frontends | `https://nodejs.org/` |

During the Postgres install, **remember the password** you set for the
`postgres` user — you'll need it in step 2.

### 1. Clone

```
git clone https://github.com/Adarshajoshi/ThreadHouse.git
cd ThreadHouse
```

(adjust the URL if you renamed/moved the repo)

### 2. Create the database

Open a terminal where `psql` is on PATH (the Postgres installer usually
adds it; on Windows you may need to use the "SQL Shell (psql)" shortcut
it creates in the Start menu).

```
psql -U postgres
```

In the `postgres=#` prompt:

```sql
CREATE DATABASE mindless;
\q
```

### 3. Backend

```
cd backend
copy .env.example .env       (Windows)
# or:
cp .env.example .env         (macOS/Linux)
```

Now edit `backend/.env` with a text editor:

- **`DB_PASSWORD`** — your real Postgres password.
- **`DATABASE_URL`** — replace `CHANGEME` with that same password. Final
  line looks like:
  `DATABASE_URL=postgresql+psycopg2://postgres:yourpass@localhost:5432/mindless`
- **`JWT_SECRET`** and **`SECRET_KEY`** — generate two long random
  strings. From a terminal:

  ```
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

  Run it twice, paste the outputs as the values for `JWT_SECRET=` and
  `SECRET_KEY=`.

- **`GROQ_API_KEY`** *(optional)* — only needed for LLM features
  ("Ask the data" + the LLM insight cards). Get a free key at
  `https://console.groq.com` (no credit card). Leave blank otherwise.

Install Python deps and run:

```
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You should see, after a few seconds:

```
INFO: Started server process
SQLAlchemy tables ready: jobs, customer_profiles, insights.
asyncpg pool ready: users, orders, analytics_events, products tables verified.
INFO: Application startup complete.
```

If asyncpg complains about authentication, the password in `.env`
doesn't match Postgres. If it says the `mindless` database doesn't
exist, redo step 2.

Leave this terminal running.

### 4. Create the admin user (one-time)

In a **second** terminal, still in `backend/`:

```
python scripts/create_admin.py --email me@example.com --password StrongPass1
```

(Pick your own email/password. Email must have a public TLD — avoid
`.local` / `.test` / `.example`. Password: ≥8 chars with upper, lower,
and digit.) The script prints the credentials when it finishes.

### 5. Shop frontend

In a **third** terminal:

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### 6. Admin panel

In a **fourth** terminal:

```
cd admin
npm install
npm run dev
```

Opens at `http://localhost:5174`. Log in with the admin credentials
from step 4.

### What to try first

1. **Shop:** at `localhost:5173`, sign up as a regular (non-admin) user.
   Browse products, click the heart on a couple, add one to cart, go to
   Place Order, fill the form, submit.
2. **Admin:** at `localhost:5174`, log in.
   - **Live Tracking** sidebar entry: the live event feed should already
     have entries from your shop activity. Click any `user N` row to
     open the customer detail drawer.
   - **Intel (ML)**: click **Analyze current users**. After a few
     seconds you'll see KPI cards, segment bars, top customers, and
     auto-generated insights based on the orders you placed.
   - **Orders**: flip your test order's status from "Order Placed" to
     "Shipped" using the dropdown.
   - **Add Product / Product List**: try adding a product with an
     image, then edit it.

### Common gotchas

- **`uvicorn` errors with `ModuleNotFoundError`** → `pip install` didn't
  complete. Re-run `pip install -r requirements.txt`. If a package fails
  to build (commonly `numpy` or `torch`), make sure Python is 3.11 or
  3.12 — 3.13 doesn't have pre-built wheels for some pinned versions.
- **"Failed to fetch" in either frontend** → `uvicorn` isn't running on
  port 8000. Restart it.
- **Admin login 401** → wrong admin password. Re-run
  `create_admin.py --reset-password` to set a known one.
- **Live tracking shows zero events** → the shop frontend isn't running,
  or you haven't browsed anything since starting it.
- **Intel pipeline fails with "no orders with linked user_id"** →
  the only orders you have were placed by a logged-out user. Sign in
  on the shop and place at least one order while authenticated.
- **Anything Groq-related returns 503** → `GROQ_API_KEY` is missing
  from `backend/.env`. Add it and restart uvicorn.

### Stopping everything

`Ctrl+C` in each terminal. Database stays running in the background;
that's normal. Your data persists across restarts.

---

That's it. The full demo runs locally with three terminals (backend,
shop, admin) plus Postgres in the background.
