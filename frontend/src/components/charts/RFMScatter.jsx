import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { SEGMENT_COLORS } from "../../constants/segments"

export default function RFMScatter({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  // Group by segment
  const grouped = data.reduce((acc, point) => {
    const seg = point.segment || "Unknown"
    if (!acc[seg]) acc[seg] = []
    acc[seg].push(point)
    return acc
  }, {})

  const segments = Object.keys(grouped)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <XAxis
          dataKey="recency"
          name="Recency"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          label={{ value: "Recency (days)", position: "insideBottom", offset: -5, fill: "#71717a", fontSize: 10 }}
        />
        <YAxis
          dataKey="monetary"
          name="Monetary"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff", fontSize: 11 }}
          formatter={(value, name) => name === "monetary" ? [`£${value.toLocaleString()}`, "Monetary"] : [`${value} days`, "Recency"]}
        />
        {segments.slice(0, 8).map((seg) => (
          <Scatter
            key={seg}
            name={seg}
            data={grouped[seg]}
            fill={SEGMENT_COLORS[seg] || "#6b7280"}
            opacity={0.7}
            r={3}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
