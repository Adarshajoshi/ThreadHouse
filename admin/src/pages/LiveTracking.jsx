import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const POLL_INTERVAL_MS = 5_000
const FEED_MAX_ROWS    = 100

const LiveTracking = ({ token }) => {
  const [snapshot, setSnapshot] = useState(null)
  const [segments, setSegments] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [feed,     setFeed]     = useState([])
  const [wsState,  setWsState]  = useState('connecting')
  const [windowMin, setWindowMin] = useState(5)
  const [detailUser, setDetailUser] = useState(null)
  const [detail, setDetail]         = useState(null)
  const [segFilter, setSegFilter]   = useState('')

  const wsRef = useRef(null)

  // Polling: snapshot + segments 
  useEffect(() => {
    let cancelled = false

    const fetchAll = async () => {
      try {
        const [liveRes, segRes] = await Promise.allSettled([
          axios.get(`${backendUrl}/api/analytics/live?minutes=${windowMin}`, {
            headers: { Authorization: `Bearer ${token}`, token },
          }),
          axios.get(`${backendUrl}/api/analytics/segments`, {
            headers: { Authorization: `Bearer ${token}`, token },
          }),
        ])
        if (cancelled) return
        if (liveRes.status === 'fulfilled') setSnapshot(liveRes.value.data)
        if (segRes.status  === 'fulfilled') setSegments(segRes.value.data)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          toast.error('Failed to load live data')
          setLoading(false)
        }
      }
    }

    fetchAll()
    const id = setInterval(fetchAll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [token, windowMin])

  // Drawer: load per-user detail when detailUser is set
  useEffect(() => {
    if (!detailUser) { setDetail(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const r = await axios.get(`${backendUrl}/api/analytics/customer/${detailUser}`, {
          headers: { Authorization: `Bearer ${token}`, token },
        })
        if (!cancelled) setDetail(r.data)
      } catch (err) {
        toast.error('Failed to load user detail')
        if (!cancelled) setDetailUser(null)
      }
    })()
    return () => { cancelled = true }
  }, [detailUser, token])

  // WebSocket: real-time event stream
  useEffect(() => {
    if (!token) return

    // Convert http://host -> ws://host (or https -> wss)
    const wsUrl = backendUrl.replace(/^http/, 'ws') + `/api/analytics/ws?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen    = () => setWsState('open')
    ws.onclose   = () => setWsState('closed')
    ws.onerror   = () => setWsState('closed')
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'event') {
          setFeed(prev => [{ ...msg.data, _at: Date.now() }, ...prev].slice(0, FEED_MAX_ROWS))
        }
      } catch {}
    }

    return () => { ws.close() }
  }, [token])

  // Render
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const eventsPerMinMax = Math.max(1, ...(snapshot?.events_per_minute?.map(p => p.count) ?? [0]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-800 flex items-center gap-3">
            Live Tracking
            <span className={`flex items-center gap-1.5 text-xs font-normal px-2.5 py-1 rounded-full ${
              wsState === 'open'
                ? 'bg-green-100 text-green-700'
                : wsState === 'connecting'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                wsState === 'open' ? 'bg-green-500 animate-pulse'
                : wsState === 'connecting' ? 'bg-yellow-500'
                : 'bg-red-500'
              }`} />
              {wsState === 'open' ? 'LIVE' : wsState === 'connecting' ? 'CONNECTING…' : 'OFFLINE'}
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Real-time stream and a {windowMin}-minute snapshot of customer activity.
          </p>
        </div>

        <select
          value={windowMin}
          onChange={e => setWindowMin(Number(e.target.value))}
          className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value={1}>Last 1 min</option>
          <option value={5}>Last 5 min</option>
          <option value={15}>Last 15 min</option>
          <option value={30}>Last 30 min</option>
          <option value={60}>Last 60 min</option>
        </select>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Active sessions"  value={snapshot?.active_sessions ?? 0} />
        <KPI label={`Events / ${windowMin}m`}     value={snapshot?.total_events ?? 0} />
        <KPI label="WS subscribers"   value={snapshot?.live_subscribers ?? 0} />
        <KPI label="Segmented users"  value={segments?.total_segmented_users ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events per minute (sparkbars) */}
        <Card title="Events per minute">
          {snapshot?.events_per_minute?.length
            ? (
              <div className="flex items-end gap-1 h-32">
                {snapshot.events_per_minute.map(p => (
                  <div
                    key={p.minute}
                    title={`${new Date(p.minute).toLocaleTimeString()} — ${p.count} events`}
                    className="flex-1 bg-teal-700/80 rounded-t hover:bg-teal-700 transition-colors"
                    style={{ height: `${(p.count / eventsPerMinMax) * 100}%` }}
                  />
                ))}
              </div>
            )
            : <div className="text-sm text-stone-400 py-6 text-center">No events in this window.</div>
          }
        </Card>

        {/* Top pages */}
        <Card title="Top pages">
          {snapshot?.top_pages?.length
            ? (
              <ul className="space-y-2">
                {snapshot.top_pages.map(row => (
                  <li key={row.page} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-stone-700 truncate">{row.page}</span>
                    <span className="text-stone-500 ml-2">{row.views}</span>
                  </li>
                ))}
              </ul>
            )
            : <div className="text-sm text-stone-400 py-6 text-center">No page views yet.</div>
          }
        </Card>

        {/* Segment distribution */}
        <Card title="RFM segments (all-time)">
          {segments?.segment_counts && Object.keys(segments.segment_counts).length
            ? (
              <ul className="space-y-2">
                {Object.entries(segments.segment_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, n]) => (
                    <li
                      key={name}
                      className={`flex items-center justify-between text-sm cursor-pointer rounded px-1 py-0.5 transition-colors ${segFilter === name ? 'bg-teal-50 text-teal-800 font-semibold' : 'hover:bg-stone-50 text-stone-700'}`}
                      onClick={() => setSegFilter(f => f === name ? '' : name)}
                    >
                      <span>{name}</span>
                      <span className="font-medium text-stone-800">{n}</span>
                    </li>
                  ))}
              </ul>
            )
            : <div className="text-sm text-stone-400 py-6 text-center">No segmented users yet.</div>
          }
        </Card>

        {/* Live feed (WebSocket) */}
        <Card title={`Live event feed (${feed.length})`}>
          {feed.length === 0
            ? <div className="text-sm text-stone-400 py-6 text-center">Waiting for events…</div>
            : (
              <div className="max-h-64 overflow-y-auto pr-1 -mr-1">
                <ul className="space-y-1.5">
                  {feed.map((ev, i) => (
                    <li key={i} className="flex items-center justify-between text-xs gap-2 px-2 py-1 hover:bg-white rounded">
                      <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${eventTypeColor(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                      <span className="text-stone-700 flex-1 truncate">
                        {ev.user_id ? <button onClick={() => setDetailUser(ev.user_id)} className="underline hover:text-teal-700">user {ev.user_id}</button> : `sess ${(ev.session_id || '').slice(0, 6)}`}
                        {ev.page ? ` · ${ev.page}` : ''}
                        {ev.value ? ` · ${ev.value.slice(0, 30)}` : ''}
                        {ev.monetary_value != null ? ` · $${ev.monetary_value}` : ''}
                      </span>
                      <span className="text-stone-400 whitespace-nowrap">
                        {new Date(ev.timestamp || ev._at).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
        </Card>
      </div>

      {/* Segmented users table */}
      {segments?.users?.length > 0 && (() => {
        const filtered = segFilter
          ? segments.users.filter(u => u.segment === segFilter)
          : segments.users
        const segmentNames = [...new Set(segments.users.map(u => u.segment))].sort()
        return (
          <Card title={`Segmented customers${segFilter ? ` — ${segFilter}` : ''} (${filtered.length})`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <select
                value={segFilter}
                onChange={e => setSegFilter(e.target.value)}
                className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">All segments ({segments.users.length})</option>
                {segmentNames.map(s => (
                  <option key={s} value={s}>{s} ({segments.segment_counts[s] ?? 0})</option>
                ))}
              </select>
              {segFilter && (
                <button
                  onClick={() => setSegFilter('')}
                  className="text-xs text-stone-500 hover:text-teal-700 underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-stone-400 uppercase tracking-wider sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2 pr-3">Customer</th>
                    <th className="text-left py-2 pr-3">Segment</th>
                    <th className="text-right py-2 pr-3">R / F / M</th>
                    <th className="text-right py-2 pr-3">Spent</th>
                    <th className="text-right py-2 pr-3">Orders</th>
                    <th className="text-right py-2">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr
                      key={u.user_id ?? i}
                      className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer"
                      onClick={() => setDetailUser(u.user_id)}
                    >
                      <td className="py-1.5 pr-3">
                        <div className="font-medium text-stone-800">{u.name || '(unnamed)'}</div>
                        <div className="text-stone-400 truncate max-w-[140px]">{u.email}</div>
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${segmentBadgeColor(u.segment)}`}>
                          {u.segment}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-stone-600">
                        {u.r} / {u.f} / {u.m}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-stone-800">
                        ${u.monetary.toFixed(2)}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-stone-600">
                        {u.frequency}
                      </td>
                      <td className="py-1.5 text-right text-stone-500 whitespace-nowrap">
                        {u.last_order_at ? new Date(u.last_order_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })()}

      {/* Recent events from snapshot (covers events that arrived before we connected) */}
      <Card title="Recent events (snapshot)">
        {snapshot?.recent_events?.length
          ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-stone-400 uppercase tracking-wider">
                  <tr>
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Session</th>
                    <th className="text-left py-2">Page</th>
                    <th className="text-left py-2">Element</th>
                    <th className="text-left py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recent_events.slice(0, 25).map((ev, i) => (
                    <tr key={i} className="border-t border-stone-200">
                      <td className="py-1.5 text-stone-500">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                      <td className="py-1.5"><span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${eventTypeColor(ev.event_type)}`}>{ev.event_type}</span></td>
                      <td className="py-1.5 font-mono text-stone-600">{(ev.session_id || '').slice(0, 8)}</td>
                      <td className="py-1.5 text-stone-600">{ev.page || '—'}</td>
                      <td className="py-1.5 text-stone-600">{ev.element || '—'}</td>
                      <td className="py-1.5 text-stone-600 truncate max-w-[160px]">{ev.value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : <div className="text-sm text-stone-400 py-6 text-center">No recent events.</div>
        }
      </Card>

      {detailUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex justify-end" onClick={() => setDetailUser(null)}>
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-800">Customer detail</h3>
                {detail?.user && (
                  <p className="text-sm text-stone-500">
                    {detail.user.name || '(unnamed)'} · {detail.user.email}
                    {detail.user.role === 'admin' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">admin</span>}
                  </p>
                )}
              </div>
              <button onClick={() => setDetailUser(null)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
            </div>

            {!detail
              ? <div className="text-sm text-stone-400 py-12 text-center">Loading…</div>
              : <>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <KPI label="Orders"   value={detail.stats.order_count} />
                  <KPI label="Spent"    value={`$${detail.stats.total_spent.toLocaleString()}`} />
                  <KPI label="Events"   value={detail.stats.event_count} />
                </div>

                <Card title={`Orders (${detail.orders.length})`}>
                  {detail.orders.length === 0
                    ? <Empty loading={false} text="No orders yet." />
                    : <ul className="space-y-1.5 text-xs">
                        {detail.orders.map(o => (
                          <li key={o.order_id} className="flex justify-between border-b border-stone-100 pb-1.5">
                            <span className="font-mono text-stone-700">{o.order_id}</span>
                            <span className="text-stone-500">{o.status}</span>
                            <span className="font-medium text-stone-800">${o.total}</span>
                          </li>
                        ))}
                      </ul>
                  }
                </Card>

                <div className="mt-5"><Card title={`Recent events (${detail.events.length})`}>
                  {detail.events.length === 0
                    ? <Empty loading={false} text="No events." />
                    : <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1 -mr-1">
                        {detail.events.map((e, i) => (
                          <li key={i} className="flex items-center justify-between text-xs gap-2">
                            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${eventTypeColor(e.event_type)}`}>{e.event_type}</span>
                            <span className="flex-1 text-stone-700 truncate">{e.page || ''} {e.value ? '· ' + e.value.slice(0, 30) : ''}</span>
                            <span className="text-stone-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</span>
                          </li>
                        ))}
                      </ul>
                  }
                </Card></div>
              </>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- small helpers ----------

