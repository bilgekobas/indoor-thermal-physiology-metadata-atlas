import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Square co-occurrence matrix. `matrix[i][j]` = count of studies measuring
// both labels[i] and labels[j]. Diagonal = total count for that variable.
export default function CooccurrenceMatrix({ labels, matrix, cellSize = 34 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const max = Math.max(...matrix.flat(), 1)

  const colorFor = (v) => {
    if (v === 0) return '#F1EDE6'
    const t = Math.min(v / max, 1)
    // interpolate paper -> peripheral-pink for a single coherent ramp
    const r1 = 241, g1 = 237, b1 = 230
    const r2 = 217, g2 = 79, b2 = 110
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex" style={{ marginLeft: 140 }}>
          {labels.map((l) => (
            <div
              key={l}
              className="font-data text-[10px] text-inkfaint origin-bottom-left whitespace-nowrap"
              style={{
                width: cellSize,
                height: 90,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 4,
              }}
            >
              {l}
            </div>
          ))}
        </div>
        {labels.map((rowLabel, i) => (
          <div key={rowLabel} className="flex items-center">
            <div
              className="text-[12px] shrink-0 text-right pr-2 truncate"
              style={{ width: 140 }}
              title={rowLabel}
            >
              {rowLabel}
            </div>
            {labels.map((colLabel, j) => {
              const v = matrix[i][j]
              return (
                <div
                  key={colLabel}
                  className="shrink-0 flex items-center justify-center font-data text-[10px] cursor-default border border-paper"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: colorFor(v),
                    color: v / max > 0.55 ? 'white' : '#1A1A18',
                  }}
                  onMouseEnter={(e) =>
                    showTip(
                      e,
                      i === j
                        ? `${rowLabel}: measured in ${v} studies`
                        : `${rowLabel} + ${colLabel}: measured together in ${v} studies`
                    )
                  }
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  {v > 0 ? v : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
