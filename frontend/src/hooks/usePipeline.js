import { useState, useCallback, useRef } from "react"
import { uploadDataset, getJobStatus } from "../services/api"

export const usePipeline = () => {
    const [jobId,    setJobId]    = useState(null)
    const [status,   setStatus]   = useState("idle")
    const [progress, setProgress] = useState(0)
    const [error,    setError]    = useState(null)
    const [jobInfo,  setJobInfo]  = useState(null)
    const pollRef = useRef(null)

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }

    const upload = useCallback(async (file) => {
        try {
            setStatus("uploading")
            setError(null)
            setProgress(0)

            const { job_id } = await uploadDataset(file)
            setJobId(job_id)
            setStatus("processing")

            // Save to localStorage so user can return after refresh
            localStorage.setItem("last_job_id", job_id)

            pollRef.current = setInterval(async () => {
                try {
                    const data = await getJobStatus(job_id)
                    setJobInfo(data)
                    setProgress(data.pipeline_progress || 0)

                    if (data.status === "complete") {
                        stopPolling()
                        setStatus("complete")
                        setProgress(100)
                    }

                    if (data.status === "failed") {
                        stopPolling()
                        setStatus("failed")
                        setError(data.error_message || "Pipeline failed")
                    }

                } catch (err) {
                    stopPolling()
                    setStatus("failed")
                    setError(err.message)
                }
            }, 3000)

        } catch (err) {
            setStatus("failed")
            setError(err.message)
        }
    }, [])

    const reset = useCallback(() => {
        stopPolling()
        setJobId(null)
        setStatus("idle")
        setProgress(0)
        setError(null)
        setJobInfo(null)
        localStorage.removeItem("last_job_id")
    }, [])

    // Restore from localStorage on page load
    const restore = useCallback((job_id) => {
        setJobId(job_id)
        setStatus("complete")
        setProgress(100)
    }, [])

    return { jobId, status, progress, error, jobInfo, upload, reset, restore }
}
