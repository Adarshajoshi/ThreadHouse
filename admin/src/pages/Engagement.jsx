import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

// Engagement view: most visited pages + most wishlisted products.
// Reporting only — this does NOT feed the ML segmentation pipeline.

const WINDOW_OPTIONS = [
  { label: 'Last 7 days',  value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

// Product images may be stored as absolute CDN URLs (seed data) or as
// backend-relative paths like "/static/images/foo.jpg". Resolve both.
const resolveImg = (src) => {
  if (!src) return null
  return /^https?:\/\//i.test(src) ? src : `${backendUrl}${src}`
}

const Engagement = ({ token }) => {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const r = await axios.get(
          `${backendUrl}/api/analytics/engagement?days=${days}&limit=10`,
          { headers: { Authorization: `Bearer ${token}`, token } }
        )
        if (!cancelled) setData(r.data)
      } catch (err) {
        if (!cancelled) toast.error('Failed to load engagement data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [token, days])

  const pages = data?.top_pages ?? []
  const items = data?.top_wishlisted ?? []
  const maxViews = pages.reduce((m, p) => Math.max(m, p.views), 0) || 1
  const maxNet   = items.reduce((m, i) => Math.max(m, i.net), 0) || 1

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Engagement</h1>
          <p className="text-sm text-stone-500">
            Most visited pages and most wishlisted products.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700"
        >
          {WINDOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Most visited pages */}
          <div className="border border-stone-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 uppercase tracking-wider">
              Most Visited Pages
            </h2>
            {pages.length === 0 ? (
              <p className="text-stone-400 text-sm">No page views in this window.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pages.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate text-stone-700 font-medium">
                        {p.page || '(unknown)'}
                      </span>
                      <span className="text-stone-500 tabular-nums ml-3">{p.views}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${(p.views / maxViews) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most wishlisted items */}
          <div className="border border-stone-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 uppercase tracking-wider">
              Most Wishlisted Items
            </h2>
            {items.length === 0 ? (
              <p className="text-stone-400 text-sm">No wishlist activity in this window.</p>
            ) : (
              <div className="flex flex-col divide-y divide-stone-100">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 text-stone-400 text-sm tabular-nums">{i + 1}</span>
                    {resolveImg(it.image) ? (
                      <img
                        src={resolveImg(it.image)}
                        alt={it.name}
                        className="w-10 h-10 rounded-md object-cover bg-stone-100"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-stone-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 font-medium truncate">{it.name}</p>
                      {it.price != null && (
                        <p className="text-xs text-stone-500">${it.price.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-stone-900 tabular-nums">
                        {it.net}
                      </p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                        wishlisted
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default Engagement
