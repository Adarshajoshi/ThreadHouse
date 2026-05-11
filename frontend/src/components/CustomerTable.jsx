import { SEGMENT_COLORS, ANOMALY_COLORS } from "../constants/segments"

export default function CustomerTable({ customers, loading }) {
  if (loading) return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
      ))}
    </div>
  )

  if (!customers || !customers.length) return (
    <p className="text-zinc-500 text-sm py-6 text-center">No customers found.</p>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">Customer ID</th>
            <th className="text-left px-4 py-3 font-medium">Segment</th>
            <th className="text-right px-4 py-3 font-medium">Recency</th>
            <th className="text-right px-4 py-3 font-medium">Frequency</th>
            <th className="text-right px-4 py-3 font-medium">Monetary</th>
            <th className="text-right px-4 py-3 font-medium">CLV 12mo</th>
            <th className="text-right px-4 py-3 font-medium">HVR Score</th>
            <th className="text-left px-4 py-3 font-medium">Anomaly</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => (
            <tr
              key={c.customer_id}
              className={`border-t border-zinc-800 hover:bg-zinc-900 transition-colors ${i % 2 === 0 ? "bg-zinc-950" : "bg-black"}`}
            >
              <td className="px-4 py-3 font-mono text-zinc-300">{c.customer_id}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    color: SEGMENT_COLORS[c.segment] || "#6b7280",
                    background: `${SEGMENT_COLORS[c.segment] || "#6b7280"}22`
                  }}
                >
                  {c.segment}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-zinc-400 font-mono">{c.recency?.toFixed(0)}d</td>
              <td className="px-4 py-3 text-right text-zinc-400 font-mono">{c.frequency}</td>
              <td className="px-4 py-3 text-right text-zinc-300 font-mono">£{c.monetary?.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                {c.clv_12months ? `£${Math.round(c.clv_12months).toLocaleString()}` : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                <span className={c.hvr_probability > 0.6 ? "text-emerald-400" : c.hvr_probability > 0.3 ? "text-amber-400" : "text-zinc-500"}>
                  {c.hvr_probability ? `${(c.hvr_probability * 100).toFixed(0)}%` : "—"}
                </span>
              </td>
              <td className="px-4 py-3">
                {c.is_anomaly ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      color: ANOMALY_COLORS[c.anomaly_type] || "#6b7280",
                      background: `${ANOMALY_COLORS[c.anomaly_type] || "#6b7280"}22`
                    }}
                  >
                    {c.anomaly_type}
                  </span>
                ) : (
                  <span className="text-zinc-600 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
