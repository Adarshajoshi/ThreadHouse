import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Session + identity
// ---------------------------------------------------------------------------
//
// session_id: stable per browser tab. Resets when the tab is closed.
// user_id:    pulled from localStorage `th_user` (set by ShopContext on login).
//             Re-read on every event so login/logout takes effect immediately.

const SESSION_ID = (() => {
  let id = sessionStorage.getItem('th_session')
  if (!id) {
    id = Math.random().toString(36).slice(2)
    sessionStorage.setItem('th_session', id)
  }
  return id
})()

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('th_user'))
    // Backend sends user_id on login response; ShopContext stores the whole user object.
    return u?.user_id ?? u?.id ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Low-level send (used by every helper)
// ---------------------------------------------------------------------------

async function sendEvent(payload) {
  try {
    await fetch(`${API_BASE}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:     SESSION_ID,
        user_id:        currentUserId(),
        timestamp:      new Date().toISOString(),
        page:           null,
        element:        null,
        value:          null,
        monetary_value: null,
        ...payload,
      }),
    })
  } catch {
    // analytics is best-effort; never break the UX
  }
}

// ---------------------------------------------------------------------------
// RFM-specific helpers
// ---------------------------------------------------------------------------
//
// These fire dedicated event_types so the backend (and the live dashboard)
// can distinguish browsing noise from purchase intent. They feed RFM via:
//   - Recency:  any of these events update "last seen / last bought"
//   - Frequency: count of purchase + add_to_cart events per user_id
//   - Monetary:  monetary_value field on purchase / cart events

export const trackProductView = (productId, price, page) =>
  sendEvent({
    event_type:     'product_view',
    element:        `product:${productId}`,
    value:          String(productId),
    monetary_value: typeof price === 'number' ? price : null,
    page:           page ?? window.location.pathname,
  })

export const trackAddToCart = (productId, price, size, page) =>
  sendEvent({
    event_type:     'add_to_cart',
    element:        `product:${productId}`,
    value:          [productId, size].filter(Boolean).join('|'),
    monetary_value: typeof price === 'number' ? price : null,
    page:           page ?? window.location.pathname,
  })

export const trackRemoveFromCart = (productId, page) =>
  sendEvent({
    event_type:     'remove_from_cart',
    element:        `product:${productId}`,
    value:          String(productId),
    page:           page ?? window.location.pathname,
  })

export const trackCheckoutStart = (cartTotal, itemCount, page) =>
  sendEvent({
    event_type:     'checkout_start',
    element:        'checkout',
    value:          String(itemCount ?? ''),
    monetary_value: typeof cartTotal === 'number' ? cartTotal : null,
    page:           page ?? window.location.pathname,
  })

export const trackPurchase = (orderId, total, itemCount, page) =>
  sendEvent({
    event_type:     'purchase',
    element:        `order:${orderId}`,
    value:          [orderId, itemCount].filter(Boolean).join('|'),
    monetary_value: typeof total === 'number' ? total : null,
    page:           page ?? window.location.pathname,
  })

export const trackLogin = (userId, page) =>
  sendEvent({
    event_type:     'login',
    element:        `user:${userId}`,
    value:          String(userId),
    page:           page ?? window.location.pathname,
  })

export const trackSignup = (userId, page) =>
  sendEvent({
    event_type:     'signup',
    element:        `user:${userId}`,
    value:          String(userId),
    page:           page ?? window.location.pathname,
  })

export const trackLogout = (page) =>
  sendEvent({
    event_type:     'logout',
    page:           page ?? window.location.pathname,
  })

export const trackSearch = (query, page) =>
  sendEvent({
    event_type:     'search',
    element:        'search_input',
    value:          query?.slice(0, 80) ?? null,
    page:           page ?? window.location.pathname,
  })

// Free-form fallback for ad-hoc events.
export const trackEvent = (event_type, fields = {}) =>
  sendEvent({ event_type, ...fields })

// ---------------------------------------------------------------------------
// Hook: passive page/click/hover/keypress/mouse-move tracking
// ---------------------------------------------------------------------------

export function useAnalytics() {
  const location = useLocation()
  const timers = useRef({})

  // Page view on every route change
  useEffect(() => {
    sendEvent({ event_type: 'page_view', page: location.pathname })
  }, [location.pathname])

  useEffect(() => {
    const page = location.pathname

    const onClick = (e) => {
      const el = e.target.closest('[data-track]')
      if (!el) return
      sendEvent({
        event_type: 'click',
        element:    el.dataset.track,
        value:      el.dataset.trackValue || el.innerText?.slice(0, 60) || null,
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
        element:    el.dataset.track,
        value:      el.dataset.trackValue || null,
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
          element:    el.dataset.track,
          value:      el.value?.slice(0, 60) || e.key,
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
        element:    el.dataset.track,
        value:      `${Math.round((e.clientX / window.innerWidth) * 100)}%,${Math.round((e.clientY / window.innerHeight) * 100)}%`,
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

  // Stable callable for ad-hoc tracking from any component.
  const track = useCallback((eventType, element, value = null, monetary_value = null) => {
    sendEvent({
      event_type:     eventType,
      element,
      value,
      monetary_value,
      page:           location.pathname,
    })
  }, [location.pathname])

  return {
    track,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackCheckoutStart,
    trackPurchase,
    trackLogin,
    trackSignup,
    trackLogout,
    trackSearch,
  }
}
