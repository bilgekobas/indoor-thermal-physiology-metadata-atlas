import { useTooltip, TooltipPortal } from './Tooltip.jsx'

export default function CooccurrenceMatrix({ labels, matrix, cellSize = 46, colorScheme = 'blue' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!labels?.length || !matrix?.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const offDiagValues = matrix.flatMap((row, i) => row.filter((_, j) => j !== i))
  const max = Math.max(...offDiagValues, 1)
  const labelWidth = 158
  const diagonalFill = '#D9D9D9'
  const diagonalText = '#4A4A4A'

  const colorFor = (v) => {
    if (!v) return '#EFEFEF'
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
    <div>
      <div className="inline-block">
        <div className="flex" style={{ marginLeft: labelWidth }}>
          {labels.map((l) => (
            <div
              key={l}
              className="text-[12px] text-inkmid whitespace-nowrap overflow-hidden"
              style={{
                width: cellSize,
                height: 110,
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingBottom: 8,
                paddingRight: 8,
              }}
              title={l}
            >
              {l}
            </div>
          ))}
        </div>
        {labels.map((rowLabel, i) => (
          <div key={rowLabel} className="flex items-center">
            <div className="text-[12px] shrink-0 text-right pr-2" style={{ width: labelWidth }} title={rowLabel}>
              {rowLabel}
            </div>
            {labels.map((colLabel, j) => {
              const v = matrix[i][j]
              const isDiagonal = i === j
              return (
                <div
                  key={colLabel}
                  className="shrink-0 flex items-center justify-center font-data text-[10px] cursor-default border border-paper"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: isDiagonal ? diagonalFill : colorFor(v),
                    color: isDiagonal ? diagonalText : (v / max > 0.55 ? 'white' : '#0A0A0A'),
                    outline: isDiagonal ? '1.5px solid #0A0A0A' : 'none',
                    outlineOffset: isDiagonal ? '-1.5px' : 0,
                  }}
                  onMouseEnter={(e) =>
                    showTip(e, isDiagonal
                      ? `${rowLabel}: measured in ${v} studies (diagonal = single-variable total, shown in gray — not on the co-occurrence color scale)`
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
          <span className="w-3 h-3 inline-block" style={{ background: diagonalFill, border: '1.5px solid #0A0A0A' }} />
          gray outlined cell = diagonal (single-variable count, n studies measuring that one variable — not on the color scale below)
        </span>
        <span className="flex items-center gap-2">
          <span>co-occurrence scale:</span>
          <span className="w-3 h-3 inline-block" style={{ background: '#EFEFEF' }} /> 0
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max * 0.5) }} /> {Math.round(max * 0.5)}
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max) }} /> {max} (max off-diagonal)
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
