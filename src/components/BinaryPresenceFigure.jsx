import { useTooltip, TooltipPortal } from './Tooltip.jsx'

const ROW_H = 14  // shared row height in px — bar rows and matrix rows must
                   // match exactly, or row i in the bar chart silently drifts
                   // out of alignment with row i in the matrix as the list
                   // goes down (this was a real bug: bars used auto/flex
                   // height while matrix rows were hardcoded to 11px).

// Renders the left bar chart (% reporting) + right binary matrix (field × study),
// row-aligned: row i of the bars is always the same field as row i of the
// matrix, so the matrix's first row IS the bar chart's first row's raw data,
// not a separately-laid-out element that happens to be nearby.
// matrix[i][j] = 1 if field i was reported in study j, else 0.
export default function BinaryPresenceFigure({ bar, matrix, fields, nStudies, barColor = '#5B5BFF' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const maxPct = bar.reduce((m, b) => (b.pct > m ? b.pct : m), 1)

  return (
    <div>
      <div className="flex gap-6 items-start">
        {/* Left: horizontal bar chart, % of studies reporting */}
        <div className="w-72 shrink-0">
          {bar.map((row) => (
            <div key={row.field} className="flex items-center gap-2 group" style={{ height: ROW_H }}>
              <span className="text-[11px] w-32 shrink-0 truncate text-right" title={row.field}>
                {row.field}
              </span>
              <div
                className="flex-1 h-2.5 rounded-sm bg-line/50 overflow-hidden cursor-default"
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

        {/* Right: binary matrix — rows = fields, columns = studies. Each row
            is pinned to the same ROW_H as its corresponding bar-chart row.
            2px per study (no gap) is about as dense as this can get while
            each column staying individually visible; at this corpus's size
            (up to 270 studies) the matrix can still need its own horizontal
            scroll even after this reduction — there's a hard floor on how
            many distinct columns fit in any reasonable plot width. */}
        <div className="flex-1 overflow-x-auto">
          <div className="font-data text-[10px] text-inkfaint mb-1.5">each column = one study, n = {nStudies} total</div>
          <div style={{ minWidth: nStudies * 2 }}>
            {fields.map((field, i) => (
              <div key={field} className="flex items-center" style={{ height: ROW_H }}>
                {(matrix[i] || []).map((present, j) => (
                  <div
                    key={j}
                    className="shrink-0 cursor-default"
                    style={{
                      width: 2,
                      height: ROW_H - 3,
                      background: present ? barColor : '#E4E4E4',
                    }}
                    onMouseEnter={(e) => showTip(e, `${field}: ${present ? 'reported' : 'not reported'} (study ${j + 1} of ${nStudies})`)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
