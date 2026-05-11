import { useState, useEffect } from "react"
import { getOverview, getPlots, getInsights, getTopCustomers } from "../services/api"

export const useResults = (jobId) => {
    const [overview,     setOverview]     = useState(null)
    const [plots,        setPlots]        = useState(null)
    const [insights,     setInsights]     = useState(null)
    const [topCustomers, setTopCustomers] = useState(null)
    const [loading,      setLoading]      = useState(false)
    const [error,        setError]        = useState(null)

    useEffect(() => {
        if (!jobId) return

        const fetchAll = async () => {
            setLoading(true)
            setError(null)
            try {
                const [ov, pl, ins, top] = await Promise.all([
                    getOverview(jobId),
                    getPlots(jobId),
                    getInsights(jobId),
                    getTopCustomers(jobId, 10),
                ])
                setOverview(ov)
                setPlots(pl)
                setInsights(ins)
                setTopCustomers(top)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchAll()
    }, [jobId])

    // Helper: parse insight body by category
    const getInsightByCategory = (category) => {
        if (!insights) return null
        const insight = insights.insights.find(i => i.category === category)
        if (!insight) return null
        try {
            return JSON.parse(insight.body)
        } catch {
            return insight.body
        }
    }

    return {
        overview,
        plots,
        insights,
        topCustomers,
        loading,
        error,
        // Convenience helpers
        executiveSummary:   getInsightByCategory("executive_summary"),
        alerts:             getInsightByCategory("alerts"),
        recommendations:    getInsightByCategory("segment_recommendations"),
        anomalyInsights:    getInsightByCategory("anomaly_insights"),
    }
}
