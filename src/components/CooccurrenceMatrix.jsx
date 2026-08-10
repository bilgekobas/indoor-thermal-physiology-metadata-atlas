import { useState } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'
import { ToggleGroup } from './OverallByPeriod.jsx'

export default function CooccurrenceMatrix({ labels, matrix, cellSize = 46, colorScheme = 'blue', corpusN = null }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [cellMode, setCellMode] = useState('count') // 'count' | 'pctRow' | 'pctCorpus'
  if (!labels?.length || !matrix?.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const rowTotal = (i) => matrix[i][i]
  const displayValue = (i, j) => {
    const v = matrix[i][j]
    if (cellMode === 'count') return v
    if (cellMode === 'pctRow') {
      const denom = rowTotal(i)
      return denom ? Math.round((v / denom) * 1000) / 10 : 0
    }
    // pctCorpus
    return corpusN ? Math.round((v / corpusN) * 1000) / 10 : 0
  }
  const formatCell = (i, j) => {
    if (cellMode === 'count') return matrix[i][j] > 0 ? matrix[i][j] : ''
    const v = displayValue(i, j)
    return matrix[i][j] > 0 ? `${v}%` : ''
  }

  // Color scale always keyed off the raw counts (not the % values), so the
  // color pattern doesn't jump around when switching modes -- only the
  // printed number changes.
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

  const tooltipFor = (rowLabel, colLabel, i, j) => {
    const v = matrix[i][j]
    const isDiagonal = i === j
    if (isDiagonal) {
      const pctOfCorpus = corpusN ? ` (${Math.round((v / corpusN) * 1000) / 10}% of corpus)` : ''
      return `${rowLabel}: measured in ${v} studies${pctOfCorpus} (diagonal = single-variable total, shown in gray — not on the co-occurrence color scale)`
    }
    const pctRow = rowTotal(i) ? Math.round((v / rowTotal(i)) * 1000) / 10 : 0
    const pctCorpus = corpusN ? Math.round((v / corpusN) * 1000) / 10 : null
    return `${rowLabel} + ${colLabel}: co-occur in ${v} studies (${pctRow}% of ${rowLabel} studies` +
      (pctCorpus != null ? `; ${pctCorpus}% of full corpus)` : ')')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10.5px] text-inkfaint font-data">matrix cells:</span>
        <ToggleGroup
          value={cellMode}
          onChange={setCellMode}
          options={[
            { value: 'count', label: 'count' },
            { value: 'pctRow', label: '% of row' },
            { value: 'pctCorpus', label: '% of corpus' },
          ]}
        />
        {cellMode === 'pctRow' && (
          <span className="text-[10.5px] text-inkfaint">
            — of the row variable's own studies; not symmetric (A+B ≠ B+A as %)
          </span>
        )}
      </div>
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
                  onMouseEnter={(e) => showTip(e, tooltipFor(rowLabel, colLabel, i, j))}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  {isDiagonal ? v : formatCell(i, j)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3 font-data text-[10.5px] text-inkfaint">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ background: diagonalFill, border: '1.5px solid #0A0A0A' }} />
          gray outlined cell = diagonal (single-variable count, n studies measuring that one variable — not on the color scale below, and always shown as a count regardless of the toggle above)
        </span>
        <span className="flex items-center gap-2">
          <span>co-occurrence scale (always by count, regardless of cell display mode):</span>
          <span className="w-3 h-3 inline-block" style={{ background: '#EFEFEF' }} /> 0
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max * 0.5) }} /> {Math.round(max * 0.5)}
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max) }} /> {max} (max off-diagonal)
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
