import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

export default function SampleSizeByCountry({ stats, studies, minCountThreshold, overallStudies = null, sampleShareThreshold = 1, totalSampleSizeAllCountries = null, selectionRule = null }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const PLOT_W = 620
  const TABLE_GAP = 170
  const AXIS_X = 160
  const LABEL_X = AXIS_X - 12
  const domainMin = 0
  const domainMax = 4 // log10(n): 1 to 10000
  const xScale = (n) => ((Math.log10(Math.max(n, 1)) - domainMin) / (domainMax - domainMin)) * PLOT_W
  const rowH = 28
  const H = stats.length * rowH

  const studiesByCountry = useMemo(() => {
    const grouped = {}
    studies.forEach((s) => {
      if (!grouped[s.country]) grouped[s.country] = []
      grouped[s.country].push(s.n)
    })
    return grouped
  }, [studies])

  const overall = useMemo(() => {
    const source = overallStudies || studies
    const vals = source.map((s) => Number(s.n)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
    const mean = vals.reduce((a, v) => a + v, 0) / Math.max(vals.length, 1)
    const mid = Math.floor(vals.length / 2)
    const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
    return { n: vals.length, mean, median }
  }, [studies, overallStudies])

  const totalSample = totalSampleSizeAllCountries || stats.reduce((a, s) => a + (s.sample_total || 0), 0)
  const refLines = [
    { key: 'n-equals-1', label: 'n = 1', value: 1, stroke: '#BBBBBB', dashed: false },
    { key: 'overall-median', label: 'overall median', value: overall.median, stroke: '#5B5BFF', dashed: true },
    { key: 'overall-mean', label: 'overall mean', value: overall.mean, stroke: '#FB3640', dashed: true },
  ]

  return (
    <div>
      <svg width={AXIS_X + PLOT_W + TABLE_GAP + 112} height={H + 40} className="font-data overflow-visible block">
        {[1, 10, 100, 1000, 10000].map((v) => (
          <g key={v}>
            <line x1={xScale(v) + AXIS_X} x2={xScale(v) + AXIS_X} y1={0} y2={H} stroke="#E4E4E4" strokeWidth={1} />
            <text x={xScale(v) + AXIS_X} y={H + 14} fontSize={9} fill="#8A8A8A" textAnchor="middle">{v}</text>
          </g>
        ))}
        {refLines.map((r, idx) => (
          <g key={r.key}>
            <line
              x1={xScale(r.value) + AXIS_X}
              x2={xScale(r.value) + AXIS_X}
              y1={-4}
              y2={H}
              stroke={r.stroke}
              strokeWidth={r.key === 'n-equals-1' ? 1.2 : 1.4}
              strokeDasharray={r.dashed ? '4 3' : undefined}
              opacity={0.95}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, r.key === 'n-equals-1' ? 'n = 1' : `${r.label}: n=${r.value.toFixed(1)} across ${overall.n} studies`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
            {r.key !== 'n-equals-1' && (
              <text
                x={xScale(r.value) + AXIS_X + (idx === 1 ? -4 : 4)}
                y={H + 28}
                fontSize={9}
                fill={r.stroke}
                textAnchor={idx === 1 ? 'end' : 'start'}
              >
                {r.label} {r.value.toFixed(1)}
              </text>
            )}
          </g>
        ))}
        <text x={AXIS_X + PLOT_W + TABLE_GAP + 28} y={-8} fontSize={9.5} fill="#8A8A8A" textAnchor="end">Σ participants</text>
        <text x={AXIS_X + PLOT_W + TABLE_GAP + 98} y={-8} fontSize={9.5} fill="#8A8A8A" textAnchor="end">% corpus</text>
        {stats.map((s, i) => {
          const y = i * rowH + rowH / 2
          const dots = studiesByCountry[s.country] || []
          const samplePct = totalSample ? ((s.sample_total || 0) / totalSample) * 100 : (s.sample_pct || 0)
          return (
            <g key={s.country}>
              <text x={LABEL_X} y={y + 3} fontSize={11.5} textAnchor="end" fill="#0A0A0A">{s.country}</text>
              {dots.map((n, j) => (
                <circle
                  key={j}
                  cx={xScale(n) + AXIS_X}
                  cy={y}
                  r={2.2}
                  fill="#8A8A8A"
                  opacity={0.55}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${s.country}: n=${n}`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
              <rect
                x={xScale(s.median) + AXIS_X - 3.5}
                y={y - 3.5}
                width={7}
                height={7}
                fill="#5B5BFF"
                transform={`rotate(45, ${xScale(s.median) + AXIS_X}, ${y})`}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: median n=${s.median} (across ${s.count} studies)`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
              <circle
                cx={xScale(s.mean) + AXIS_X}
                cy={y}
                r={5}
                fill="none"
                stroke="#FB3640"
                strokeWidth={1.6}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: mean n=${s.mean.toFixed(1)} (across ${s.count} studies, max ${s.max})`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
              <text x={AXIS_X + PLOT_W + TABLE_GAP + 28} y={y + 3} fontSize={10.5} fill="#0A0A0A" textAnchor="end">{Math.round(s.sample_total || 0).toLocaleString()}</text>
              <text x={AXIS_X + PLOT_W + TABLE_GAP + 98} y={y + 3} fontSize={10.5} fill="#8A8A8A" textAnchor="end">{samplePct.toFixed(1)}%</text>
            </g>
          )
        })}
      </svg>
      <div className="font-data text-[10px] text-inkfaint mt-2 mb-2 max-w-4xl">
        Countries shown by rule: {selectionRule || `≥${minCountThreshold} studies or ≥${sampleShareThreshold}% of the total participant sample`}. x-axis: sample size per study (log scale, 1 to 10,000). Right columns show the total participant sample contributed by that country and its share of the corpus-wide participant sample.
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#8A8A8A', opacity: 0.55 }} /> individual study</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block" style={{ background: '#5B5BFF', transform: 'rotate(45deg)' }} /> country median</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block border-2" style={{ borderColor: '#FB3640' }} /> country mean</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-0 border-t" style={{ borderColor: '#5B5BFF', borderTopStyle: 'dotted' }} /> overall median</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-0 border-t" style={{ borderColor: '#FB3640', borderTopStyle: 'dotted' }} /> overall mean</span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
