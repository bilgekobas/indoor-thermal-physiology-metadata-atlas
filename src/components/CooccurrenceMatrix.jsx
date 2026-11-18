import { useState } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'
import { ToggleGroup } from './OverallByPeriod.jsx'

const COLUMN_LABELS = {
  'Skin temperature': 'Skin temp.',
  'Core/Body temperature': 'Core/body temp.',
  'Sweat indicators': 'Sweat',
  'Oxygen saturation': 'O₂ sat.',
  'Skin conductance': 'Skin conduct.',
  'Metabolic rate/Gas exchange': 'Metabolic / gas',
  'Relative humidity': 'Rel. hum.',
  'CO2 concentration': 'CO₂',
  'Illuminance levels': 'Light level',
  'Outdoor temp.': 'Out. temp.',
  'Outdoor rel. humidity': 'Out. RH',
  'VOC levels': 'VOCs',
  'Solar radiation': 'Solar rad.',
}

export default function CooccurrenceMatrix({ labels, matrix, cellWidth = null, cellHeight = 30, colorScheme = 'blue', corpusN = null }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [cellMode, setCellMode] = useState('count') // 'count' | 'pctRow' | 'pctCorpus'
  const [totalMode, setTotalMode] = useState('count')
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
  const labelWidth = 200
  const barWidth = 140
  const totalWidth = barWidth + 38
  const columnWidth = cellWidth || Math.min(68, Math.floor((980 - labelWidth - totalWidth - 12) / labels.length))
  const maxTotal = Math.max(...matrix.map((row, i) => row[i]), 1)
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
      return `${rowLabel}: recorded in ${v} experiments${pctOfCorpus}, including experiments with other items. The diagonal always shows a count and uses a separate grey fill.`
    }
    const pctRow = rowTotal(i) ? Math.round((v / rowTotal(i)) * 1000) / 10 : 0
    const pctCorpus = corpusN ? Math.round((v / corpusN) * 1000) / 10 : null
    return `${rowLabel} + ${colLabel}: co-occur in ${v} experiments (${pctRow}% of ${rowLabel} experiments` +
      (pctCorpus != null ? `; ${pctCorpus}% of full corpus)` : ')')
  }

  return (
    <div>
      <div className="flex items-center gap-5 mb-3 flex-wrap">
        <div className="flex items-center gap-2" role="group" aria-label="Co-occurrence cell values">
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
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Co-occurrence totals">
          <span className="text-[10.5px] text-inkfaint font-data">totals:</span>
          <ToggleGroup value={totalMode} onChange={setTotalMode} options={[
            { value: 'count', label: 'count' },
            { value: 'pct', label: '% of corpus' },
          ]} />
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
      <div className="w-max" role="table" aria-label="Experiment co-occurrence matrix">
        <div className="flex items-end" role="row">
          <div role="columnheader" aria-label="Row item" className="shrink-0" style={{ width: labelWidth }} />
          {labels.map((l) => (
            <div
              key={l}
              role="columnheader"
              aria-label={l}
              className="text-[11px] text-inkmid text-center shrink-0 pb-1 leading-tight"
              style={{ width: columnWidth }}
              title={l}
            >
              {COLUMN_LABELS[l] || l}
            </div>
          ))}
          <div role="columnheader" className="text-[12px] text-inkmid text-center shrink-0 border-l border-line ml-3 pl-3" style={{ width: totalWidth }}>Total</div>
        </div>
        {labels.map((rowLabel, i) => (
          <div key={rowLabel} className="flex items-center" role="row">
            <div role="rowheader" className="text-[12px] shrink-0 text-right pr-3" style={{ width: labelWidth }} title={rowLabel}>
              {rowLabel}
            </div>
            {labels.map((colLabel, j) => {
              const v = matrix[i][j]
              const isDiagonal = i === j
              return (
                <div
                  key={colLabel}
                  role="cell"
                  aria-label={tooltipFor(rowLabel, colLabel, i, j)}
                  className="shrink-0 flex items-center justify-center font-data text-[10px] cursor-default border border-paper"
                  style={{
                    width: columnWidth,
                    height: cellHeight,
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
            <div role="cell" aria-label={`${rowLabel}: ${rowTotal(i)} of ${corpusN} experiments in total`} className="shrink-0 flex items-center gap-2 border-l border-line ml-3 pl-3" style={{ width: totalWidth, height: cellHeight }}>
              <div className="h-4 rounded-sm bg-[#5B5BFF]" style={{ width: `${rowTotal(i) / maxTotal * barWidth}px` }} />
              <div className="font-data text-[10px] text-inkmid w-8 text-right">
                {totalMode === 'count' ? rowTotal(i) : `${corpusN ? Math.round(rowTotal(i) / corpusN * 100) : 0}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      {cellMode === 'pctRow' && <p className="text-[11px] text-inkfaint mt-2">Cell percentages use the row total; the two directions can have different percentages.</p>}
      <div className="flex flex-wrap items-center gap-4 mt-3 font-data text-[10.5px] text-inkfaint">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ background: diagonalFill, border: '1.5px solid #0A0A0A' }} />
          Grey diagonal cells and total bars count experiments with the row item, including those with other items.
        </span>
        <span className="flex items-center gap-2">
          <span>off-diagonal count scale:</span>
          <span className="w-3 h-3 inline-block" style={{ background: '#EFEFEF' }} /> 0
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max * 0.5) }} /> {Math.round(max * 0.5)}
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(max) }} /> {max} (max off-diagonal)
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
