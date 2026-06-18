import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Renders the left bar chart (% reporting) + right binary matrix (study × field)
// pattern used in Figures 20, 21, 22 of the appendix.
export default function BinaryPresenceFigure({ bar, matrix, fields, nStudies, barColor = '#1A1A18' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const maxPct = Math.max(...bar.map((b) => b.pct), 1)

  return (
    <div className="flex gap-6 items-start">
      {/* Left: bar chart */}
      <div className="w-64 shrink-0 space-y-1">
        {bar.map((row) => (
          <div key={row.field} className="flex items-center gap-2 group">
            <span className="text-[11px] w-28 shrink-0 truncate text-right" title={row.field}>
              {row.field}
            </span>
            <div
              className="flex-1 h-3 rounded-sm bg-line/50 overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${row.field}: ${row.count} of ${nStudies} studies · ${row.pct}%`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div
                className="h-full group-hover:brightness-125"
                style={{ width: `${(row.pct / maxPct) * 100}%`, background: barColor }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Right: binary matrix, one column per study */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex flex-col gap-[1px]" style={{ minWidth: matrix.length ? matrix[0].length * 3 : 0 }}>
          {fields.map((field, i) => (
            <div key={field} className="flex gap-[1px]" style={{ height: 11 }}>
              {matrix[i].map((present, j) => (
                <div
                  key={j}
                  className="cursor-default"
                  style={{
                    width: 3,
                    height: 11,
                    background: present ? '#1A1A18' : '#EDEAE2',
                  }}
                  onMouseEnter={(e) => showTip(e, `${field}: ${present ? 'reported' : 'not reported'} (study ${j + 1})`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
