import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ANOMALY_COLORS } from "../../constants/segments"

export default function AnomalyPieChart({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="type"
          cx="50%"
          cy="50%"
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={ANOMALY_COLORS[entry.type] || "#6b7280"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff", fontSize: 11 }}
          formatter={(value, name) => [value.toLocaleString(), name]}
        />
        <Legend
          formatter={(value) => <span style={{ color: "#a1a1aa", fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
