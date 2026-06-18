import { useTooltip, TooltipPortal, fmtCountPct } from './Tooltip.jsx'

// Horizontal bar chart where every bar shows count + percentage on hover.
// `data` is [{ label, count }], `total` is the denominator for percentage.
export default function InteractiveBarChart({ data, total, color = '#D94F6E', maxBars = null, height = 22 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const rows = maxBars ? data.slice(0, maxBars) : data
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
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
          <span className="font-data text-[11.5px] w-10 text-right text-inkmid shrink-0">
            {row.count}
          </span>
        </div>
      ))}
      <TooltipPortal tip={tip} />
    </div>
  )
}
