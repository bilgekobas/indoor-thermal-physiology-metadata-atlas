import { useState } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Shared visual grammar for "overall vs. by-period" pairs, used consistently
// across every metric in the site where a two-year-binned breakdown is
// meaningful. A toggle switches between:
//   - "Overall": the simple summary across the whole corpus
//   - "By period": the same metric split into the 6 two-year bins
// `renderOverall` and `renderByPeriod` are render-prop functions so this
// component stays agnostic to what kind of chart each metric actually needs
// (bar, line, stacked) while keeping the toggle interaction identical everywhere.
export default function OverallByPeriod({ renderOverall, renderByPeriod, earliestPeriodCaveat }) {
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
      {mode === 'overall' ? renderOverall() : renderByPeriod()}
      {mode === 'byPeriod' && earliestPeriodCaveat && (
        <p className="text-[11px] text-inkfaint mt-2">{earliestPeriodCaveat}</p>
      )}
    </div>
  )
}

// A compact grouped-bar primitive for "one metric, six period bars" — used
// by several of the by-period views (signal frequency, sensor heights,
// protocol/participant/selection fields, geographic concentration) so they
// all look and behave the same way. Each bar shows its own value directly
// above it (not just on hover) since a bare bar with no visible number
// reads as decorative rather than as data. `yUnit` states what `getValue`
// returns (e.g. "%" or "studies") so the chart is self-explanatory without
// the surrounding chapter prose.
export function PeriodBarGroup({ periods, periodN, getValue, getTooltip, color = '#D94F6E', height = 110, yUnit = '', valueFormatter = null }) {
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

// Multi-line "% of studies reporting each field, by period" chart — shared
// by every chapter that breaks a set of binary fields down over time
// (participant metadata, selection criteria, protocol controls). Previously
// each chapter had its own copy-pasted version of this, which had already
// started to drift; consolidating here so a fix in one place reaches all of
// them, and so the y-axis is consistently labelled "% of studies in period."
const DEFAULT_LINE_PALETTE = ['#1A1A18', '#D94F6E', '#4855C8', '#E07820', '#B8C020', '#8A8A86', '#C9698A', '#7A8FD9']
export function PercentLinesByPeriod({ periodData, fields, periods, palette = DEFAULT_LINE_PALETTE }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600, H = 170
  const xStep = W / (periods.length - 1)
  const yScale = (pct) => H - (pct / 100) * H
  return (
    <div>
      <svg width={W + 46} height={H + 24} className="font-data overflow-visible">
        <text x={-6} y={-8} fontSize={9.5} fill="#A8A59C" transform={`rotate(-90, -6, ${H / 2})`} textAnchor="middle">
          % of studies in that period
        </text>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={yScale(g)} y2={yScale(g)} stroke="#E2DED4" strokeWidth={1} />
            <text x={W + 4} y={yScale(g) + 3} fontSize={9} fill="#A8A59C">{g}%</text>
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
        {periods.map((p, i) => (<text key={p} x={i * xStep} y={H + 16} fontSize={10} fill="#A8A59C" textAnchor="middle">{p}</text>))}
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
