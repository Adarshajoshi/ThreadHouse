import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function ProbAliveChart({ data }) {
  if (!data || !data.length) return <div className="text-zinc-500 text-sm p-4">No data available</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="probAliveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff", fontSize: 11 }}
          formatter={(value) => [value.toLocaleString(), "Customers"]}
        />
        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#probAliveGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
