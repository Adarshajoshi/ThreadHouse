import { useParams } from "react-router-dom"
import { useResults } from "../hooks/useResults"
import IntelNavbar from "../components/IntelNavbar"
import LoadingSpinner from "../components/LoadingSpinner"
import SegmentCard from "../components/SegmentCard"
import QueryBox from "../components/QueryBox"
import AlertBanner from "../components/AlertBanner"

export default function IntelInsights() {
  const { jobId } = useParams()
  const {
    executiveSummary,
    alerts,
    recommendations,
    anomalyInsights,
    loading,
    error
  } = useResults(jobId)

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <IntelNavbar />
      <LoadingSpinner message="Loading insights…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <IntelNavbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-red-950 border border-red-800 rounded-xl px-5 py-4 text-red-300">{error}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <IntelNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Priority Alerts */}
        {Array.isArray(alerts) && alerts.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Priority Alerts</p>
            <AlertBanner alerts={alerts} />
          </section>
        )}

        {/* Executive Summary */}
        {executiveSummary && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Executive Summary</p>
            <p className="text-zinc-200 leading-relaxed">{executiveSummary}</p>
          </section>
        )}

        {/* Segment Recommendations */}
        {recommendations && typeof recommendations === "object" && (
          <section>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Segment Recommendations</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(recommendations).map(([segment, rec]) => (
                <SegmentCard key={segment} segment={segment} rec={rec} />
              ))}
            </div>
          </section>
        )}

        {/* Anomaly Report */}
        {anomalyInsights && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Anomaly Report</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{anomalyInsights}</p>
          </section>
        )}

        {/* Q&A */}
        <section>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Ask Your Data</p>
          <QueryBox jobId={jobId} />
        </section>
      </div>
    </div>
  )
}
