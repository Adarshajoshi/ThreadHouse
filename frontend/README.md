# ThreadHouse — Shop Frontend

The customer-facing shop SPA. React 19 + Vite 7 + Tailwind v4. Talks to the FastAPI backend at `http://localhost:8000`.

What the shop does:

- Browse the catalogue (categories: men / women / kids; sub-categories: topwear / bottomwear / footwear / accessories).
- Search with debounced full-text matching.
- Cart and wishlist persisted to `localStorage`.
- Checkout (Cash on Delivery only).
- User profile (edit name / password).
- Every meaningful click, page view, add-to-cart, checkout, search, login, logout, and order is sent to `/api/analytics/event` and tagged with `session_id` + `user_id` + `monetary_value` so the admin's intel pipeline can compute RFM directly from real traffic.

---

## Quick start

### 1. Prerequisites

- **Node 18+** (Node 20 recommended)
- The **backend running** on <http://localhost:8000> — see `../backend/README.md`

### 2. Install

```bash
cd frontend
npm install
```

If `npm install` is slow on the first try, that's normal — Vite + React + Tailwind pulls a few hundred packages. Subsequent installs are fast.

### 3. Configure `.env`

The file already exists with sensible defaults:

```
VITE_API_URL=http://localhost:8000
```

Change this if your backend runs elsewhere (e.g. on a LAN address).

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:5173>. Vite's HMR will hot-reload on every save.

### 5. Production build

```bash
npm run build
npm run preview     # preview the built bundle on port 4173
```

The backend's `main.py` also serves the built SPA from `frontend/dist/` if it's present — `npm run build` and the backend will serve the shop directly at <http://localhost:8000/> (handy for demos).

---

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│                       BrowserRouter                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              ShopContextProvider                      │    │
│  │  cart · wishlist · user · orders · search · …         │    │
│  │  (persisted to localStorage as `th_*`)                │    │
│  │                                                       │    │
│  │  ┌──────────────────────────────────────────┐         │    │
│  │  │                  App                      │         │    │
│  │  │  useAnalytics()  — global event tracking  │         │    │
│  │  │  <Routes>...</Routes>                     │         │    │
│  │  │  <ToastContainer />                       │         │    │
│  │  └──────────────────────────────────────────┘         │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

- **`src/main.jsx`** wraps the app in `BrowserRouter` + `ShopContextProvider` and renders `<App />`.
- **`src/App.jsx`** has every route and calls `useAnalytics()` once at the top to enable page-view + click/keypress/hover tracking.
- **`src/context/ShopContext.jsx`** owns cart, wishlist, user, orders, search. Each piece is persisted to `localStorage` (`th_cart`, `th_wishlist`, `th_user`, `th_orders`, `th_token`) and rehydrated on load.
- **`src/hooks/useAnalytics.js`** exports `trackProductView`, `trackAddToCart`, `trackCheckoutStart`, `trackPurchase`, `trackLogin`, `trackSignup`, `trackLogout`, `trackSearch`, plus the route-change hook used by App.
- **`src/services/api.js`** is a thin `fetch` wrapper plus a module-level 401 interceptor: any 401 after the user has logged in clears `th_token` / `th_user` and redirects to `/login?reason=session_expired`.

### Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `pages/Home.jsx` | Hero · Latest Collection · Best Seller · Policy · Newsletter |
| `/men`, `/women`, `/kids` | `pages/Men|Women|Kids.jsx` | Category listings |
| `/topwear`, `/bottomwear`, `/footwear`, `/accessories` | corresponding pages | Sub-category listings |
| `/search` | `pages/Search.jsx` | Debounced search; fires `trackSearch` |
| `/product/:id` | `pages/Product.jsx` | Product detail; fires `trackProductView` |
| `/cart` | `pages/Cart.jsx` | Cart table + `CartTotal` |
| `/place-order` | `pages/PlaceOrder.jsx` | Shipping form + COD + `trackCheckoutStart` / `trackPurchase` |
| `/login` | `pages/Login.jsx` | Login + signup tabs |
| `/orders` | `pages/Orders.jsx` | User's order history (server + local cache) |
| `/profile` | `pages/Profile.jsx` | `PATCH /api/auth/profile` |
| `/delivery-status` | `pages/DeliveryStatus.jsx` | Static info |
| `/analytics` | `pages/AnalyticsDashboard.jsx` | Power-user analytics view |
| `/intel`, `/intel/dashboard/:id`, `/intel/customers/:id`, `/intel/insights/:id` | `pages/Intel*.jsx` | CSV upload + ML pipeline UI |
| `/about`, `/contact`, `/privacy-policy` | static | Marketing pages |

### Components

```
src/components/
├── Navbar.jsx              # top nav + cart badge + profile dropdown
├── Hero.jsx                # homepage hero banner
├── LatestCollection.jsx    # 10 newest products
├── BestSeller.jsx          # bestseller=true filter
├── ShopByCategory.jsx      # category tiles
├── ProductItem.jsx         # card with wishlist heart overlay
├── RelatedProducts.jsx     # similar items on detail page
├── SearchBar.jsx           # global search bar; debounced
├── CartTotal.jsx           # subtotal + delivery fee + total
├── Trackable.jsx           # wraps a child + fires custom events
├── Title.jsx               # section heading
├── OurPolicy.jsx           # 3-up policy strip
├── NewsletterBox.jsx       # email capture
├── Footer.jsx
├── LoadingSpinner.jsx
├── Skeleton.jsx            # skeleton placeholder
├── ProgressBar.jsx
├── AlertBanner.jsx
├── ThemeToggle.jsx         # (stub — theme toggle removed)
├── IntelNavbar.jsx         # secondary nav on Intel pages
├── IntelStatCard.jsx       # KPI tile
├── SegmentCard.jsx         # one segment in the distribution grid
├── CustomerTable.jsx       # paginated, filterable customer list
├── QueryBox.jsx            # NL question input for /query
└── charts/                 # small wrapper around chart library
```

