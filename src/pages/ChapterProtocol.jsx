import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import BinaryPresenceFigure from '../components/BinaryPresenceFigure.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import OverallByPeriod, { PercentLinesByPeriod } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const RIGOR_COLORS = {
  'Randomisation': '#D94F6E', 'Balanced order': '#4855C8', 'Blinding': '#E07820',
  'Circadian control': '#B8C020', 'Menstrual timing control': '#8A8A86', 'Time between sessions controlled': '#C9698A',
}
function RigorLines({ rigorData, fields }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const periods = rigorData.map((d) => d.period)
  const W = 600, H = 170
  const xStep = W / (periods.length - 1)
  const yScale = (pct) => H - (pct / 100) * H
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1">y-axis: % of studies in that period reporting the control</div>
      <svg width={W + 20} height={H + 24} className="font-data overflow-visible">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={yScale(g)} y2={yScale(g)} stroke="#E2DED4" strokeWidth={1} />
            <text x={W + 4} y={yScale(g) + 3} fontSize={9} fill="#A8A59C">{g}%</text>
          </g>
        ))}
        {fields.map((field) => {
          const points = rigorData.map((d, i) => ({ x: i * xStep, y: yScale(d[field].pct), pct: d[field].pct, count: d[field].count, n: d.n_studies }))
          return (
            <g key={field}>
              <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={RIGOR_COLORS[field]} strokeWidth={1.8} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={RIGOR_COLORS[field]} className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${field}, ${periods[i]}: ${p.count} of ${p.n} · ${p.pct}%`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              ))}
            </g>
          )
        })}
        {periods.map((p, i) => (<text key={p} x={i * xStep} y={H + 16} fontSize={10} fill="#A8A59C" textAnchor="middle">{p}</text>))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {fields.map((f) => (
          <div key={f} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: RIGOR_COLORS[f] }} />{f}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

// Overall summary bar for the same 6 rigor fields shown by-period below —
// gives a single-glance baseline before toggling to see the trend.
function RigorOverallBar({ rigorData, fields }) {
  const totals = fields.map((f) => {
    const sumCount = rigorData.reduce((a, d) => a + d[f].count, 0)
    const sumN = rigorData.reduce((a, d) => a + d.n_studies, 0)
    return { label: f, count: sumCount, n: sumN }
  })
  return (
    <InteractiveBarChart
      data={totals.map((t) => ({ label: t.label, count: t.count }))}
      total={totals[0]?.n || 1}
      color="#1A1A18"
    />
  )
}

export default function ChapterProtocol({ data }) {
  const { evo_protocol_rigor, fig20_protocol, protocol_by_period, chapter_completeness } = data
  const firstPeriod = evo_protocol_rigor.data[0]
  const lastPeriod = evo_protocol_rigor.data[evo_protocol_rigor.data.length - 1]
  const randoChange = lastPeriod['Randomisation'].pct - firstPeriod['Randomisation'].pct

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 7 of 8"
        title="How rigorous was the protocol"
        framing={
          <>
            <p>
              Beyond who was studied and what was measured, this chapter asks how carefully the
              measurement itself was controlled: clothing and activity standardisation, blinding and
              randomisation, and control for circadian and menstrual timing.
            </p>
            <p>
              We looked for these specific controls because they're the standard toolkit for any human
              experiment, not unique to thermal physiology — their absence is therefore a meaningful
              signal about methodological maturity, not just a quirk of this field's conventions.
            </p>
          </>
        }
        headline={[
          { value: '77.4%', label: 'fix clothing insulation', color: '#1A1A18' },
          { value: `${randoChange >= 0 ? '+' : ''}${randoChange.toFixed(0)}pt`, label: `change in randomisation, ${firstPeriod.period}→${lastPeriod.period}`, color: '#D94F6E' },
        ]}
      />

      <CompletenessStrip fields={chapter_completeness.protocol.fields} nStudies={chapter_completeness.protocol.n_studies} />

      <ChapterSection
        title="Has rigor improved as the field has grown?"
        intro="Blinding rose from 0% of studies in 2013–14 to 29% in 2023–24 — a real gain. Randomisation barely moved (36% to 44%, on small early-period samples), and circadian control still sits under 40% even in the most recent period. Rigor has improved unevenly, not uniformly, as the field has grown."
      >
        <FigureCard title="Protocol controls reported, by period" plotWidth={680} commentary={null}>
          <OverallByPeriod
            earliestPeriodCaveat="2013–14 and 2015–16 have few studies; read early-period percentages cautiously."
            renderOverall={() => <RigorOverallBar rigorData={evo_protocol_rigor.data} fields={evo_protocol_rigor.fields} />}
            renderByPeriod={() => <RigorLines rigorData={evo_protocol_rigor.data} fields={evo_protocol_rigor.fields} />}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Which controls are used, study by study"
        intro="Fixed clothing insulation (209 of 269 studies, 77%) and a defined activity protocol (191, 71%) are the most common controls by far. Blinding, randomisation, and circadian/menstrual timing control each appear in well under half of studies. Each column in the matrix on the right is one study."
      >
        <FigureCard figNumber="20" title="Protocol & standardisation controls" plotWidth={900} commentary={null}>
          <OverallByPeriod
            renderOverall={() => (
              <BinaryPresenceFigure bar={fig20_protocol.bar} matrix={fig20_protocol.matrix} fields={fig20_protocol.fields} nStudies={fig20_protocol.n_studies} barColor="#1A1A18" />
            )}
            renderByPeriod={() => (
              <PercentLinesByPeriod periodData={protocol_by_period.data} fields={protocol_by_period.fields} periods={protocol_by_period.periods} />
            )}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
