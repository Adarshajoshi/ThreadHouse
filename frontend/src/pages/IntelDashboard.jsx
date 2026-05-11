import { useParams, Link } from "react-router-dom"
import { useResults } from "../hooks/useResults"
import IntelNavbar from "../components/IntelNavbar"
import IntelStatCard from "../components/IntelStatCard"
import AlertBanner from "../components/AlertBanner"
import LoadingSpinner from "../components/LoadingSpinner"
import SegmentBarChart from "../components/charts/SegmentBarChart"
import CLVBarChart from "../components/charts/CLVBarChart"
import RFMScatter from "../components/charts/RFMScatter"
import AnomalyPieChart from "../components/charts/AnomalyPieChart"
import HistogramChart from "../components/charts/HistogramChart"
import HVRPieChart from "../components/charts/HVRPieChart"
import ProbAliveChart from "../components/charts/ProbAliveChart"
import { SEGMENT_COLORS } from "../constants/segments"

function ChartCard({ title, children, span = "" }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${span}`}>
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function IntelDashboard() {
  const { jobId } = useParams()
  const {
    overview,
    plots,
    alerts,
    executiveSummary,
    topCustomers,
    loading,
    error
  } = useResults(jobId)

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <IntelNavbar />
      <LoadingSpinner message="Fetching analysis results…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <IntelNavbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-red-950 border border-red-800 rounded-xl px-5 py-4 text-red-300">
          {error}
        </div>
      </div>
    </div>
  )

  if (!overview) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <IntelNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Alerts */}
        <AlertBanner alerts={alerts} />

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <IntelStatCard
            label="Total Customers"
            value={overview.total_customers.toLocaleString()}
            icon="👥"
          />
          <IntelStatCard
            label="Total Revenue"
            value={`£${overview.total_revenue.toLocaleString()}`}
            color="#10b981"
            icon="💷"
          />
          <IntelStatCard
            label="Avg CLV (12mo)"
            value={overview.avg_clv_12months ? `£${Math.round(overview.avg_clv_12months).toLocaleString()}` : "—"}
            color="#3b82f6"
            icon="📈"
          />
          <IntelStatCard
            label="Anomalies"
            value={overview.total_anomalies.toLocaleString()}
            color={overview.total_anomalies > 100 ? "#ef4444" : "#f59e0b"}
            sub="Flagged for review"
            icon="🚨"
          />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">

          <ChartCard title="Customer Segments" span="xl:col-span-2">
            <SegmentBarChart data={plots?.segment_distribution} />
          </ChartCard>

          <ChartCard title="Anomaly Breakdown">
            <AnomalyPieChart data={plots?.anomaly_breakdown} />
          </ChartCard>

          <ChartCard title="CLV by Tier">
            <CLVBarChart data={plots?.clv_by_segment} />
          </ChartCard>

          <ChartCard title="HVR Potential">
            <HVRPieChart data={plots?.hvr_potential} />
          </ChartCard>

          <ChartCard title="Probability Alive Distribution">
            <ProbAliveChart data={plots?.prob_alive_distribution} />
          </ChartCard>

          <ChartCard title="RFM Scatter (Recency vs Monetary)" span="lg:col-span-2">
            <RFMScatter data={plots?.rfm_scatter} />
          </ChartCard>

          <ChartCard title="Monetary Distribution">
            <HistogramChart data={plots?.monetary_distribution} color="#10b981" label="Customers" />
          </ChartCard>

          <ChartCard title="Purchase Frequency Distribution">
            <HistogramChart data={plots?.frequency_distribution} color="#6366f1" label="Customers" />
          </ChartCard>

          <ChartCard title="CLV Distribution">
            <HistogramChart data={plots?.clv_distribution} color="#f59e0b" label="Customers" />
          </ChartCard>
        </div>

        {/* Executive summary */}
        {executiveSummary && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Executive Summary</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{executiveSummary}</p>
          </div>
        )}

        {/* Top customers */}
        {topCustomers && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Top 10 Customers by CLV</p>
              <Link
                to={`/intel/customers/${jobId}`}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                    <th className="text-left px-5 py-3 font-medium">Customer ID</th>
                    <th className="text-left px-5 py-3 font-medium">Segment</th>
                    <th className="text-right px-5 py-3 font-medium">Total Spend</th>
                    <th className="text-right px-5 py-3 font-medium">CLV 12mo</th>
                    <th className="text-right px-5 py-3 font-medium">Prob. Alive</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.top_customers.map((c, i) => (
                    <tr key={c.customer_id} className="border-t border-zinc-800 hover:bg-zinc-800 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-300">#{c.customer_id}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            color: SEGMENT_COLORS[c.segment] || "#6b7280",
                            background: `${SEGMENT_COLORS[c.segment] || "#6b7280"}22`
                          }}
                        >
                          {c.segment}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-zinc-400">£{c.monetary?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400">
                        {c.clv_12months ? `£${Math.round(c.clv_12months).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        <span className={c.prob_alive > 0.7 ? "text-emerald-400" : c.prob_alive > 0.4 ? "text-amber-400" : "text-red-400"}>
                          {(c.prob_alive * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
