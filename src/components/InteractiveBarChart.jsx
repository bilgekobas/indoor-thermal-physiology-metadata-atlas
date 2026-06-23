import { useTooltip, TooltipPortal, fmtCountPct } from './Tooltip.jsx'

// Horizontal frequency bar chart. When a total is supplied, bar length is
// relative to that denominator (not just the biggest visible bar), so the
// visual length and the printed percentage refer to the same quantity.
export default function InteractiveBarChart({ data, total, color = '#0A0A0A', maxBars = null, height = 22, unitLabel = 'studies' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const rows = maxBars ? data.slice(0, maxBars) : data
  const fallbackMax = rows.reduce((m, r) => (r.count > m ? r.count : m), 1)
  const denom = total && total > 0 ? total : fallbackMax

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 group">
            <span className="text-[12.5px] w-52 shrink-0 truncate" title={row.label}>
              {row.label}
            </span>
            <div
              className="flex-1 rounded bg-line/50 overflow-hidden cursor-default"
              style={{ height }}
              onMouseEnter={(e) => showTip(e, `${row.label}: ${fmtCountPct(row.count, total)}`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div
                className="h-full rounded transition-[width] duration-150 group-hover:brightness-110"
                style={{ width: `${Math.min(100, (row.count / Math.max(denom, 1)) * 100)}%`, background: color }}
              />
            </div>
            <span className="font-data text-[11.5px] w-16 text-right text-inkmid shrink-0">
              {row.count} ({total ? ((row.count / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        ))}
      </div>
      {total != null && (
        <div className="font-data text-[10.5px] text-inkfaint mt-2">
          Bar length relative to the total shown denominator. n = {total} {unitLabel} total; count and % of that total shown at right.
        </div>
      )}
      <TooltipPortal tip={tip} />
    </div>
  )
}
