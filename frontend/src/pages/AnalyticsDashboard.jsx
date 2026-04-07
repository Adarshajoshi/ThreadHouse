import React, { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const fmt = (n, suffix = '') => n == null ? '—' : `${Number(n).toLocaleString()}${suffix}`
const pct = (n) => n == null ? '—' : `${n}%`

function MiniBar({ value, max, color = '#e2e2e2' }) {
  const w = max ? Math.round((value / max) * 100) : 0
  return (
    <div className='w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden'>
      <div className='h-full rounded-full transition-all duration-700' style={{ width: `${w}%`, background: color }} />
    </div>
  )
}

function Sparkline({ data, color = '#fff' }) {
  if (!data || data.length < 2) return <div className='text-zinc-600 text-xs'>No data yet</div>
  const counts = data.map(d => d.count)
  const max = Math.max(...counts, 1)
  const W = 120, H = 36
  const pts = counts.map((c, i) => `${(i / (counts.length - 1)) * W},${H - (c / max) * H}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline fill='none' stroke={color} strokeWidth='1.5' strokeLinejoin='round' points={pts} />
    </svg>
  )
}

function StatCard({ label, value, sub, color = '#ffffff', sparkData }) {
  return (
    <div className='bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-3 hover:border-zinc-600 transition-colors duration-200'
      style={{ animation: 'fadeUp 0.4s ease both' }}>
      <p className='text-xs uppercase tracking-widest text-zinc-500'>{label}</p>
      <p className='text-3xl font-bold tracking-tight' style={{ color, fontFamily: "'DM Mono', monospace" }}>{value}</p>
      {sub && <p className='text-xs text-zinc-500'>{sub}</p>}
      {sparkData && <Sparkline data={sparkData} color={color} />}
    </div>
  )
}

function RankList({ title, data, color = '#a1a1aa' }) {
  if (!data || !Object.keys(data).length) return (
    <div className='bg-zinc-900 border border-zinc-800 p-5'>
      <p className='text-xs uppercase tracking-widest text-zinc-500 mb-4'>{title}</p>
      <p className='text-zinc-600 text-sm'>No data yet</p>
    </div>
  )
  const entries = Object.entries(data)
  const max = entries[0]?.[1] || 1
  return (
    <div className='bg-zinc-900 border border-zinc-800 p-5'>
      <p className='text-xs uppercase tracking-widest text-zinc-500 mb-4'>{title}</p>
      <div className='flex flex-col gap-3'>
        {entries.map(([name, count], i) => (
          <div key={name}>
            <div className='flex justify-between text-xs mb-1'>
              <span className='text-zinc-300 truncate max-w-[70%]'>{name}</span>
              <span style={{ color }} className='font-mono'>{count}</span>
            </div>
            <MiniBar value={count} max={max} color={color} />
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTypePills({ data }) {
  if (!data) return null
  const colors = {
    page_view: '#60a5fa', click: '#34d399', hover: '#a78bfa',
    product_view: '#fbbf24', add_to_cart: '#f87171', search: '#38bdf8',
    session_end: '#94a3b8', keypress: '#e879f9', checkout_start: '#fb923c', checkout_complete: '#4ade80',
  }
  return (
    <div className='bg-zinc-900 border border-zinc-800 p-5'>
      <p className='text-xs uppercase tracking-widest text-zinc-500 mb-4'>Events by Type</p>
      <div className='flex flex-wrap gap-2'>
        {Object.entries(data).map(([type, count]) => (
          <div key={type} className='flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-full'>
            <span className='w-2 h-2 rounded-full flex-shrink-0' style={{ background: colors[type] || '#71717a' }} />
            <span className='text-xs text-zinc-300'>{type}</span>
            <span className='text-xs font-mono ml-1' style={{ color: colors[type] || '#71717a' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/analytics/summary`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (e) {
      setError(`Could not connect to analytics server. Is it running at ${API_BASE}?`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchData, 15000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchData])

  return (
    <div className='min-h-screen bg-zinc-950 text-white pb-20' style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap' rel='stylesheet' />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1px; background:#18181b }
      `}</style>

      {/* Header */}
      <div className='border-b border-zinc-800 px-6 py-5 flex items-center justify-between sticky top-0 bg-zinc-950 z-10'>
        <div>
          <p className='text-xs uppercase tracking-widest text-zinc-500 mb-0.5'>ThreadHouse</p>
          <h1 className='text-lg font-semibold tracking-tight'>Analytics Dashboard</h1>
        </div>
        <div className='flex items-center gap-3'>
          {lastRefresh && (
            <p className='text-xs text-zinc-600 hidden sm:block'>
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`text-xs px-3 py-1.5 border rounded-full transition-colors cursor-pointer ${autoRefresh ? 'border-green-500 text-green-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
          >
            {autoRefresh ? '● Live' : 'Auto-refresh'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className='text-xs px-4 py-1.5 bg-white text-black font-medium hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50'
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className='mx-6 mt-6 bg-red-950 border border-red-800 px-5 py-4 text-sm text-red-300'>
          ⚠ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className='px-6 pt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-zinc-800'>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} className='bg-zinc-900 p-5 animate-pulse'>
              <div className='h-2 bg-zinc-800 rounded w-16 mb-4' />
              <div className='h-7 bg-zinc-800 rounded w-24' />
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className='px-6 pt-8 flex flex-col gap-6'>

          {/* Top KPI row */}
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-zinc-800'>
            <StatCard label='Total Events'     value={fmt(data.total_events)}           color='#ffffff' />
            <StatCard label='Sessions'         value={fmt(data.total_sessions)}          color='#60a5fa' />
            <StatCard label='Bounce Rate'      value={pct(data.bounce_rate)}             color={data.bounce_rate > 60 ? '#f87171' : '#34d399'}
              sub={data.bounce_rate > 60 ? 'High — consider improving content' : 'Healthy engagement'} />
            <StatCard label='Avg Session'      value={data.avg_session_duration_sec == null ? '—' : `${data.avg_session_duration_sec}s`}
              color='#a78bfa' sub='Time on site per visit' />
            <StatCard label='Conversion Rate'  value={pct(data.conversion_rate)}         color='#fbbf24'
              sub='Product views → add to cart' />
            <StatCard label='Cart Abandonment' value={pct(data.cart_abandonment_rate)}   color={data.cart_abandonment_rate > 70 ? '#f87171' : '#fb923c'}
              sub='Added to cart, never checked out' />
          </div>

          {/* Visitor + activity row */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800'>
            <StatCard label='New Visitors'       value={pct(data.new_visitor_rate)}       color='#38bdf8'  sub='First-time visitors' />
            <StatCard label='Returning Visitors' value={pct(data.returning_visitor_rate)} color='#818cf8'  sub='Came back again' />
            <StatCard label='Activity Trend'     value=''                                  sparkData={data.events_over_time} color='#34d399' />
          </div>

          {/* Event types */}
          <EventTypePills data={data.by_type} />

          {/* Product + page rows */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800'>
            <RankList title='Most Viewed Products'        data={data.top_products_viewed}          color='#fbbf24' />
            <RankList title='Most Added to Cart'          data={data.top_products_added_to_cart}   color='#f87171' />
            <RankList title='Top Pages'                   data={data.top_pages}                    color='#60a5fa' />
          </div>

          {/* Footer note */}
          <p className='text-xs text-zinc-700 text-center pt-4'>
            Data is stored in-memory — connect a database in production to persist across restarts.
          </p>
        </div>
      )}
    </div>
  )
}
