import { useState } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

export default function OverallByPeriod({ renderOverall, renderByPeriod, earliestPeriodCaveat, minHeight }) {
  const [mode, setMode] = useState('overall')
  return (
    <div>
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setMode('overall')}
          className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${
            mode === 'overall' ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => setMode('byPeriod')}
          className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${
            mode === 'byPeriod' ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'
          }`}
        >
          By 2-year period
        </button>
      </div>
      <div style={minHeight ? { minHeight } : undefined}>
        {mode === 'overall' ? renderOverall() : renderByPeriod()}
      </div>
      {mode === 'byPeriod' && earliestPeriodCaveat && (
        <p className="text-[11px] text-inkfaint mt-2">{earliestPeriodCaveat}</p>
      )}
    </div>
  )
}

export function PeriodBarGroup({ periods, periodN, getValue, getTooltip, color = '#5B5BFF', height = 110, yUnit = '', valueFormatter = null }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const values = periods.map((p) => getValue(p))
  const max = values.reduce((m, v) => (v > m ? v : m), 1)
  const fmtVal = valueFormatter || ((v) => `${v}${yUnit}`)
  return (
    <div>
      <div className="flex gap-3 items-end" style={{ height: height + 16 }}>
        {periods.map((p, i) => (
          <div key={p} className="flex-1 flex flex-col items-center group">
            <div className="font-data text-[9.5px] text-inkmid mb-0.5">{fmtVal(values[i])}</div>
            <div
              className="w-full rounded-sm bg-ink/85 group-hover:brightness-110 transition-[height] cursor-default"
              style={{ height: `${(values[i] / max) * (height - 24)}px`, background: color }}
              onMouseEnter={(e) => showTip(e, getTooltip(p, values[i]))}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
            <div className="font-data text-[10px] text-inkfaint mt-1.5">{p}</div>
            {periodN && <div className="font-data text-[9px] text-inkfaint/70">n={periodN[p] || 0}</div>}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export function PeriodHeatmap({ rows, periods, periodN, getCount, rowTotals = null, labelWidth = 220, cellWidth = 68, cellHeight = 30, totalLabel = 'Total' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const totals = rowTotals || Object.fromEntries(rows.map((row) => [row, periods.reduce((a, p) => a + (getCount(row, p) || 0), 0)]))
  const maxTotal = Math.max(...rows.map((row) => totals[row] || 0), 1)
  const barW = 140
  const colorFor = (pct) => {
    if (!pct) return '#EFEFEF'
    const t = Math.min(pct / 100, 1)
    const r = Math.round(239 + (91 - 239) * t)
    const g = Math.round(239 + (91 - 239) * t)
    const b = Math.round(239 + (255 - 239) * t)
    return `rgb(${r},${g},${b})`
  }
  return (
    <div>
      <div className="inline-block">
        <div className="flex items-end" style={{ marginLeft: labelWidth }}>
          {periods.map((p) => (
            <div key={p} className="text-[12px] text-inkmid text-center" style={{ width: cellWidth }}>
              {p}
              {periodN && <div className="font-data text-[10px] text-inkfaint/70">n={periodN[p] || 0}</div>}
            </div>
          ))}
          <div className="text-[12px] text-inkmid text-center border-l border-line ml-3 pl-3" style={{ width: barW + 38 }}>{totalLabel}</div>
        </div>
        {rows.map((row) => (
          <div key={row} className="flex items-center">
            <div className="text-[12px] shrink-0 text-right pr-3" style={{ width: labelWidth }} title={row}>{row}</div>
            {periods.map((p) => {
              const count = getCount(row, p) || 0
              const n = periodN?.[p] || 0
              const pct = n ? (count / n) * 100 : 0
              return (
                <div
                  key={p}
                  className="shrink-0 flex items-center justify-center font-data text-[10px] cursor-default border border-paper"
                  style={{ width: cellWidth, height: cellHeight, background: colorFor(pct), color: pct > 55 ? 'white' : '#0A0A0A' }}
                  onMouseEnter={(e) => showTip(e, `${row}, ${p}: ${count} of ${n} studies · ${pct.toFixed(1)}%`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  {pct > 0 ? `${Math.round(pct)}%` : '–'}
                </div>
              )
            })}
            <div className="shrink-0 flex items-center gap-2 border-l border-line ml-3 pl-3" style={{ width: barW + 38, height: cellHeight }}>
              <div className="h-4 rounded-sm bg-[#5B5BFF]" style={{ width: `${((totals[row] || 0) / maxTotal) * barW}px` }} />
              <div className="font-data text-[10px] text-inkmid w-8 text-right">{totals[row] || 0}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 font-data text-[10.5px] text-inkfaint flex-wrap">
        <span className="flex items-center gap-2">
          <span>period cell scale:</span>
          <span className="w-3 h-3 inline-block" style={{ background: '#EFEFEF' }} /> 0%
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(50) }} /> 50%
          <span className="w-3 h-3 inline-block" style={{ background: colorFor(100) }} /> 100%
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

const DEFAULT_LINE_PALETTE = ['#0A0A0A', '#5B5BFF', '#FB3640', '#8A8A8A', '#4A4A4A', '#BBBBBB', '#BBBBBB', '#E4E4E4']
export function PercentLinesByPeriod({ periodData, fields, periods, palette = DEFAULT_LINE_PALETTE }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600, H = 170
  const xStep = W / (periods.length - 1)
  const yScale = (pct) => H - (pct / 100) * H
  return (
    <div>
      <svg width={W + 46} height={H + 24} className="font-data overflow-visible">
        <text x={-6} y={-8} fontSize={9.5} fill="#8A8A8A" transform={`rotate(-90, -6, ${H / 2})`} textAnchor="middle">
          % of studies in that period
        </text>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={yScale(g)} y2={yScale(g)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={W + 4} y={yScale(g) + 3} fontSize={9} fill="#8A8A8A">{g}%</text>
          </g>
        ))}
        {fields.map((field, fi) => {
          const points = periods.map((p, i) => {
            const r = periodData.find((d) => d.period === p && d.field === field)
            return { x: i * xStep, y: yScale(r?.pct || 0), pct: r?.pct || 0, count: r?.count || 0, n: r?.n || 0 }
          })
          const color = palette[fi % palette.length]
          return (
            <g key={field}>
              <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={1.6} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={color} className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${field}, ${periods[i]}: ${p.count} of ${p.n} studies · ${p.pct}%`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              ))}
            </g>
          )
        })}
        {periods.map((p, i) => (<text key={p} x={i * xStep} y={H + 16} fontSize={10} fill="#8A8A8A" textAnchor="middle">{p}</text>))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {fields.map((f, i) => (
          <div key={f} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: palette[i % palette.length] }} />{f}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
