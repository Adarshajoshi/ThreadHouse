import { useState } from "react"
import { queryInsights } from "../services/api"
import { SAMPLE_QUESTIONS } from "../constants/segments"

export default function QueryBox({ jobId }) {
  const [question, setQuestion] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [querying, setQuerying] = useState(false)
  const chatRef = { current: null }

  const handleQuery = async (q) => {
    const text = (q || question).trim()
    if (!text) return
    setQuestion("")
    setQuerying(true)
    setChatHistory(prev => [...prev, { role: "user", content: text }])
    try {
      const { answer } = await queryInsights(jobId, text)
      setChatHistory(prev => [...prev, { role: "assistant", content: answer }])
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "error", content: err.message }])
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
      {/* Chat area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 400 }}>
        {chatHistory.length === 0 && (
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm mb-4">Ask anything about your customer data</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SAMPLE_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuery(q)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-full transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-white text-black rounded-br-sm"
                  : msg.role === "error"
                  ? "bg-red-950 border border-red-800 text-red-300"
                  : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {querying && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 0.15, 0.3].map((delay, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleQuery()}
          placeholder="Which customers should I target for Black Friday?"
          disabled={querying}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleQuery()}
          disabled={querying || !question.trim()}
          className="bg-white text-black text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
