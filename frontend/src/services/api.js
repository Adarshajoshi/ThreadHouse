const API_BASE = "/api"

const apiFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { "Content-Type": "application/json" },
        ...options
    })
    if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`
        try {
            const error = await response.json()
            errorMessage = error.detail || error.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
    }
    return response.json()
}

export const uploadDataset = async (file) => {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
    })
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Upload failed")
    }
    return response.json()
}

export const getJobStatus = (jobId) =>
    apiFetch(`/results/${jobId}/status`)

export const getOverview = (jobId) =>
    apiFetch(`/results/${jobId}/overview`)

export const getPlots = (jobId) =>
    apiFetch(`/results/${jobId}/plots`)

export const getInsights = (jobId) =>
    apiFetch(`/results/${jobId}/insights`)

export const getTopCustomers = (jobId, n = 10) =>
    apiFetch(`/results/${jobId}/top-customers?n=${n}`)

export const getCustomers = (jobId, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.segment   !== undefined) params.append("segment",    filters.segment)
    if (filters.isAnomaly !== undefined) params.append("is_anomaly", filters.isAnomaly)
    if (filters.limit     !== undefined) params.append("limit",      filters.limit)
    if (filters.offset    !== undefined) params.append("offset",     filters.offset)
    const query = params.toString()
    return apiFetch(`/results/${jobId}/customers${query ? `?${query}` : ""}`)
}

export const queryInsights = (jobId, question) =>
    apiFetch(`/results/${jobId}/query`, {
        method: "POST",
        body: JSON.stringify({ question })
    })

export const healthCheck = () =>
    fetch("/health").then(r => r.json())

const SHOP_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function sendAnalyticsEvent(payload) {
    try {
        await fetch(`${SHOP_API_BASE}/api/analytics/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
    } catch {}
}

export async function getAnalyticsSummary() {
    const res = await fetch(`${SHOP_API_BASE}/api/analytics/summary`)
    if (!res.ok) throw new Error(`Server error ${res.status}`)
    return res.json()
}


// ---------------------------------------------------------------------------
// Global 401 handler — auto-logout when a JWT expires.
// Wraps `fetch` once at module load. If any API call returns 401 *after* a
// token was set, we clear localStorage and redirect to /login.
// ---------------------------------------------------------------------------
;(function installAutoLogout() {
    if (typeof window === 'undefined' || window.__th_auto_logout_installed__) return
    window.__th_auto_logout_installed__ = true
    const origFetch = window.fetch
    window.fetch = async (...args) => {
        const res = await origFetch(...args)
        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
            if (res.status === 401 && url.includes('/api/') && localStorage.getItem('th_token')) {
                localStorage.removeItem('th_token')
                localStorage.removeItem('th_user')
                if (!location.pathname.startsWith('/login')) {
                    location.assign('/login?reason=session_expired')
                }
            }
        } catch {}
        return res
    }
})()


// ---------------------------------------------------------------------------
// Typed wrappers (JSDoc) — IDEs (VS Code) will catch field-name typos here.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OrderPayload
 * @property {string} order_id
 * @property {Array<{_id: string, name: string, price: number, image: string[], size: string, quantity: number}>} items
 * @property {Object} delivery_info
 * @property {string} payment_method
 * @property {number} total
 */

/** @typedef {Object} AuthResponse
 *  @property {string} token
 *  @property {number} user_id
 *  @property {string|null} name
 *  @property {string} email
 */

/** @param {string} email @param {string} password
 *  @returns {Promise<AuthResponse>}
 */
export async function login(email, password) {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    })
}

/** @param {string} name @param {string} email @param {string} password
 *  @returns {Promise<AuthResponse>}
 */
export async function signup(name, email, password) {
    return apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    })
}

/** @param {OrderPayload} payload
 *  @param {string} [token] - optional bearer token, attaches user_id to the order
 */
export async function placeOrder(payload, token) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const r = await fetch(`${SHOP_API_BASE}/api/orders/`, {
        method: 'POST', headers, body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error((await r.json()).detail || 'Order failed')
    return r.json()
}
