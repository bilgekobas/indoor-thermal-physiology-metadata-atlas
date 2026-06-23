import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Histogram + ECDF, matching Figures 3, 4, 11 in the appendix.
// `values` is a flat array of numbers; `binWidth` controls bucket size.
// `tickFormatter`, if given, converts a bin-edge value back to the units a
// reader actually understands (e.g. log10(n) bins displaying "n=20" rather
// than the bare log value "1.3") — without it, log-scaled axes show numbers
// with no indication they're logarithms at all.
export default function HistogramECDF({ values, binWidth = 1, xLabel = '', unit = '', tickFormatter = null }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  if (!values.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const fmt = tickFormatter || ((v) => `${v}${unit}`)

  const sorted = [...values].sort((a, b) => a - b)
  const min = Math.floor(sorted[0] / binWidth) * binWidth
  const max = Math.ceil(sorted[sorted.length - 1] / binWidth) * binWidth
  const nBins = Math.max(1, Math.round((max - min) / binWidth))

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

  // ECDF points aligned to bin edges
  let cum = 0
  const ecdf = bins.map((b) => {
    cum += b.count
    return cum / total
  })

  const chartHeight = 160
  const chartWidth = Math.max(bins.length * 22, 300)
  const yAxisW = 34

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth + yAxisW} height={chartHeight + 30} className="font-data">
        {/* Y-axis: count scale, so the bar heights have a stated meaning without hovering */}
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
          {/* Histogram bars */}
          {bins.map((b, i) => {
            const barH = (b.count / maxCount) * chartHeight
            const x = i * (chartWidth / bins.length)
            const w = chartWidth / bins.length - 2
            return (
              <rect
                key={i}
                x={x}
                y={chartHeight - barH}
                width={w}
                height={barH}
                fill="#0A0A0A"
                opacity={0.85}
                className="cursor-default hover:opacity-100"
                onMouseEnter={(e) =>
                  showTip(
                    e,
                    `${fmt(b.start)}–${fmt(b.end)}: ${b.count} studies · ${((b.count / total) * 100).toFixed(1)}%`
                  )
                }
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          {/* ECDF line */}
          <polyline
            points={ecdf
              .map((y, i) => {
                const x = i * (chartWidth / bins.length) + chartWidth / bins.length / 2
                return `${x},${chartHeight - y * chartHeight}`
              })
              .join(' ')}
            fill="none"
            stroke="#FB3640"
            strokeWidth={1.5}
          />
          {ecdf.map((y, i) => {
            const x = i * (chartWidth / bins.length) + chartWidth / bins.length / 2
            return (
              <circle
                key={i}
                cx={x}
                cy={chartHeight - y * chartHeight}
                r={2.5}
                fill="#FB3640"
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `Cumulative: ${(y * 100).toFixed(1)}% of studies ≤ ${fmt(bins[i].end)}`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          {/* x-axis labels (sparse), shown in real units via tickFormatter */}
          {bins.map((b, i) => {
            if (i % Math.ceil(bins.length / 10) !== 0) return null
            const x = i * (chartWidth / bins.length)
            return (
              <text key={i} x={x} y={chartHeight + 16} fontSize={10} fill="#8A8A8A">
                {fmt(b.start)}
              </text>
            )
          })}
        </g>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-ink/85 inline-block rounded-sm" /> count
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-peripheral inline-block rounded-full" /> cumulative %
        </span>
        {xLabel && <span className="text-inkfaint">· x-axis: {xLabel}</span>}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
