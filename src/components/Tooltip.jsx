import { useState, useCallback } from 'react'
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
