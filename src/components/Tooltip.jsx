import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function useTooltip() {
  const [tip, setTip] = useState(null)

  const showTip = useCallback((e, content) => {
    setTip({ x: e.clientX, y: e.clientY, content })
  }, [])

  const moveTip = useCallback((e) => {
    setTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
  }, [])

  const hideTip = useCallback(() => setTip(null), [])

  // Safety net: onMouseLeave doesn't fire if the hovered element unmounts
  // first (e.g. clicking a toggle/tab re-renders the row/cell mid-hover),
  // which otherwise leaves the tooltip stuck on screen indefinitely.
  // setTip(null) is a cheap no-op re-render when already null, so these
  // listeners can just stay registered for the component's lifetime rather
  // than being tied to tip state (which changes on every mouse move).
  useEffect(() => {
    const clear = () => setTip(null)
    const clearIfLeftWindow = (e) => { if (!e.relatedTarget) clear() }
    window.addEventListener('mousedown', clear, true)
    window.addEventListener('scroll', clear, true)
    window.addEventListener('blur', clear)
    window.addEventListener('mouseout', clearIfLeftWindow)
    return () => {
      window.removeEventListener('mousedown', clear, true)
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('blur', clear)
      window.removeEventListener('mouseout', clearIfLeftWindow)
    }
  }, [])

  return { tip, showTip, moveTip, hideTip }
}

// Renders into document.body via portal so it is never clipped by
// overflow:hidden parents (matrix tables, scroll containers, etc.)
export function TooltipPortal({ tip }) {
  if (!tip) return null
  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none font-data text-[11.5px] leading-snug bg-ink text-paper rounded-md px-2.5 py-1.5 shadow-lg max-w-[240px]"
      style={{ left: tip.x + 14, top: tip.y + 14 }}
    >
      {tip.content}
    </div>,
    document.body
  )
}

export function fmtCountPct(count, total) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return `${count} of ${total} · ${pct}%`
}
