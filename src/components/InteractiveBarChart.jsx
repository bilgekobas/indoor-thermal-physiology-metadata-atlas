import { useTooltip, TooltipPortal, fmtCountPct } from './Tooltip.jsx'

// Horizontal frequency bar chart, used throughout the site for "how many
// studies report/use X" questions. Bar length is always count of studies,
// relative to the largest bar shown (not to 100%) — `total` is stated
// directly under the chart so the denominator is visible without hovering,
// and every bar also shows its raw count at the end of the row.
export default function InteractiveBarChart({ data, total, color = '#31393C', maxBars = null, height = 22, unitLabel = 'studies' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const rows = maxBars ? data.slice(0, maxBars) : data
  // Bug fix: use reduce instead of Math.max(...spread) to avoid call-stack limit
  const max = rows.reduce((m, r) => (r.count > m ? r.count : m), 1)

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 group">
            <span className="text-[12.5px] w-44 shrink-0 truncate" title={row.label}>
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
                style={{ width: `${(row.count / max) * 100}%`, background: color }}
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
          Bar length relative to the largest value shown. n = {total} {unitLabel} total; count and % of that total shown at right.
        </div>
      )}
      <TooltipPortal tip={tip} />
    </div>
  )
}
