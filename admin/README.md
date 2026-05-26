# ThreadHouse — Admin Panel

Admin SPA for the ThreadHouse e-commerce stack. React 19 + Vite 8 + Tailwind v4. Talks to the FastAPI backend at `http://localhost:8000`. Runs on **port 5174** so it can run side-by-side with the shop (which uses 5173).

What you can do as an admin:

- **Add Product** — multipart upload with up to 4 images, price, category, sub-category, sizes, bestseller toggle.
- **Product List** — view / edit / delete every product. Audit-logged.
- **Orders** — see every order from every user, flip status (`Order Placed` → `Packing` → `Shipped` → `Out for Delivery` → `Delivered`). Each change writes an audit-log row.
- **Live Tracking** — real-time WebSocket stream of analytics events from the shop, plus a per-user drawer (orders + last 100 events).
- **Intel (ML)** — upload a transactions CSV or click *Analyze current users* to feed the live `orders` table into the ML pipeline. Watch the job poll to completion, then explore KPIs, top customers by CLV, LLM-generated insight cards, the filterable customer table, and ask natural-language questions against the result.

---

## Quick start

### 1. Prerequisites

- **Node 18+** (Node 20 recommended)
- The **backend running** on <http://localhost:8000> — see `../backend/README.md`
- An **admin user** in the DB — create one with `python ../backend/scripts/create_admin.py --email you@example.com --password StrongPass1`

### 2. Install

```bash
cd admin
npm install
```

### 3. Configure `.env`

The file already exists with:

```
VITE_BACKEND_URL=http://localhost:8000
```

Change this if your backend is elsewhere.

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:5174>.

You'll be greeted by the login page. Log in with the admin credentials from step 1.

### 5. Production build

```bash
npm run build
npm run preview     # preview the built bundle
```

`dist/` can be served by any static host (Nginx, Netlify, S3, etc.).

---

## How it works

```
┌──────────────────────────────────────────────────────────┐
│                    BrowserRouter                          │
│  ┌────────────────────────────────────────────────────┐   │
│  │                       App                            │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  if (!token) <Login />                        │  │   │
│  │  │  else:                                        │  │   │
│  │  │    <Navbar />                                 │  │   │
│  │  │    <Sidebar />                                │  │   │
│  │  │    <Routes>                                   │  │   │
│  │  │      /list  → <List />                        │  │   │
│  │  │      /add   → <Add />                         │  │   │
│  │  │      /orders→ <Orders />                      │  │   │
│  │  │      /live  → <LiveTracking />                │  │   │
│  │  │      /intel → <Intel />                       │  │   │
│  │  │    </Routes>                                  │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

The token from `localStorage.admin_token` controls whether you see the Login screen or the full admin shell. Each page accepts `token` as a prop and includes it in its API calls — most send it via *both* `Authorization: Bearer <token>` and a plain `token` header (the backend's `auth_deps._strip_bearer` accepts either).

### Login

`src/components/Login.jsx` sends `POST /api/user/admin` (a legacy alias of `POST /api/auth/admin/login`) with `{email, password}`. On success the response `{token, user_id, name, email}` is stored: `localStorage.admin_token = response.data.token`. The token is re-read on every page mount.

### Logout

`Navbar.jsx` calls the `handleLogout` passed down from `App.jsx`, which clears `localStorage.admin_token` and returns to the login screen.

---

## File map

```
admin/
├── .env                       # VITE_BACKEND_URL=http://localhost:8000
├── index.html
├── vite.config.js             # react + tailwind; port 5174; /api proxy
├── package.json
└── src/
    ├── main.jsx               # BrowserRouter + <App />
    ├── App.jsx                # token gate + Routes
    ├── index.css              # @import 'tailwindcss';
    ├── assets/assets.js       # inline-SVG icons (logo, add_icon, …)
    ├── components/
    │   ├── Login.jsx          # POST /api/user/admin
    │   ├── Navbar.jsx         # logo + logout
    │   ├── Sidebar.jsx        # nav links
    │   └── ThemeToggle.jsx    # stub (theme toggle removed)
    └── pages/
        ├── Add.jsx            # POST /api/product/add  (multipart, ≤4 images)
        ├── List.jsx           # GET /api/product/list + remove + PATCH
        ├── Orders.jsx         # POST /api/order/list + /api/order/status
        ├── LiveTracking.jsx   # WS + polled snapshot + segments + drawer
        └── Intel.jsx          # full ML pipeline UI
