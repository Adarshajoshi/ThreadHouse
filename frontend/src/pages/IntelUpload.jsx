import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePipeline } from "../hooks/usePipeline"
import ProgressBar from "../components/ProgressBar"
import IntelNavbar from "../components/IntelNavbar"

export default function IntelUpload() {
  const { jobId, status, progress, error, upload, restore } = usePipeline()
  const navigate = useNavigate()
  const [dragOver, setDragOver] = useState(false)
  const [savedJobId, setSavedJobId] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem("last_job_id")
    if (saved) setSavedJobId(saved)
  }, [])

  useEffect(() => {
    if (status === "complete" && jobId) {
      navigate(`/intel/dashboard/${jobId}`)
    }
  }, [status, jobId, navigate])

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file (.csv only)")
      return
    }
    upload(file)
  }

  const handleFileChange = (e) => handleFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Topnav */}
      <nav className="border-b border-zinc-800 px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-sm tracking-tight">Customer Intelligence Engine</span>
        <a href="/" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">← Back to Shop</a>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 mb-4 px-3 py-1.5 border border-zinc-800 rounded-full">
            Powered by AI · RFM · BG/NBD · Qwen3
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Turn your transaction data<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #6366f1, #3b82f6, #10b981)" }}>
              into customer intelligence
            </span>
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Upload any transaction CSV. We'll automatically segment your customers, predict their lifetime value,
            detect anomalies, and generate AI-powered recommendations.
          </p>
        </div>

        {/* Saved session */}
        {savedJobId && status === "idle" && (
          <div className="mb-6 bg-blue-950 border border-blue-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200 font-medium">Previous analysis found</p>
              <p className="text-xs text-blue-400 font-mono">{savedJobId.slice(0, 8)}...</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/intel/dashboard/${savedJobId}`)}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                View Results
              </button>
              <button
                onClick={() => { localStorage.removeItem("last_job_id"); setSavedJobId(null) }}
                className="text-xs text-blue-400 hover:text-blue-200 px-2 py-1.5 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Upload zone */}
        {status === "idle" && (
          <label
            htmlFor="csv-upload"
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`block w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-blue-500 bg-blue-950/30"
                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900"
            }`}
          >
            <div className="text-4xl mb-4">📊</div>
            <p className="text-white font-semibold mb-1">Drop your CSV file here</p>
            <p className="text-zinc-500 text-sm mb-4">or click to browse</p>
            <span className="inline-block bg-white text-black text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors">
              Choose File
            </span>
            <p className="text-xs text-zinc-600 mt-4">Any transaction CSV format · Column names detected automatically</p>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}

        {/* Uploading */}
        {status === "uploading" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-300">Uploading your file…</p>
          </div>
        )}

        {/* Processing */}
        {status === "processing" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="mb-6">
              <ProgressBar progress={progress} />
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {["Schema Detection", "RFM Extraction", "ML Scoring", "AI Insights"].map((step, i) => (
                <div key={i} className={`text-xs py-2 rounded-lg ${progress > i * 25 ? "text-emerald-400 bg-emerald-950/50" : "text-zinc-600 bg-zinc-900"}`}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {status === "failed" && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-300 font-medium mb-2">Pipeline failed</p>
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Feature tiles */}
        {status === "idle" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { icon: "🎯", label: "10 Segments", desc: "Champions to Lost" },
              { icon: "💰", label: "CLV Forecast", desc: "12-month revenue" },
              { icon: "🔍", label: "Anomalies", desc: "Fraud & bulk buyers" },
              { icon: "🤖", label: "AI Q&A", desc: "Ask anything" },
            ].map((f, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
