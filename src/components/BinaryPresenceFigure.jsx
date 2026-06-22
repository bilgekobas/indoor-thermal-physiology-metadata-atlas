import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Renders the left bar chart (% reporting) + right binary matrix (field × study).
// matrix[i][j] = 1 if field i was reported in study j, else 0.
// Left bars show their % directly (not just on hover); the right matrix
// states its own axis ("each column = one study, n=N total") and a
// reported/not-reported color legend, since a grid of thin colored bars
// means nothing without that key.
export default function BinaryPresenceFigure({ bar, matrix, fields, nStudies, barColor = '#1A1A18' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const maxPct = bar.reduce((m, b) => (b.pct > m ? b.pct : m), 1)

  return (
    <div>
      <div className="flex gap-6 items-start">
        {/* Left: horizontal bar chart, % of studies reporting */}
        <div className="w-72 shrink-0 space-y-1">
          {bar.map((row) => (
            <div key={row.field} className="flex items-center gap-2 group">
              <span className="text-[11px] w-32 shrink-0 truncate text-right" title={row.field}>
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
              <span className="font-data text-[10.5px] w-9 text-right text-inkmid shrink-0">{row.pct}%</span>
            </div>
          ))}
        </div>

        {/* Right: binary matrix — rows = fields, columns = studies */}
        <div className="flex-1 overflow-x-auto">
          <div className="font-data text-[10px] text-inkfaint mb-1.5">each column = one study, n = {nStudies} total</div>
          <div
            className="flex flex-col gap-[1px]"
            style={{ minWidth: nStudies * 3 }}
          >
            {fields.map((field, i) => (
              <div key={field} className="flex gap-[1px]" style={{ height: 11 }}>
                {(matrix[i] || []).map((present, j) => (
                  <div
                    key={j}
                    className="shrink-0 cursor-default"
                    style={{
                      width: 3,
                      height: 11,
                      background: present ? barColor : '#EDEAE2',
                    }}
                    onMouseEnter={(e) => showTip(e, `${field}: ${present ? 'reported' : 'not reported'} (study ${j + 1} of ${nStudies})`)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 font-data text-[10.5px] text-inkfaint">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 inline-block" style={{ background: barColor }} /> reported
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 inline-block" style={{ background: '#EDEAE2' }} /> not reported
            </span>
          </div>
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
