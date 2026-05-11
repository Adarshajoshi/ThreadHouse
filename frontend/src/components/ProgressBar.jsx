const PIPELINE_STAGES = [
  { min: 0,  max: 10,  label: "Uploading file..." },
  { min: 10, max: 25,  label: "Detecting CSV schema..." },
  { min: 25, max: 45,  label: "Extracting RFM features..." },
  { min: 45, max: 60,  label: "Segmenting customers..." },
  { min: 60, max: 72,  label: "Running HVR prediction..." },
  { min: 72, max: 85,  label: "Computing CLV (12-month)..." },
  { min: 85, max: 92,  label: "Detecting anomalies..." },
  { min: 92, max: 100, label: "Generating AI insights..." },
]

export default function ProgressBar({ progress = 0 }) {
  const stage = PIPELINE_STAGES.find(s => progress >= s.min && progress < s.max)
    || PIPELINE_STAGES[PIPELINE_STAGES.length - 1]

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-zinc-300">{progress === 100 ? "Analysis complete!" : stage.label}</p>
        <span className="text-sm font-mono text-zinc-400">{progress}%</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #3b82f6, #10b981)"
          }}
        />
      </div>
      {progress < 100 && progress > 0 && (
        <p className="text-xs text-zinc-600 mt-2">
          Large datasets (500k+ rows) take 2–3 minutes — please don't close this tab
        </p>
      )}
    </div>
  )
}
