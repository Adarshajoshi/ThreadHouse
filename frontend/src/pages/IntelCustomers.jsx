import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { getCustomers } from "../services/api"
import IntelNavbar from "../components/IntelNavbar"
import CustomerTable from "../components/CustomerTable"
import { ALL_SEGMENTS } from "../constants/segments"

const LIMIT = 50

export default function IntelCustomers() {
  const { jobId } = useParams()
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState("All")
  const [showAnomalies, setShowAnomalies] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const filters = { limit: LIMIT, offset: page * LIMIT }
        if (selectedSegment !== "All") filters.segment = selectedSegment
        if (showAnomalies) filters.isAnomaly = true
        const data = await getCustomers(jobId, filters)
        setCustomers(data.customers)
        setTotal(data.total)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [jobId, selectedSegment, showAnomalies, page])

  const totalPages = Math.ceil(total / LIMIT)

  // CSV export
  const exportCSV = () => {
    if (!customers.length) return
    const headers = ["customer_id","segment","recency","frequency","monetary","clv_12months","hvr_probability","anomaly_type"]
    const rows = customers.map(c =>
      headers.map(h => c[h] ?? "").join(",")
    )
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `customers_${jobId?.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <IntelNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Customer Explorer</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Showing {customers.length} of <span className="text-zinc-300 font-mono">{total.toLocaleString()}</span> customers
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg border border-zinc-700 transition-colors"
          >
            ↓ Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Segment</label>
            <select
              value={selectedSegment}
              onChange={e => { setSelectedSegment(e.target.value); setPage(0) }}
              className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
            >
              {ALL_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 justify-end">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Filter</label>
            <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={e => { setShowAnomalies(e.target.checked); setPage(0) }}
                className="rounded"
              />
              <span className="text-sm text-zinc-300">Anomalies only</span>
            </label>
          </div>

          {(selectedSegment !== "All" || showAnomalies) && (
            <div className="flex items-end">
              <button
                onClick={() => { setSelectedSegment("All"); setShowAnomalies(false); setPage(0) }}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <CustomerTable customers={customers} loading={loading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-zinc-500">
              Page <span className="text-white font-mono">{page + 1}</span> of{" "}
              <span className="text-white font-mono">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * LIMIT >= total}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
