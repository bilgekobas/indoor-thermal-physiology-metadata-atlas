import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Renders one horizontal line per study from `low` to `high`, sorted by a sort key.
// Used for Figures 7 (temp ranges), 8 (age mean±SD), 9 (BMI mean±SD).
export default function StudyIntervalPlot({ studies, getLow, getHigh, getLabel, domain, color = '#D94F6E', rowHeight = 3.2 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!studies.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const [domainMin, domainMax] = domain
  const width = 640
  const height = studies.length * rowHeight
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * width

  return (
    <div>
      <svg width={width} height={height + 24} className="font-data overflow-visible">
        {/* gridlines */}
        {Array.from({ length: 8 }, (_, i) => domainMin + (i * (domainMax - domainMin)) / 7).map((v) => (
          <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={height} stroke="#E2DED4" strokeWidth={1} />
        ))}
        {studies.map((s, i) => {
          const low = getLow(s)
          const high = getHigh(s)
          const y = i * rowHeight + rowHeight / 2
          return (
            <g
              key={i}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, getLabel(s))}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke={color} strokeWidth={1.1} opacity={0.55} />
              <circle cx={xScale(low)} cy={y} r={1.4} fill={color} />
              <circle cx={xScale(high)} cy={y} r={1.4} fill={color} />
            </g>
          )
        })}
        {Array.from({ length: 8 }, (_, i) => domainMin + (i * (domainMax - domainMin)) / 7).map((v) => (
          <text key={v} x={xScale(v)} y={height + 14} fontSize={10} fill="#A8A59C" textAnchor="middle">
            {Math.round(v)}
          </text>
        ))}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}
