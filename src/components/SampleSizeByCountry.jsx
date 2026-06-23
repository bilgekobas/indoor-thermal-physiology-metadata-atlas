import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Per-country sample-size distribution on a log scale, with country-level
// median/mean and corpus-level median/mean reference lines. The corpus-level
// lines are calculated from all plotted study sample sizes so they remain
// synchronized with data updates.
export default function SampleSizeByCountry({ stats, studies, minCountThreshold }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600
  const PAD_X = 120
  const domainMin = 1, domainMax = 4 // log10(n): 10^1=10 to 10^4=10000
  const xScale = (n) => ((Math.log10(Math.max(n, 1)) - domainMin) / (domainMax - domainMin)) * W
  const rowH = 26
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
    const vals = studies.map((s) => Number(s.n)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
    const mean = vals.reduce((a, v) => a + v, 0) / Math.max(vals.length, 1)
    const mid = Math.floor(vals.length / 2)
    const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
    return { n: vals.length, mean, median }
  }, [studies])

  const refLines = [
    { key: 'overall-median', label: 'overall median', value: overall.median, stroke: '#5B5BFF' },
    { key: 'overall-mean', label: 'overall mean', value: overall.mean, stroke: '#FB3640' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-2">
        x-axis: sample size (log scale, 10 to 10,000). Grey dots are individual studies. Countries with fewer than{' '}
        {minCountThreshold} studies are omitted. Dotted vertical lines show the overall median and mean across all included studies in this panel.
      </div>
      <svg width={W + 150} height={H + 36} className="font-data overflow-visible">
        {[10, 100, 1000, 10000].map((v) => (
          <g key={v}>
            <line x1={xScale(v) + PAD_X} x2={xScale(v) + PAD_X} y1={0} y2={H} stroke="#E4E4E4" strokeWidth={1} />
            <text x={xScale(v) + PAD_X} y={H + 14} fontSize={9} fill="#8A8A8A" textAnchor="middle">{v}</text>
          </g>
        ))}
        {refLines.map((r, idx) => (
          <g key={r.key}>
            <line
              x1={xScale(r.value) + PAD_X}
              x2={xScale(r.value) + PAD_X}
              y1={-4}
              y2={H}
              stroke={r.stroke}
              strokeWidth={1.4}
              strokeDasharray="4 3"
              opacity={0.9}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${r.label}: n=${r.value.toFixed(1)} across ${overall.n} studies`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
            <text
              x={xScale(r.value) + PAD_X + (idx === 0 ? -4 : 4)}
              y={H + 28}
              fontSize={9}
              fill={r.stroke}
              textAnchor={idx === 0 ? 'end' : 'start'}
            >
              {r.label} {r.value.toFixed(1)}
            </text>
          </g>
        ))}
        {stats.map((s, i) => {
          const y = i * rowH + rowH / 2
          const dots = studiesByCountry[s.country] || []
          return (
            <g key={s.country}>
              <text x={116} y={y + 3} fontSize={11.5} textAnchor="end" fill="#0A0A0A">{s.country}</text>
              {dots.map((n, j) => (
                <circle key={j} cx={xScale(n) + PAD_X} cy={y} r={2.2} fill="#8A8A8A" opacity={0.55}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${s.country}: n=${n}`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              ))}
              <rect x={xScale(s.median) + PAD_X - 3.5} y={y - 3.5} width={7} height={7} fill="#5B5BFF"
                transform={`rotate(45, ${xScale(s.median) + PAD_X}, ${y})`}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: median n=${s.median} (across ${s.count} studies)`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
              <circle cx={xScale(s.mean) + PAD_X} cy={y} r={5} fill="none" stroke="#FB3640" strokeWidth={1.6}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: mean n=${s.mean.toFixed(1)} (across ${s.count} studies, max ${s.max})`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
            </g>
          )
        })}
      </svg>
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
