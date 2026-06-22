import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Per-country sample-size distribution on a log scale, with both median and
// mean marked — deliberately not collapsed to one summary bar, since mean
// and median tell different stories here (a handful of large field studies
// pull some countries' means well above their medians; showing only the
// mean would overstate how "typical" those large studies are).
export default function SampleSizeByCountry({ stats, studies, minCountThreshold }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600
  const domainMin = 1, domainMax = 4 // log10(n): 10^1=10 to 10^4=10000
  const xScale = (n) => ((Math.log10(n) - domainMin) / (domainMax - domainMin)) * W
  const rowH = 26
  const H = stats.length * rowH

  const studiesByCountry = {}
  studies.forEach((s) => {
    if (!studiesByCountry[s.country]) studiesByCountry[s.country] = []
    studiesByCountry[s.country].push(s.n)
  })

  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-2">
        x-axis: sample size (log scale, 10 to 10,000). Each grey dot is one study. Countries with fewer than{' '}
        {minCountThreshold} studies are omitted — a median of 1 or 2 studies isn't a meaningful summary.
      </div>
      <svg width={W + 140} height={H + 24} className="font-data overflow-visible">
        {[10, 100, 1000, 10000].map((v) => (
          <g key={v}>
            <line x1={xScale(v) + 120} x2={xScale(v) + 120} y1={0} y2={H} stroke="#E2DED4" strokeWidth={1} />
            <text x={xScale(v) + 120} y={H + 14} fontSize={9} fill="#A8A59C" textAnchor="middle">{v}</text>
          </g>
        ))}
        {stats.map((s, i) => {
          const y = i * rowH + rowH / 2
          const dots = studiesByCountry[s.country] || []
          return (
            <g key={s.country}>
              <text x={116} y={y + 3} fontSize={11.5} textAnchor="end" fill="#1A1A18">{s.country}</text>
              {dots.map((n, j) => (
                <circle key={j} cx={xScale(n) + 120} cy={y} r={2.2} fill="#A8A59C" opacity={0.55}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${s.country}: one study, n=${n}`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              ))}
              {/* median: filled diamond */}
              <rect x={xScale(s.median) + 120 - 3.5} y={y - 3.5} width={7} height={7} fill="#4855C8"
                transform={`rotate(45, ${xScale(s.median) + 120}, ${y})`}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: median n=${s.median} (across ${s.count} studies)`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
              {/* mean: open circle */}
              <circle cx={xScale(s.mean) + 120} cy={y} r={5} fill="none" stroke="#D94F6E" strokeWidth={1.6}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.country}: mean n=${s.mean.toFixed(1)} (across ${s.count} studies, max ${s.max})`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
            </g>
          )
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#A8A59C', opacity: 0.55 }} /> individual study</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block" style={{ background: '#4855C8', transform: 'rotate(45deg)' }} /> median</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block border-2" style={{ borderColor: '#D94F6E' }} /> mean</span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
