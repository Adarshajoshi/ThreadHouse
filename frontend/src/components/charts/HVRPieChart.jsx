import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { HVR_COLORS } from "../../constants/segments"

export default function HVRPieChart({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="potential"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={HVR_COLORS[entry.potential] || "#6b7280"} />
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
