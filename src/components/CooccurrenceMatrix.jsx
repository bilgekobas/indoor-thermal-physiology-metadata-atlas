import { useTooltip, TooltipPortal } from './Tooltip.jsx'

export default function CooccurrenceMatrix({ labels, matrix, cellSize = 34 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  // Bug fix: use reduce instead of Math.max(...spread)
  const max = matrix.flat().reduce((m, v) => (v > m ? v : m), 1)

  const colorFor = (v) => {
    if (v === 0) return '#F1EDE6'
    const t = Math.min(v / max, 1)
    const r = Math.round(241 + (217 - 241) * t)
    const g = Math.round(237 + (79 - 237) * t)
    const b = Math.round(230 + (110 - 230) * t)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Column headers — rotate so text reads top-to-bottom */}
        <div className="flex" style={{ marginLeft: 140 }}>
          {labels.map((l) => (
            <div
              key={l}
              className="font-data text-[10px] text-inkfaint whitespace-nowrap overflow-hidden"
              style={{
                width: cellSize,
                height: 88,
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
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
                    showTip(e, i === j
                      ? `${rowLabel}: measured in ${v} studies`
                      : `${rowLabel} + ${colLabel}: co-occur in ${v} studies`)
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
