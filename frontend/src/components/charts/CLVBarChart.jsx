import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { CLV_SEGMENT_COLORS } from "../../constants/segments"

export default function CLVBarChart({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <XAxis dataKey="segment" tick={{ fontSize: 11, fill: "#a1a1aa" }} />
        <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff" }}
          formatter={(value) => [`£${Math.round(value).toLocaleString()}`, "Avg CLV"]}
        />
        <Bar dataKey="avg_clv" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={CLV_SEGMENT_COLORS[entry.segment] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
