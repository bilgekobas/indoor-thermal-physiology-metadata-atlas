import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Renders one horizontal line per study from `low` to `high`, sorted by a sort key.
// Used for Figures 7 (temp ranges), 8 (age mean±SD), 9 (BMI mean±SD).
// `unit` and `xAxisLabel` are required-in-spirit: this component is reused for
// three different metrics with completely different units (years, kg/m², °C),
// and bare numbers on the x-axis would be ambiguous out of context — a BMI
// axis showing "16, 18, 20…" looks identical to an age or temperature axis
// unless the unit is printed directly on the chart.
export default function StudyIntervalPlot({ studies, getLow, getHigh, getLabel, domain, color = '#FB3640', rowHeight = 3.2, unit = '', xAxisLabel = '' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!studies.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const [domainMin, domainMax] = domain
  const width = 640
  const height = studies.length * rowHeight
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * width

  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1">{studies.length} studies, sorted ascending ↓</div>
      <svg width={width} height={height + 24} className="font-data overflow-visible">
        {/* gridlines */}
        {Array.from({ length: 8 }, (_, i) => domainMin + (i * (domainMax - domainMin)) / 7).map((v) => (
          <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={height} stroke="#E4E4E4" strokeWidth={1} />
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
          <text key={v} x={xScale(v)} y={height + 14} fontSize={10} fill="#8A8A8A" textAnchor="middle">
            {Math.round(v)}{unit}
          </text>
        ))}
      </svg>
      {xAxisLabel && <div className="font-data text-[10px] text-inkfaint text-center mt-0.5">{xAxisLabel}</div>}
      <TooltipPortal tip={tip} />
    </div>
  )
}
