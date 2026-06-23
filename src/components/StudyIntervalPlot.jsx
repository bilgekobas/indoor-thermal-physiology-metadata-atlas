import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

function quantile(sorted, q) {
  if (!sorted.length) return null
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

export default function StudyIntervalPlot({
  studies,
  getLow,
  getHigh,
  getMid = null,
  getLabel,
  domain,
  color = '#5B5BFF',
  rowHeight = 3.4,
  unit = '',
  xAxisLabel = '',
  tickStep = null,
}) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!studies.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const [domainMin, domainMax] = domain
  const width = 640
  const plotHeight = studies.length * rowHeight
  const boxY = plotHeight + 16
  const totalHeight = plotHeight + 48
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * width

  const tickValues = useMemo(() => {
    if (tickStep) {
      const vals = []
      const start = Math.ceil(domainMin / tickStep) * tickStep
      for (let v = start; v <= domainMax + 1e-9; v += tickStep) vals.push(Number(v.toFixed(6)))
      return vals
    }
    return Array.from({ length: 8 }, (_, i) => domainMin + (i * (domainMax - domainMin)) / 7)
  }, [domainMin, domainMax, tickStep])

  const midGetter = getMid || ((s) => {
    const low = getLow(s)
    const high = getHigh(s)
    return (low + high) / 2
  })

  const mids = studies.map((s) => midGetter(s)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const boxStats = mids.length
    ? {
        min: mids[0],
        q1: quantile(mids, 0.25),
        med: quantile(mids, 0.5),
        q3: quantile(mids, 0.75),
        max: mids[mids.length - 1],
      }
    : null

  return (
    <div>
      <svg width={width} height={totalHeight + 18} className="font-data overflow-visible">
        {tickValues.map((v) => (
          <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={boxY + 10} stroke="#E4E4E4" strokeWidth={1} />
        ))}
        {studies.map((s, i) => {
          const low = getLow(s)
          const high = getHigh(s)
          const mid = midGetter(s)
          const y = i * rowHeight + rowHeight / 2
          return (
            <g
              key={i}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, getLabel(s))}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke={color} strokeWidth={1.15} opacity={0.5} />
              <circle cx={xScale(mid)} cy={y} r={1.7} fill={color} opacity={0.95} />
            </g>
          )
        })}
        {boxStats && (
          <g className="cursor-default" onMouseEnter={(e) => showTip(e, `Study means: median ${boxStats.med.toFixed(1)}${unit}, IQR ${boxStats.q1.toFixed(1)}–${boxStats.q3.toFixed(1)}${unit}, range ${boxStats.min.toFixed(1)}–${boxStats.max.toFixed(1)}${unit}`)} onMouseMove={moveTip} onMouseLeave={hideTip}>
            <line x1={xScale(boxStats.min)} x2={xScale(boxStats.max)} y1={boxY} y2={boxY} stroke="#0A0A0A" strokeWidth={1} />
            <line x1={xScale(boxStats.min)} x2={xScale(boxStats.min)} y1={boxY - 4} y2={boxY + 4} stroke="#0A0A0A" strokeWidth={1} />
            <line x1={xScale(boxStats.max)} x2={xScale(boxStats.max)} y1={boxY - 4} y2={boxY + 4} stroke="#0A0A0A" strokeWidth={1} />
            <rect x={xScale(boxStats.q1)} y={boxY - 7} width={Math.max(1, xScale(boxStats.q3) - xScale(boxStats.q1))} height={14} fill="#FFFFFF" stroke="#0A0A0A" strokeWidth={1} />
            <line x1={xScale(boxStats.med)} x2={xScale(boxStats.med)} y1={boxY - 8} y2={boxY + 8} stroke="#0A0A0A" strokeWidth={1.4} />
            <text x={width - 2} y={boxY - 10} fontSize={9} fill="#8A8A8A" textAnchor="end">boxplot of study means</text>
          </g>
        )}
        {tickValues.map((v) => (
          <text key={`t-${v}`} x={xScale(v)} y={totalHeight + 8} fontSize={10} fill="#8A8A8A" textAnchor="middle">
            {Number.isInteger(v) ? v : v.toFixed(1)}{unit}
          </text>
        ))}
      </svg>
      {xAxisLabel && <div className="font-data text-[10px] text-inkfaint text-center mt-0.5">{xAxisLabel}</div>}
      <div className="font-data text-[10px] text-inkfaint mt-2">{studies.length} studies, sorted ascending by mean. Each line shows mean ± SD; the central point marks the mean. Boxplot summarizes the distribution of study means.</div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
