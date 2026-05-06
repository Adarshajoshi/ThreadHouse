const API_BASE = "/api"

// ── Core fetch wrapper ────────────────────────────────────────────────────────
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
        } catch {
        }
        throw new Error(errorMessage)
    }

    return response.json()
}

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadDataset = async (file, onProgress) => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
        // No Content-Type header — browser sets multipart/form-data automatically
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Upload failed")
    }

    return response.json()
}

// ── Status ────────────────────────────────────────────────────────────────────
export const getJobStatus = (jobId) =>
    apiFetch(`/results/${jobId}/status`)

// ── Overview ──────────────────────────────────────────────────────────────────
export const getOverview = (jobId) =>
    apiFetch(`/results/${jobId}/overview`)

// ── Plots ─────────────────────────────────────────────────────────────────────
export const getPlots = (jobId) =>
    apiFetch(`/results/${jobId}/plots`)

// ── Insights ──────────────────────────────────────────────────────────────────
export const getInsights = (jobId) =>
    apiFetch(`/results/${jobId}/insights`)

// ── Top customers ─────────────────────────────────────────────────────────────
export const getTopCustomers = (jobId, n = 10) =>
    apiFetch(`/results/${jobId}/top-customers?n=${n}`)

// ── Customers with filters ────────────────────────────────────────────────────
export const getCustomers = (jobId, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.segment !== undefined)   params.append("segment",    filters.segment)
    if (filters.isAnomaly !== undefined) params.append("is_anomaly", filters.isAnomaly)
    if (filters.limit !== undefined)     params.append("limit",      filters.limit)
    if (filters.offset !== undefined)    params.append("offset",     filters.offset)
    const query = params.toString()
    return apiFetch(`/results/${jobId}/customers${query ? `?${query}` : ""}`)
}

// ── Natural language query ────────────────────────────────────────────────────
export const queryInsights = (jobId, question) =>
    apiFetch(`/results/${jobId}/query`, {
        method: "POST",
        body: JSON.stringify({ question })
    })

// ── Health check ──────────────────────────────────────────────────────────────
export const healthCheck = () =>
    fetch("/health").then(r => r.json())