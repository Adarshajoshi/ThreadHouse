import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SESSION_ID = (() => {
  let id = sessionStorage.getItem('th_session')
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem('th_session', id) }
  return id
})()

async function sendEvent(payload) {
  try {
    await fetch(`${API_BASE}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        session_id: SESSION_ID,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
  }
}

export function useAnalytics() {
  const location = useLocation()
  const timers = useRef({})

  // Page view on every route change
  useEffect(() => {
    sendEvent({ event_type: 'page_view', page: location.pathname, element: null, value: null })
  }, [location.pathname])

  useEffect(() => {
    const page = location.pathname

    const onClick = (e) => {
      const el = e.target.closest('[data-track]')
      if (!el) return
      sendEvent({
        event_type: 'click',
        element: el.dataset.track,
        value: el.dataset.trackValue || el.innerText?.slice(0, 60) || null,
        page,
      })
    }

    const onHover = (e) => {
      const el = e.target.closest('[data-track]')
      if (!el) return
      const key = `hover_${el.dataset.track}`
      if (timers.current[key]) return
      timers.current[key] = true
      setTimeout(() => delete timers.current[key], 1500)
      sendEvent({
        event_type: 'hover',
        element: el.dataset.track,
        value: el.dataset.trackValue || null,
        page,
      })
    }

    const onKeyup = (e) => {
      const el = e.target.closest('[data-track]')
      if (!el) return
      const key = `key_${el.dataset.track}`
      clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => {
        sendEvent({
          event_type: 'keypress',
          element: el.dataset.track,
          value: el.value?.slice(0, 60) || e.key,
          page,
        })
      }, 600)
    }

    // Throttled mouse position tracking
    let lastMouseSent = 0
    const onMouseMove = (e) => {
      const now = Date.now()
      if (now - lastMouseSent < 3000) return
      lastMouseSent = now
      const el = e.target.closest('[data-track]')
      if (!el) return
      sendEvent({
        event_type: 'mouse_move',
        element: el.dataset.track,
        value: `${Math.round((e.clientX / window.innerWidth) * 100)}%,${Math.round((e.clientY / window.innerHeight) * 100)}%`,
        page,
      })
    }

    document.addEventListener('click', onClick)
    document.addEventListener('mouseenter', onHover, true)
    document.addEventListener('keyup', onKeyup)
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('mouseenter', onHover, true)
      document.removeEventListener('keyup', onKeyup)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [location.pathname])

  const track = useCallback((eventType, element, value = null) => {
    sendEvent({ event_type: eventType, element, value, page: location.pathname })
  }, [location.pathname])

  return { track }
}
