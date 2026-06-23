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
  rowHeight = 3.8,
  unit = '',
  xAxisLabel = '',
  tickStep = null,
  width = 900,
}) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!studies.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const [domainMin, domainMax] = domain
  const plotHeight = studies.length * rowHeight
  const boxY = plotHeight + 22
  const totalHeight = plotHeight + 74
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
        mean: mids.reduce((a, v) => a + v, 0) / mids.length,
      }
    : null

  return (
    <div>
      <svg width={width} height={totalHeight + 18} className="font-data overflow-visible block">
        {tickValues.map((v) => (
          <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={boxY + 12} stroke="#E4E4E4" strokeWidth={1} />
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
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke={color} strokeWidth={1.2} opacity={0.52} />
              <circle cx={xScale(mid)} cy={y} r={1.9} fill={color} opacity={0.97} />
            </g>
          )
        })}
        {boxStats && (
          <g
            className="cursor-default"
            onMouseEnter={(e) => showTip(e, `Study means: mean ${boxStats.mean.toFixed(1)}${unit}, median ${boxStats.med.toFixed(1)}${unit}, IQR ${boxStats.q1.toFixed(1)}–${boxStats.q3.toFixed(1)}${unit}, range ${boxStats.min.toFixed(1)}–${boxStats.max.toFixed(1)}${unit}`)}
            onMouseMove={moveTip}
            onMouseLeave={hideTip}
          >
            <line x1={xScale(boxStats.min)} x2={xScale(boxStats.max)} y1={boxY} y2={boxY} stroke="#0A0A0A" strokeWidth={1.1} />
            <line x1={xScale(boxStats.min)} x2={xScale(boxStats.min)} y1={boxY - 5} y2={boxY + 5} stroke="#0A0A0A" strokeWidth={1.1} />
            <line x1={xScale(boxStats.max)} x2={xScale(boxStats.max)} y1={boxY - 5} y2={boxY + 5} stroke="#0A0A0A" strokeWidth={1.1} />
            <rect x={xScale(boxStats.q1)} y={boxY - 8} width={Math.max(1, xScale(boxStats.q3) - xScale(boxStats.q1))} height={16} fill="#FFFFFF" stroke="#0A0A0A" strokeWidth={1.15} />
            <line x1={xScale(boxStats.q1)} x2={xScale(boxStats.q1)} y1={boxY - 9} y2={boxY + 9} stroke="#0A0A0A" strokeWidth={1} opacity={0.75} />
            <line x1={xScale(boxStats.med)} x2={xScale(boxStats.med)} y1={boxY - 10} y2={boxY + 10} stroke="#0A0A0A" strokeWidth={1.5} />
            <line x1={xScale(boxStats.q3)} x2={xScale(boxStats.q3)} y1={boxY - 9} y2={boxY + 9} stroke="#0A0A0A" strokeWidth={1} opacity={0.75} />
            <rect
              x={xScale(boxStats.mean) - 4}
              y={boxY - 4}
              width={8}
              height={8}
              fill={color}
              stroke="#0A0A0A"
              strokeWidth={0.8}
              transform={`rotate(45 ${xScale(boxStats.mean)} ${boxY})`}
            />
            <text x={width - 2} y={boxY - 11} fontSize={9} fill="#8A8A8A" textAnchor="end">boxplot of study means</text>
          </g>
        )}
        {tickValues.map((v) => (
          <text key={`t-${v}`} x={xScale(v)} y={totalHeight + 12} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v}</text>
        ))}
        {xAxisLabel && <text x={width} y={totalHeight + 28} fontSize={11} fill="#8A8A8A" textAnchor="end">{xAxisLabel}</text>}
      </svg>
      <div className="font-data text-[10.5px] text-inkfaint mt-1">
        {studies.length} studies, sorted ascending by mean. Each line shows mean ± SD; the central point marks the mean. Boxplot summarizes the distribution of study means.
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