const KPI = ({ label, value }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-4">
    <div className="text-xs uppercase tracking-wider text-stone-400">{label}</div>
    <div className="text-2xl font-semibold text-stone-800 mt-1 tabular-nums">{value}</div>
  </div>
)

const Card = ({ title, children }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-4">
    <div className="text-sm font-semibold text-stone-700 mb-3">{title}</div>
    {children}
  </div>
)

const segmentBadgeColor = (seg) => {
  switch (seg) {
    case 'Champions':         return 'bg-green-100 text-green-800'
    case 'Loyal Customers':   return 'bg-emerald-100 text-emerald-800'
    case 'Potential Loyalists': return 'bg-teal-100 text-teal-800'
    case 'New Customers':     return 'bg-sky-100 text-sky-800'
    case 'Promising':         return 'bg-blue-100 text-blue-800'
    case 'Need Attention':    return 'bg-amber-100 text-amber-800'
    case 'About to Sleep':    return 'bg-orange-100 text-orange-800'
    case 'At Risk':           return 'bg-red-100 text-red-700'
    case 'Cant Lose Them':    return 'bg-rose-100 text-rose-800'
    case 'Hibernating':       return 'bg-stone-100 text-stone-600'
    case 'Lost':              return 'bg-stone-200 text-stone-500'
    default:                  return 'bg-stone-100 text-stone-600'
  }
}

const eventTypeColor = (t) => {
  switch (t) {
    case 'purchase':       return 'bg-green-100 text-green-700'
    case 'add_to_cart':    return 'bg-emerald-100 text-emerald-700'
    case 'checkout_start': return 'bg-blue-100 text-blue-700'
    case 'login':
    case 'signup':         return 'bg-indigo-100 text-indigo-700'
    case 'logout':         return 'bg-stone-100 text-stone-600 '
    case 'product_view':   return 'bg-amber-100 text-amber-700'
    case 'search':         return 'bg-purple-100 text-purple-700'
    case 'page_view':      return 'bg-sky-100 text-sky-700'
    case 'click':          return 'bg-pink-100 text-pink-700'
    default:               return 'bg-stone-100 text-stone-600 '
  }
}

export default LiveTracking