```

### Pages in detail

#### `pages/Add.jsx`
Multipart form. Up to 4 image slots (`image1`..`image4`), name, description, price, category, sub-category, sizes (multi-select), bestseller checkbox. Submits to `POST /api/product/add`. The backend validates MIME / ext / size (≤5 MB), writes images to `backend/static/images/<uuid>.<ext>`, and stores their public URLs in the DB.

#### `pages/List.jsx`
Fetches `GET /api/product/list` on mount. Renders a table with thumbnail, name, category, price, stock. Each row has **Delete** (`POST /api/product/remove`) and **Edit** which opens a modal. The modal does `PATCH /api/product/{id}` with the fields you change.

#### `pages/Orders.jsx`
Fetches `POST /api/order/list` (yes, POST — that's what the GreatStack admin UI expects). Renders one card per order with customer, items, total, payment method, current status, and a status `<select>`. Changing the select calls `POST /api/order/status {orderId, status}`, which writes an audit-log entry.

#### `pages/LiveTracking.jsx`
The most interesting page. Two data sources:

1. **Polling** (every 5 s):
   - `GET /api/analytics/live?minutes={5|15|30|60}` — active sessions, events per minute, top pages, recent events.
   - `GET /api/analytics/segments` — live RFM segmentation over the orders table.

2. **WebSocket** (real-time):
   - Opens `ws://localhost:8000/api/analytics/ws?token=<JWT>`. Every event a shop user fires shows up here within a few ms.
   - WS state badge: `connecting` / `open` / `closed`. If the connection drops, you'll see the polling data still tick.

Clicking a user opens a **drawer** that fetches `GET /api/analytics/customer/{user_id}` — full profile + orders + last 100 events.

#### `pages/Intel.jsx`
Entry point to the ML pipeline. Three paths to a job:

1. **Upload CSV** — drag a file in or click *Choose file*. POSTs to `/api/upload`.
2. **Analyze current users** — POSTs to `/api/intel/run-on-current-users`. The backend synthesises a CSV from the live `orders` table.
3. **Resume previous job** — the last `job_id` is cached in `localStorage.admin_intel_job_id`; on page load it polls that job's status and re-renders if it's still alive.

Once you have a `job_id`, the page polls `GET /api/results/{id}/status` every 1.5 s until status is `complete` or `failed`. On complete it fans out:

- `GET /api/results/{id}/overview` — KPI cards (total customers, total revenue, average 12-month CLV, anomaly count) + segment distribution.
- `GET /api/results/{id}/top-customers?n=10` — CLV leaderboard.
- `GET /api/results/{id}/insights` — LLM-narrated cards.
- `GET /api/results/{id}/customers` — paginated, filterable customer table (filter by segment + anomaly flag).

There's also a **natural-language Q&A box** that POSTs `{question}` to `/api/results/{id}/query` and renders the LLM answer.

A **Retrain HVR model** button POSTs to `/api/admin/train` and shows the returned AUC.

---

## API surface used by the admin

| Endpoint | Used by |
|---|---|
| `POST /api/user/admin` | `Login.jsx` |
| `GET  /api/product/list` | `List.jsx` |
| `POST /api/product/add` | `Add.jsx` |
| `POST /api/product/remove` | `List.jsx` |
| `PATCH /api/product/{id}` | `List.jsx` (edit modal) |
| `POST /api/order/list` | `Orders.jsx` |
| `POST /api/order/status` | `Orders.jsx` |
| `GET  /api/analytics/live` | `LiveTracking.jsx` |
| `GET  /api/analytics/segments` | `LiveTracking.jsx` |
| `GET  /api/analytics/customer/{id}` | `LiveTracking.jsx` (drawer) |
| `WS   /api/analytics/ws?token=` | `LiveTracking.jsx` (stream) |
| `POST /api/upload` | `Intel.jsx` |
| `POST /api/intel/run-on-current-users` | `Intel.jsx` |
| `GET  /api/results/{id}/status` | `Intel.jsx` (poll) |
| `GET  /api/results/{id}/overview` | `Intel.jsx` |
| `GET  /api/results/{id}/customers` | `Intel.jsx` |
| `GET  /api/results/{id}/insights` | `Intel.jsx` |
| `GET  /api/results/{id}/top-customers` | `Intel.jsx` |
| `POST /api/results/{id}/query` | `Intel.jsx` (NL box) |
| `POST /api/admin/train` | `Intel.jsx` (Retrain) |

