import React, { useEffect, useState } from 'react'
import { backendUrl } from '../App'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const STATUS_OPTIONS = [
  'Order Placed',
  'Packing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
]

const STATUS_COLORS = {
  'Order Placed':    'bg-blue-100 text-blue-700',
  'Packing':         'bg-yellow-100 text-yellow-700',
  'Shipped':         'bg-purple-100 text-purple-700',
  'Out for Delivery':'bg-orange-100 text-orange-700',
  'Delivered':       'bg-green-100 text-green-700',
}

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        backendUrl + '/api/order/list',
        {},
        { headers: { token } }
      )
      if (response.data.success) {
        // Newest first
        const sorted = [...(response.data.orders || [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )
        setOrders(sorted)
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      const response = await axios.post(
        backendUrl + '/api/order/status',
        { orderId, status: newStatus },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success('Status updated')
        setOrders(prev =>
          prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o)
        )
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = filterStatus === 'All'
    ? orders
    : orders.filter(o => o.status === filterStatus)

  const totalRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.amount || o.total || 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">
            Orders <span className="text-sm font-normal text-stone-400 ml-1">({orders.length})</span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Revenue (delivered): <span className="font-semibold text-stone-700">${totalRevenue.toLocaleString()}</span>
          </p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {['All', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'border-stone-300 text-stone-600 hover:border-teal-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={fetchOrders}
        className="text-xs text-stone-500 hover:text-teal-800 mb-4 underline transition-colors"
      >
        ↻ Refresh orders
      </button>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          No orders found{filterStatus !== 'All' ? ` with status "${filterStatus}"` : ''}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(order => (
            <div
              key={order._id}
              className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">

                {/* Parcel icon */}
                <div className="flex-shrink-0">
                  <img src={assets.parcel_icon} alt="" className="w-10 h-10 opacity-60" />
                </div>

                {/* Items */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(order.items || []).map((item, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {item.name} × {item.quantity}
                        {item.size ? ` (${item.size})` : ''}
                        {i < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Delivery info */}
                  {order.address && (
                    <p className="text-xs text-stone-500">
                      {[order.address.firstName, order.address.lastName].filter(Boolean).join(' ')}
                      {order.address.street ? ` · ${order.address.street}` : ''}
                      {order.address.city ? `, ${order.address.city}` : ''}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-stone-400">
                    <span>Items: {(order.items || []).length}</span>
                    <span>Payment: {order.paymentMethod || '—'}</span>
                    <span>
                      {order.date
                        ? new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                    <span className="font-semibold text-stone-700 text-sm">
                      ${(order.amount || order.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Status badge + selector */}
                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-stone-100 text-stone-600 '}`}>
                    {order.status || 'Order Placed'}
                  </span>
                  <select
                    value={order.status || 'Order Placed'}
                    onChange={e => handleStatusChange(order._id, e.target.value)}
                    disabled={updatingId === order._id}
                    className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 outline-none focus:border-teal-600 bg-white cursor-pointer disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders
