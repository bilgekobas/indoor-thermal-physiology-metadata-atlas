import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'
import PageHeader from '../components/PageHeader.jsx'

// A study's scale isn't just a min/max span - many studies use a small set of
// verbally-anchored positions (e.g. the 7-point ASHRAE wording) but were
// administered at finer numeric granularity (e.g. "25-point" = 0.25 steps
// between anchors, "13-point" = 0.5 steps). Each row is drawn like a ruler:
// small unlabeled ticks mark every position the scale actually offered,
// while larger dots mark the positions that carry a verbal label. The
// neutral/center anchor is called out in black so it reads consistently
// across rows regardless of point count.
function ScaleAxisPlot({ studies, domain, lowColor, highColor }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [domainMin, domainMax] = domain
  const width = 640
  const rowHeight = 3
  const height = studies.length * rowHeight
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * width

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height + 24} className="font-data overflow-visible">
        <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={height} stroke="#B8C020" strokeWidth={1} opacity={0.4} />
        {studies.map((s, i) => {
          const y = i * rowHeight + rowHeight / 2
          const grid = s.grid && s.grid.length ? s.grid : s.range.map((v, j) => ({
            value: v, label: s.labels[j], is_anchor: true, is_neutral: v === 0,
          }))
          const low = Math.min(...grid.map((g) => g.value))
          const high = Math.max(...grid.map((g) => g.value))
          const anchors = grid.filter((g) => g.is_anchor)
          const firstLabel = anchors[0]?.label ?? s.labels[0]
          const lastLabel = anchors[anchors.length - 1]?.label ?? s.labels[s.labels.length - 1]
          const stepCount = grid.length
          const anchorCount = anchors.length
          const tooltipText = anchorCount < stepCount
            ? `${s.id}: ${stepCount}-point scale, ${anchorCount} labelled anchors (${firstLabel} → ${lastLabel}) with ${stepCount - anchorCount} interpolated steps`
            : `${s.id}: ${stepCount}-point scale (${firstLabel} → ${lastLabel})`

          return (
            <g
              key={i}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, tooltipText)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke="#A8A59C" strokeWidth={0.8} opacity={0.5} />
              {grid.map((g, j) => {
                if (!g.is_anchor) {
                  // interpolated / unlabeled step - small neutral tick
                  return <circle key={j} cx={xScale(g.value)} cy={y} r={0.5} fill="#A8A59C" opacity={0.55} />
                }
                const isFirst = g.value === low
                const isLast = g.value === high
                const fill = g.is_neutral ? '#1A1A1A' : isFirst ? lowColor : isLast ? highColor : '#7A776E'
                return <circle key={j} cx={xScale(g.value)} cy={y} r={g.is_neutral ? 1.7 : 1.6} fill={fill} />
              })}
            </g>
          )
        })}
        {Array.from({ length: domainMax - domainMin + 1 }, (_, i) => domainMin + i).map((v) => (
          <text key={v} x={xScale(v)} y={height + 14} fontSize={10} fill="#A8A59C" textAnchor="middle">
            {v}
          </text>
        ))}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function PointsBar({ distribution, total, color }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const max = Math.max(...distribution.map((d) => d.count), 1)
  return (
    <div className="space-y-1.5">
      {distribution.map((d) => (
        <div key={d.points} className="flex items-center gap-3 group">
          <span className="text-[12px] w-20 shrink-0 font-data">{d.points}-point</span>
          <div
            className="flex-1 h-5 rounded bg-line/50 overflow-hidden cursor-default"
            onMouseEnter={(e) => showTip(e, `${d.points}-point scale: ${d.count} of ${total} studies · ${((d.count / total) * 100).toFixed(1)}%`)}
            onMouseMove={moveTip}
            onMouseLeave={hideTip}
          >
            <div className="h-full group-hover:brightness-110" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <span className="font-data text-[11px] w-10 text-right text-inkmid">{d.count}</span>
        </div>
      ))}
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function Questionnaires({ data }) {
  const { fig15_tsv_scales, fig16_tcv_scales } = data

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Fig. 15–16"
        title="Questionnaire scale heterogeneity"
        description="Thermal sensation scales are highly standardised across studies. Thermal comfort scales are not — point count, labels, and even the direction of the scale vary widely."
      />

      <div className="px-10 pt-6 flex items-center gap-5 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-inkmid" /> labelled anchor</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" /> neutral / centre anchor</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-1 h-1 rounded-full bg-[#A8A59C]" /> unlabelled interpolated step</span>
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Thermal Sensation Vote (TSV)</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          {fig15_tsv_scales.n_total} studies' scales mapped onto a common axis (cold → hot). Most use the same
          7 verbal anchors; higher point counts (e.g. 13, 25) are usually that same 7-point scale with extra
          unlabelled steps interpolated in between, shown here as fine ticks rather than a wider vocabulary.
        </p>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <ScaleAxisPlot
              studies={fig15_tsv_scales.studies}
              domain={[-4, 8]}
              lowColor="#4855C8"
              highColor="#D94F6E"
            />
          </div>
          <div>
            <h3 className="text-[12.5px] font-medium mb-2 text-inkmid">Points per scale</h3>
            <PointsBar distribution={fig15_tsv_scales.points_distribution} total={fig15_tsv_scales.n_total} color="#4855C8" />
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Thermal Comfort Vote (TCV)</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          {fig16_tcv_scales.n_total} studies' scales mapped the same way (most comfortable → least). Far more
          heterogeneous than TSV: point counts, labels, and what the "center" represents all vary.
        </p>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <ScaleAxisPlot
              studies={fig16_tcv_scales.studies}
              domain={[-4, 6]}
              lowColor="#D94F6E"
              highColor="#E0B020"
            />
          </div>
          <div>
            <h3 className="text-[12.5px] font-medium mb-2 text-inkmid">Points per scale</h3>
            <PointsBar distribution={fig16_tcv_scales.points_distribution} total={fig16_tcv_scales.n_total} color="#D94F6E" />
          </div>
        </div>
      </div>
    </div>
  )
}