---

## Token / auth conventions

The admin token lives in `localStorage.admin_token`. Each page is a function component that takes `token` as a prop (passed down from `App.jsx`), and includes it on every request:

```js
axios.get(`${backendUrl}/api/...`, {
  headers: {
    Authorization: `Bearer ${token}`,
    token,                      // legacy header — backend accepts both
  },
})
```

If a request 401s, the page typically toasts an error. Refresh and log in again. (There's no auto-redirect interceptor like the shop has — the admin token doesn't expire silently mid-session very often.)

The WebSocket can't carry headers from the browser, so the token is in the query string:

```js
const wsUrl =
  backendUrl.replace(/^http/, 'ws') +
  `/api/analytics/ws?token=${encodeURIComponent(token)}`
```

The backend close codes:

- `4401` — missing or invalid token
- `4403` — token valid but `role !== 'admin'`
- `1011` — server error (pool not initialised)

---

## Tailwind v4 setup

Same as the shop frontend. The Vite plugin is registered in `vite.config.js`:

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  ...
})
```

`src/index.css` is just:

```css
@import 'tailwindcss';
```

If styling looks broken, double-check those two files first.

---

## Assets

`src/assets/assets.js` exports five icons as inline-SVG data-URIs: `logo`, `add_icon`, `order_icon`, `parcel_icon`, `upload_area`. They're used by the Sidebar / Navbar / Login / Add pages. No external image files are needed — the SVGs are styled to the teal palette and render on a fresh clone.

If you'd prefer real PNGs (matching the GreatStack tutorial scaffold), drop them into `src/assets/admin_assets/` and rewrite `assets.js` to import them.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login button hangs / spinner forever | Backend isn't running, or `VITE_BACKEND_URL` doesn't match where it's running. |
| "Invalid credentials" but you're sure of the password | The user might not be an admin. Run `python ../backend/scripts/create_admin.py --email you@example.com --password ...` to promote. |
| Live Tracking shows `wsState: closed` immediately | Token expired, or the user isn't an admin. Log out and back in. |
| Charts / icons look enormous and the page is unstyled | Tailwind plugin isn't registered in `vite.config.js`. Re-add `import tailwindcss from '@tailwindcss/vite'` and put `tailwindcss()` in `plugins`. |
| `Analyze current users` says *No orders with linked user_id* | Place at least one order from the shop while **logged in**. Guest orders won't show up because `user_id` is NULL. |
| Intel page is stuck on `processing` | Check the backend terminal for traceback. Most likely the Job failed — try `GET /api/results/{id}/status` directly and read `error_message`. |
| NL query box returns 503 | `GROQ_API_KEY` isn't set in the backend's `.env`. The pipeline still works, but LLM features are disabled. |
| Port 5174 already in use | `npm run dev -- --port 5180`. |

---

## Conventions

- **`admin_*` localStorage keys** — `admin_token`, `admin_intel_job_id`.
- **Toast notifications** — `react-toastify`, mounted once in `App.jsx`.
- **HTTP client** — `axios`. Most pages set `Authorization: Bearer <token>` + a plain `token` header on every request.
- **Routing** — `react-router-dom` v7. Default route redirects to `/list`.
- **Styling** — Tailwind utility classes inline. No CSS modules.

---

## Demo flow (5 minutes)

This is the script for showing off the admin panel end-to-end:

1. **Shop (port 5173)** — sign up as a regular user, browse, wishlist a couple of products, add to cart, place a Cash-on-Delivery order.
2. **Admin (port 5174)** — log in.
3. **Live Tracking** — open the shop in another tab and keep clicking. Each click / page view appears in real time in the admin's feed, segmented by user.
4. **Orders** — find the order you just placed. Change its status from *Order Placed* → *Shipped*. (An audit-log entry is written behind the scenes.)
5. **Intel** — click **Analyze current users**. Watch the job poll from `processing` → `complete`. KPIs, segment distribution, top customers by CLV, anomaly count, insight cards, and the customer table all populate.
6. Ask the NL box something like *"which segment has the highest CLV?"* and read the LLM's answer.
7. (Optional) **Retrain HVR model** — runs the Gradient Boosting Classifier and reports a test AUC.

---

## Stack

- React 19, Vite 8, Tailwind CSS v4
- react-router-dom 7
- react-toastify 11
- axios 1.x
