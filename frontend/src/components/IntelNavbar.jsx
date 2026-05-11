import { Link, useLocation, useParams } from "react-router-dom"

export default function IntelNavbar() {
  const location = useLocation()
  const { jobId } = useParams()

  const links = jobId
    ? [
        { to: `/intel/dashboard/${jobId}`, label: "Dashboard" },
        { to: `/intel/customers/${jobId}`, label: "Customers" },
        { to: `/intel/insights/${jobId}`,  label: "Insights" },
      ]
    : []

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <Link to="/intel" className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-tight">Customer Intelligence</span>
          </Link>
          {links.length > 0 && <span className="text-zinc-700">/</span>}
          <div className="flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <Link
          to="/"
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          ← Back to Shop
        </Link>
      </div>
    </nav>
  )
}