### Hooks

- **`useAnalytics.js`** — the only thing that talks to `/api/analytics/event`. Session ID is generated once per tab in `sessionStorage`. User ID is re-read from `localStorage.th_user` on every event so login/logout takes effect immediately. Each tracker is best-effort and wrapped in try/catch — a failing fetch never blocks the UX.
- **`usePipeline.js`** — used by Intel pages. Polls `/api/results/{id}/status` every 2 s and exposes `{status, isComplete}`.
- **`useResults.js`** — fetches `/overview` + `/customers` + `/insights` + `/top-customers` for a complete job.

### Context

**`ShopContext.jsx`** exposes:

```js
{
  // data
  products, currency, delivery_fee,
  cartItems, wishlist, orders, user,
  search, showSearch,

  // mutators
  addToCart, removeFromCart, updateQuantity,
  getCartCount, getCartAmount,
  toggleWishlist, isWishlisted,
  placeOrder,
  setSearch, setShowSearch,
  login, logout,
  isLoggedIn,
}
```

All mutators fire the appropriate analytics event before / after their main effect.

---

## Authentication flow

1. User signs up at `/login` (signup tab) → `POST /api/auth/signup` → backend returns `{token, user_id, name, email}`.
2. The token goes into `localStorage.th_token` and the user object into `localStorage.th_user`.
3. Every subsequent authenticated request includes `Authorization: Bearer <token>`.
4. If a request returns 401 *after* a token was set (token expired or revoked), the interceptor in `services/api.js` clears storage and redirects to `/login?reason=session_expired`.
5. Logout calls `POST /api/auth/logout` (symbolic — JWT is stateless) and clears storage.

---

## Tailwind v4 setup (important)

Tailwind 4 dropped PostCSS in favour of a first-class Vite plugin. The config you'll see here:

**`vite.config.js`**

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  ...
})
```

**`src/index.css`**

```css
@import 'tailwindcss';
```

There is **no `tailwind.config.js`** — Tailwind 4 scans your sources on the fly. If your styling looks completely broken (huge icons, no layout, vertical nav links), it's almost always because the Vite plugin isn't registered. Re-check `vite.config.js`.

Custom CSS layers live at the bottom of `src/index.css` (`@layer components { .footer-link { @apply ... } }`).

---

## Working with assets

Product data + bundled assets are in `src/assets/frontend_assets/assets.js`. The default catalogue (`products` export) is used as fallback data for the shop. The backend exposes a `POST /api/product/seed` endpoint that imports this list into the DB on first run.

Uploaded product images from the admin panel are served by the backend at `/static/images/<uuid>.<ext>` — no extra config needed because `vite.config.js` proxies `/api` to the backend (and the `<img src>` URLs are absolute paths).

---

## Build / deploy

```bash
npm run build
```

Produces `frontend/dist/`. The backend automatically serves this if present (see `main.py`'s `FRONTEND_DIST` block) — so a single uvicorn process can serve the entire shop in production. For SPA routing to work, the backend's catch-all `serve_react` route falls back to `index.html` for any non-`/api/` path.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Everything is unstyled, icons huge, links stacked vertically | Tailwind plugin missing in `vite.config.js`. Add `import tailwindcss from '@tailwindcss/vite'` and put `tailwindcss()` in `plugins`. |
| `EACCES` / `ENOENT` on `npm install` | Delete `node_modules/` and `package-lock.json`, re-run `npm install`. |
| `npm install` fails on Windows with rolldown / rollup binary errors | Same fix — remove `node_modules/` and reinstall. The platform-specific binary downloads on install. |
| Page loads but every API call fails with CORS | Backend's CORS regex allows `localhost:<port>`. If you're hitting `127.0.0.1` from the frontend but the backend is on `localhost`, switch one of them. |
| Login works but immediately logs out | JWT expired or `JWT_SECRET` changed on the backend after the token was issued. Log in again. |
| WebSocket / real-time features absent here | This is the shop — live tracking is on the admin panel (port 5174). |
| `npm run dev` says port 5173 in use | `kill` the other process or `npm run dev -- --port 5180`. |

---

## Conventions

- **`th_*` localStorage keys** — `th_cart`, `th_wishlist`, `th_user`, `th_token`, `th_orders`. Anything else is not ours.
- **`session_id`** — a random string stored in `sessionStorage.th_session`. Resets when the tab closes.
- **Toast notifications** — `react-toastify` mounted once in `App.jsx`. Call `toast.success(...)`, `toast.error(...)`.
- **Routing** — `react-router-dom` v7. Use `<NavLink>` for nav highlights; `<Link>` for the rest.
- **Styling** — Tailwind utility classes inline. Custom global styles in `src/index.css`. Avoid CSS modules.

---

## Stack

- React 19, Vite 7, Tailwind CSS v4
- react-router-dom 7
- react-toastify 11
- axios (used inline in some places; `services/api.js` uses `fetch`)
