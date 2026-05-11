import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

// =====================================================================
// Intel — admin entry point to the ML pipeline.
// Talks to the ThreadHouse intel routes:
//   POST /api/upload                       (CSV upload, kicks off pipeline)
//   GET  /api/results/{id}/status          (poll until status === "complete")
//   GET  /api/results/{id}/overview        (KPIs + segment counts)
//   GET  /api/results/{id}/top-customers   (CLV leaderboard)
//   GET  /api/results/{id}/insights        (auto-generated insights)
//   GET  /api/results/{id}/customers       (paginated profiles + filters)
//   POST /api/results/{id}/query           (natural-language Q&A via Groq)
//   POST /api/admin/train                  (one-shot HVR model training)
// =====================================================================

const JOB_KEY = 'admin_intel_job_id'
const POLL_MS = 1500

const Intel = ({ token }) => {
  const [jobId, setJobId] = useState(() => localStorage.getItem(JOB_KEY) || '')
  const [jobStatus, setJobStatus]     = useState(null)
  const [overview, setOverview]       = useState(null)
  const [topCustomers, setTopCustomers] = useState([])
  const [insights, setInsights]       = useState([])
  const [customers, setCustomers]     = useState([])
  const [filters, setFilters]         = useState({ segment: '', isAnomaly: '' })
  const [loading, setLoading]         = useState(false)

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // NL query
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')
  const [asking, setAsking]     = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}`, token }

  // -----------------------------------------------------------------
  // Upload
  // -----------------------------------------------------------------
  const onUpload = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only CSV files are supported')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post(`${backendUrl}/api/upload`, fd, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      })
      const newJob = res.data.job_id
      localStorage.setItem(JOB_KEY, newJob)
      setJobId(newJob)
      setOverview(null); setTopCustomers([]); setInsights([]); setCustomers([])
      setJobStatus({ status: 'processing' })
      toast.success('Pipeline started')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // -----------------------------------------------------------------
  // Poll job status until complete / failed
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    const poll = async () => {
      try {
        const r = await axios.get(`${backendUrl}/api/results/${jobId}/status`, { headers: authHeaders })
        if (cancelled) return
        setJobStatus(r.data)
        if (r.data.status === 'complete' || r.data.status === 'failed') {
          return  // stop polling
        }
        setTimeout(poll, POLL_MS)
      } catch (err) {
        if (!cancelled) {
          // 404 means an old job id from a wiped DB
          if (err?.response?.status === 404) {
            localStorage.removeItem(JOB_KEY)
            setJobId('')
            setJobStatus(null)
          } else {
            setTimeout(poll, POLL_MS * 2)
          }
        }
      }
    }
    poll()
    return () => { cancelled = true }
  }, [jobId])

  // -----------------------------------------------------------------
  // When job is complete, fetch overview + insights + top customers
  // -----------------------------------------------------------------
  useEffect(() => {
    if (jobStatus?.status !== 'complete') return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [ov, top, ins] = await Promise.allSettled([
          axios.get(`${backendUrl}/api/results/${jobId}/overview`,      { headers: authHeaders }),
          axios.get(`${backendUrl}/api/results/${jobId}/top-customers`, { headers: authHeaders }),
          axios.get(`${backendUrl}/api/results/${jobId}/insights`,      { headers: authHeaders }),
        ])
        if (cancelled) return
        if (ov.status  === 'fulfilled') setOverview(ov.value.data)
        if (top.status === 'fulfilled') setTopCustomers(top.value.data.top_customers || [])
        if (ins.status === 'fulfilled') setInsights(ins.value.data.insights || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [jobStatus?.status, jobId])

  // -----------------------------------------------------------------
  // Load customers (with filters)
  // -----------------------------------------------------------------
  const fetchCustomers = async () => {
    if (!jobId) return
    const params = new URLSearchParams()
    if (filters.segment)   params.append('segment',     filters.segment)
    if (filters.isAnomaly) params.append('is_anomaly',  filters.isAnomaly)
    params.append('limit', 200)
    try {
      const r = await axios.get(`${backendUrl}/api/results/${jobId}/customers?${params.toString()}`, { headers: authHeaders })
      setCustomers(r.data.customers || [])
    } catch (err) {
      toast.error('Failed to load customers')
    }
  }

  useEffect(() => {
    if (jobStatus?.status === 'complete') fetchCustomers()
  }, [jobStatus?.status, jobId, filters.segment, filters.isAnomaly])

  // -----------------------------------------------------------------
  // NL query
  // -----------------------------------------------------------------
  const askQuestion = async (e) => {
    e.preventDefault()
    if (!jobId || !question.trim()) return
    setAsking(true); setAnswer('')
    try {
      const r = await axios.post(
        `${backendUrl}/api/results/${jobId}/query`,
        { question },
        { headers: authHeaders }
      )
      setAnswer(r.data.answer)
    } catch (err) {
      const code = err?.response?.status
      const detail = err?.response?.data?.detail
      if (code === 503) toast.error('GROQ_API_KEY is not configured on the server')
      else toast.error(detail || 'Query failed')
    } finally {
      setAsking(false)
    }
  }

  // -----------------------------------------------------------------
  // Run pipeline on the live shop data (no upload needed).
  // -----------------------------------------------------------------
  const [runningLive, setRunningLive] = useState(false)
  const runOnCurrentUsers = async () => {
    setRunningLive(true)
    try {
      const r = await axios.post(`${backendUrl}/api/intel/run-on-current-users`, {}, { headers: authHeaders })
      const newJob = r.data.job_id
      localStorage.setItem(JOB_KEY, newJob)
      setJobId(newJob)
      setOverview(null); setTopCustomers([]); setInsights([]); setCustomers([])
      setJobStatus({ status: 'processing' })
      toast.success(`Pipeline started on ${r.data.row_count} line items from ${r.data.distinct_users} users`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not run on current user data')
    } finally {
      setRunningLive(false)
    }
  }

  // -----------------------------------------------------------------
  // HVR train (one-off)
  // -----------------------------------------------------------------
  const [training, setTraining] = useState(false)
  const trainHVR = async () => {
    setTraining(true)
    try {
      const r = await axios.post(`${backendUrl}/api/admin/train`, {}, { headers: authHeaders })
      const data = r.data
      if (data.status === 'success') toast.success(`Trained. AUC = ${data.auc}`)
      else toast.error(data.message || 'Training failed')
    } catch (err) {
      toast.error('Training endpoint failed')
    } finally {
      setTraining(false)
    }
  }

  const switchJob = () => {
    const next = window.prompt('Paste a job_id to switch to (or leave blank to clear):', jobId)
    if (next === null) return
    if (!next) {
      localStorage.removeItem(JOB_KEY); setJobId(''); setJobStatus(null)
      setOverview(null); setTopCustomers([]); setInsights([]); setCustomers([])
    } else {
      localStorage.setItem(JOB_KEY, next.trim())
      setJobId(next.trim()); setJobStatus(null)
      setOverview(null); setTopCustomers([]); setInsights([]); setCustomers([])
    }
  }

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">Customer Intelligence</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Upload a transactional CSV. The pipeline runs RFM scoring, CLV prediction,
            anomaly detection, and generates LLM insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={trainHVR}
            disabled={training}
            className="text-xs border border-stone-300 px-3 py-1.5 rounded-lg hover:border-teal-600 disabled:opacity-50"
          >
            {training ? 'Training…' : 'Train HVR model'}
          </button>
          <button
            onClick={switchJob}
            className="text-xs border border-stone-300 px-3 py-1.5 rounded-lg hover:border-teal-600"
          >
            Switch job
          </button>
        </div>
      </div>

      {/* Upload OR run on live shop data */}
      <Card title="Choose a data source">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={e => onUpload(e.target.files?.[0])}
            disabled={uploading || runningLive}
            className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white file:cursor-pointer hover:file:bg-gray-800 file:disabled:opacity-50"
          />
          <span className="text-xs text-stone-400">— or —</span>
          <button
            onClick={runOnCurrentUsers}
            disabled={uploading || runningLive}
            className="text-sm border border-stone-300 hover:border-teal-600 px-4 py-2 rounded-lg disabled:opacity-50"
            title="Build a CSV from the orders table and run the pipeline on it."
          >
            {runningLive ? 'Exporting…' : 'Analyze current users'}
          </button>
          {uploading && <span className="text-sm text-stone-500">Uploading…</span>}
          {jobId && (
            <span className="text-xs font-mono text-stone-500">
              job: {jobId.slice(0, 8)}… ·
              <span className={`ml-1 px-1.5 py-0.5 rounded ${
                jobStatus?.status === 'complete' ? 'bg-green-100 text-green-700'
                : jobStatus?.status === 'failed' ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700 animate-pulse'
              }`}>
                {jobStatus?.status || 'unknown'}
              </span>
              {jobStatus?.row_count != null && <span className="ml-2 text-stone-500">{jobStatus.row_count} rows</span>}
              {jobStatus?.customer_count != null && <span className="ml-1 text-stone-500">· {jobStatus.customer_count} customers</span>}
            </span>
          )}
        </div>
        {jobStatus?.status === 'failed' && (
          <p className="text-sm text-red-600 mt-3">Pipeline failed: {jobStatus.error_message || 'unknown error'}</p>
        )}
      </Card>

      {/* Overview KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Customers"        value={overview.total_customers ?? 0} />
          <KPI label="Revenue"          value={`$${(overview.total_revenue ?? 0).toLocaleString()}`} />
          <KPI label="Avg CLV (12m)"    value={`$${(overview.avg_clv_12months ?? 0).toLocaleString()}`} />
          <KPI label="Anomalies"        value={overview.total_anomalies ?? 0} />
        </div>
      )}

      {/* Segment distribution */}
      {overview?.segment_distribution && Object.keys(overview.segment_distribution).length > 0 && (
        <Card title="Segment distribution">
          <SegmentBars dist={overview.segment_distribution} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top customers */}
        <Card title="Top customers by CLV">
          {topCustomers.length === 0
            ? <Empty loading={loading} text="No customers yet." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-stone-400 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Segment</th>
                      <th className="text-right py-2">CLV (12m)</th>
                      <th className="text-right py-2">Spend</th>
                      <th className="text-right py-2">Alive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => (
                      <tr key={i} className="border-t border-stone-200">
                        <td className="py-1.5 font-mono">{c.customer_id}</td>
                        <td className="py-1.5">{c.segment}</td>
                        <td className="py-1.5 text-right tabular-nums">${(c.clv_12months || 0).toFixed(2)}</td>
                        <td className="py-1.5 text-right tabular-nums">${(c.monetary || 0).toFixed(2)}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.prob_alive != null ? `${(c.prob_alive * 100).toFixed(0)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>

        {/* Insights */}
        <Card title="Auto-generated insights">
          {insights.length === 0
            ? <Empty loading={loading} text="No insights yet." />
            : (
              <ul className="space-y-3">
                {insights.map((ins, i) => (
                  <li key={i} className="border-l-4 pl-3 py-1" style={{ borderColor: priorityColor(ins.priority) }}>
                    <div className="text-sm font-semibold text-stone-800">{ins.title}</div>
                    <div className="text-xs text-stone-600 mt-0.5 space-y-0.5">
                      {(ins.body || '').split('\n').map((line, j) => (
                        <div key={j} className={line.startsWith('    ') ? 'pl-4 text-stone-500 ' : ''}>{line}</div>
                      ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">{ins.category}</div>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>

      {/* NL query */}
      {jobStatus?.status === 'complete' && (
        <Card title="Ask the data">
          <form onSubmit={askQuestion} className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Which segments drive most revenue?"
              className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="bg-teal-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {asking ? 'Asking…' : 'Ask'}
            </button>
          </form>
          {answer && (
            <div className="mt-4 p-3 bg-white rounded-lg text-sm text-stone-800 whitespace-pre-wrap">
              {answer}
            </div>
          )}
        </Card>
      )}

      {/* Customer table with filters */}
      {jobStatus?.status === 'complete' && (
        <Card title={`Customers (${customers.length})`}>
          <div className="flex gap-2 mb-3 flex-wrap">
            <select
              value={filters.segment}
              onChange={e => setFilters(f => ({ ...f, segment: e.target.value }))}
              className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">All segments</option>
              {overview?.segment_distribution && Object.keys(overview.segment_distribution).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filters.isAnomaly}
              onChange={e => setFilters(f => ({ ...f, isAnomaly: e.target.value }))}
              className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">Normal + Anomalies</option>
              <option value="true">Anomalies only</option>
              <option value="false">Normal only</option>
            </select>
          </div>
          {customers.length === 0
            ? <Empty loading={false} text="No customers match these filters." />
            : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-stone-400 uppercase tracking-wider sticky top-0 bg-white">
                    <tr>
                      <th className="text-left py-2">ID</th>
                      <th className="text-left py-2">Segment</th>
                      <th className="text-right py-2">R / F / M</th>
                      <th className="text-right py-2">CLV</th>
                      <th className="text-right py-2">HVR</th>
                      <th className="text-right py-2">Anomaly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={i} className="border-t border-stone-200">
                        <td className="py-1.5 font-mono">{c.customer_id}</td>
                        <td className="py-1.5">{c.segment}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.recency?.toFixed?.(0)} / {c.frequency} / {c.monetary?.toFixed?.(0)}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.clv_12months != null ? `$${c.clv_12months.toFixed(0)}` : '—'}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.hvr_probability != null ? `${(c.hvr_probability * 100).toFixed(0)}%` : '—'}</td>
                        <td className="py-1.5 text-right">{c.is_anomaly ? <span className="text-red-600">{c.anomaly_type || 'yes'}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}
    </div>
  )
}

// ---------- helpers ----------

const KPI = ({ label, value }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-4">
    <div className="text-xs uppercase tracking-wider text-stone-400">{label}</div>
    <div className="text-2xl font-semibold text-stone-800 mt-1 tabular-nums">{value}</div>
  </div>
)

const Card = ({ title, children }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-4">
    {title && <div className="text-sm font-semibold text-stone-700 mb-3">{title}</div>}
    {children}
  </div>
)

const Empty = ({ loading, text }) => (
  <div className="text-sm text-stone-400 py-6 text-center">
    {loading ? 'Loading…' : text}
  </div>
)

const SegmentBars = ({ dist }) => {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <ul className="space-y-1.5">
      {entries.map(([name, n]) => (
        <li key={name} className="text-xs flex items-center gap-3">
          <span className="w-32 truncate text-stone-700">{name}</span>
          <span className="flex-1 bg-stone-100 rounded h-3 overflow-hidden">
            <span className="block bg-teal-700/80 h-full" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-stone-500 tabular-nums w-10 text-right">{n}</span>
        </li>
      ))}
    </ul>
  )
}

const priorityColor = (p) => p === 1 ? '#ef4444' : p === 2 ? '#f59e0b' : '#9ca3af'

export default Intel
