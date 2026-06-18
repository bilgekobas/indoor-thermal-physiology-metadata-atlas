import { useState, useCallback } from 'react'

// A lightweight, dependency-free tooltip that follows the cursor.
// Used by every custom chart (bars, heatmaps, matrices) so hovering
// consistently shows both the absolute count and the percentage.
export function useTooltip() {
  const [tip, setTip] = useState(null) // { x, y, content }

  const showTip = useCallback((e, content) => {
    setTip({ x: e.clientX, y: e.clientY, content })
  }, [])

  const moveTip = useCallback((e) => {
    setTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
  }, [])

  const hideTip = useCallback(() => setTip(null), [])

  return { tip, showTip, moveTip, hideTip }
}

export function TooltipPortal({ tip }) {
  if (!tip) return null
  return (
    <div
      className="fixed z-50 pointer-events-none font-data text-[11.5px] leading-snug bg-ink text-paper rounded-md px-2.5 py-1.5 shadow-lg max-w-[220px]"
      style={{ left: tip.x + 14, top: tip.y + 14 }}
    >
      {tip.content}
    </div>
  )
}

// Standard formatter: "n (pct%)" — used throughout for hover content
export function fmtCountPct(count, total) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return `${count} of ${total} · ${pct}%`
}
