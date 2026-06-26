import { useEffect } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Histogram + ECDF, matching Figures 3, 4, 11 in the appendix.
export default function HistogramECDF({ values, binWidth = 1, xLabel = '', unit = '', tickFormatter = null, onStats = null, width = 960, barColor = '#0A0A0A', lineColor = '#5B5BFF' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!values.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const fmt = tickFormatter || ((v) => `${v}${unit}`)

  const sorted = [...values].sort((a, b) => a - b)
  const min = Math.floor(sorted[0] / binWidth) * binWidth
  const max = Math.ceil(sorted[sorted.length - 1] / binWidth) * binWidth
  const nBins = Math.max(1, Math.round((max - min) / binWidth))

  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  const stats = {
    n: sorted.length, min: sorted[0], max: sorted[sorted.length - 1],
    q25: q(0.25), median: q(0.5), q75: q(0.75),
  }
  useEffect(() => { if (onStats) onStats(stats) })

  const bins = Array.from({ length: nBins }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
  }))
  sorted.forEach((v) => {
    let idx = Math.floor((v - min) / binWidth)
    if (idx >= nBins) idx = nBins - 1
    if (idx < 0) idx = 0
    bins[idx].count++
  })

  const maxCount = Math.max(...bins.map((b) => b.count), 1)
  const total = sorted.length
  let cum = 0
  const ecdf = bins.map((b) => {
    cum += b.count
    return cum / total
  })

  const chartHeight = 180
  // Keep the assigned atlas plot width fixed. Previously the number of bins could
  // enlarge the SVG, so figures with the same FigureCard size still ended at
  // different x positions.
  const chartWidth = Math.max(width, 320)
  const yAxisW = 34
  const xStep = chartWidth / bins.length
  const xTickEvery = Math.max(1, Math.ceil(bins.length / 10))

  return (
    <div>
      <svg width={chartWidth + yAxisW} height={chartHeight + 34} viewBox={`0 0 ${chartWidth + yAxisW} ${chartHeight + 34}`} className="font-data block overflow-visible atlas-fixed-svg">
        {[0, 0.5, 1].map((frac) => (
          <g key={frac}>
            <line x1={yAxisW} x2={chartWidth + yAxisW} y1={chartHeight * (1 - frac)} y2={chartHeight * (1 - frac)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={yAxisW - 4} y={chartHeight * (1 - frac) + 3} fontSize={9} fill="#8A8A8A" textAnchor="end">
              {Math.round(maxCount * frac)}
            </text>
          </g>
        ))}
        <text x={0} y={10} fontSize={9} fill="#8A8A8A">studies</text>

        <g transform={`translate(${yAxisW}, 0)`}>
          {bins.map((b, i) => {
            const barH = (b.count / maxCount) * chartHeight
            const x = i * xStep
            const w = Math.max(1, xStep - 2)
            return (
              <rect
                key={i}
                x={x}
                y={chartHeight - barH}
                width={w}
                height={barH}
                fill={barColor}
                opacity={0.85}
                className="cursor-default hover:opacity-100"
                onMouseEnter={(e) =>
                  showTip(
                    e,
                    `${fmt(b.start)} to ${fmt(b.end)}: ${b.count} studies in this bin · ${((b.count / total) * 100).toFixed(1)}%`
                  )
                }
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          <polyline
            points={[`0,${chartHeight}`].concat(ecdf.map((y, i) => {
              const x = (i + 1) * xStep
              return `${x},${chartHeight - y * chartHeight}`
            })).join(' ')}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.6}
          />
          {ecdf.map((y, i) => {
            const x = (i + 1) * xStep
            return (
              <circle
                key={i}
                cx={x}
                cy={chartHeight - y * chartHeight}
                r={2.6}
                fill={lineColor}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `Cumulative through this bin: ${(y * 100).toFixed(1)}% of studies ≤ ${fmt(bins[i].end)}`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          {bins.map((b, i) => {
            if (i % xTickEvery !== 0 && i !== bins.length - 1) return null
            const x = i * xStep
            return (
              <text key={i} x={x} y={chartHeight + 16} fontSize={10} fill="#8A8A8A">
                {fmt(b.start)}
              </text>
            )
          })}
        </g>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-inkmid flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: barColor, opacity: 0.85 }} /> count
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-full" style={{ background: lineColor }} /> cumulative %
        </span>
        {xLabel && <span className="text-inkfaint">· x-axis: {xLabel}</span>}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
