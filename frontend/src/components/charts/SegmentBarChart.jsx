import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { SEGMENT_COLORS } from "../../constants/segments"

export default function SegmentBarChart({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
        <XAxis
          dataKey="segment"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff" }}
          formatter={(value) => [value.toLocaleString(), "Customers"]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={SEGMENT_COLORS[entry.segment] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
