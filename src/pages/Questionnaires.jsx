import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'
import PageHeader from '../components/PageHeader.jsx'

function ScaleAxisPlot({ studies, domain, lowColor, highColor, neutralLabel }) {
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
          const low = Math.min(...s.range)
          const high = Math.max(...s.range)
          return (
            <g
              key={i}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${s.id}: ${s.points}-point scale (${s.labels[0]} → ${s.labels[s.labels.length - 1]})`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke="#A8A59C" strokeWidth={0.8} opacity={0.5} />
              <circle cx={xScale(low)} cy={y} r={1.6} fill={lowColor} />
              <circle cx={xScale(high)} cy={y} r={1.6} fill={highColor} />
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
        eyebrow="Analysis · Appendix Fig. 15–16"
        title="Questionnaire scale heterogeneity"
        description="Thermal sensation scales are highly standardised across studies. Thermal comfort scales are not — point count, labels, and even the direction of the scale vary widely."
      />

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Thermal Sensation Vote (TSV)</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          {fig15_tsv_scales.n_total} studies' scales mapped onto a common axis (cold → hot). One line per study.
          {' '}77.8% use the standard 7-point ASHRAE scale.
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
