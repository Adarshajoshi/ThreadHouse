import { SEGMENT_COLORS, ALERT_PRIORITY_COLORS } from "../constants/segments"

export default function SegmentCard({ segment, rec }) {
  if (!rec) return null
  const color = SEGMENT_COLORS[segment] || "#6b7280"
  const priorityColor = ALERT_PRIORITY_COLORS[rec.priority] || "#6b7280"

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white text-sm">{segment}</h3>
        <span
          className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color: priorityColor, background: `${priorityColor}22` }}
        >
          {rec.priority}
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-3">{rec.description}</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <span className="text-xs text-zinc-500 w-14 flex-shrink-0">Action</span>
          <span className="text-xs text-zinc-300">{rec.action}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-zinc-500 w-14 flex-shrink-0">Campaign</span>
          <span className="text-xs text-zinc-300">{rec.campaign}</span>
        </div>
      </div>
    </div>
  )
}
