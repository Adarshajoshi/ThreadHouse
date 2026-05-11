import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function HistogramChart({ data, dataKey = "count", xKey = "range", color = "#6366f1", label = "Count" }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff", fontSize: 11 }}
          formatter={(value) => [value.toLocaleString(), label]}
        />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}
