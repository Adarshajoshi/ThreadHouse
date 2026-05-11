import { ALERT_PRIORITY_COLORS } from "../constants/segments"

export default function AlertBanner({ alerts }) {
  if (!Array.isArray(alerts) || !alerts.length) return null

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.slice(0, 3).map((alert, i) => (
        <div
          key={i}
          className="flex items-start gap-4 bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4"
          style={{ borderLeftColor: ALERT_PRIORITY_COLORS[alert.priority] || "#6b7280", borderLeftWidth: 3 }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  color: ALERT_PRIORITY_COLORS[alert.priority] || "#6b7280",
                  background: `${ALERT_PRIORITY_COLORS[alert.priority] || "#6b7280"}22`
                }}
              >
                {alert.priority}
              </span>
              <span className="text-sm font-semibold text-white">{alert.title}</span>
            </div>
            <p className="text-xs text-zinc-400">{alert.metric}</p>
          </div>
          <p className="text-xs text-zinc-300 italic text-right max-w-xs">{alert.action}</p>
        </div>
      ))}
    </div>
  )
}
