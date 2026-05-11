export default function IntelStatCard({ label, value, sub, color = "#ffffff", icon }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-2 hover:border-zinc-600 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
        {icon && <span className="text-zinc-600 text-lg">{icon}</span>}
      </div>
      <p className="text-2xl font-bold tracking-tight font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
