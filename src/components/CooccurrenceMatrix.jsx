import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Co-occurrence matrix: diagonal cells = number of studies measuring that
// one variable; off-diagonal cells = number of studies measuring BOTH row
// and column variables together. Every cell prints its own count, and a
// color-scale legend + the diagonal/off-diagonal distinction are stated
// directly under the chart so this reads correctly without the surrounding
// chapter prose.
export default function CooccurrenceMatrix({ labels, matrix, cellSize = 34, colorScheme = 'warm' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  // Bug fix: use reduce instead of Math.max(...spread)
  const max = matrix.flat().reduce((m, v) => (v > m ? v : m), 1)

  const colorFor = (v) => {
    if (v === 0) return '#EFEFEF'
    const t = Math.min(v / max, 1)
    if (colorScheme === 'blue') {
      const r = Math.round(239 + (91 - 239) * t)
      const g = Math.round(239 + (91 - 239) * t)
      const b = Math.round(239 + (255 - 239) * t)
      return `rgb(${r},${g},${b})`
    }
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
                    color: v / max > 0.55 ? 'white' : '#0A0A0A',
                    outline: i === j ? '1.5px solid #0A0A0A' : 'none',
                    outlineOffset: i === j ? '-1.5px' : 0,
                  }}
                  onMouseEnter={(e) =>
                    showTip(e, i === j
                      ? `${rowLabel}: measured in ${v} studies (diagonal = single-variable total)`
                      : `${rowLabel} + ${colLabel}: co-occur in ${v} studies (both measured in the same study)`)
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
      <div className="flex flex-wrap items-center gap-4 mt-3 font-data text-[10.5px] text-inkfaint">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max), border: '1.5px solid #0A0A0A' }} />
          outlined cell = diagonal (single-variable count, n studies measuring that one variable)
        </span>
        <span className="flex items-center gap-2">
          <span>scale:</span>
          <span className="w-3 h-3 inline-block" style={{ background: '#EFEFEF' }} /> 0
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max * 0.5) }} /> {Math.round(max * 0.5)}
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max) }} /> {max} (max)
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
