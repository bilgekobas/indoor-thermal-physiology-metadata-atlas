import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import BinaryPresenceFigure from '../components/BinaryPresenceFigure.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import OverallByPeriod, { PercentLinesByPeriod } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// The "rigor over time" narrative focuses on these six fields specifically
// (out of protocol_by_period's full set) — picked for the line chart
// because they're the ones a methods reviewer would ask about first
// (blinding, randomisation, balance, timing controls), not because they're
// computed any differently from the rest. All six are guaranteed present
// in protocol_by_period via its extra_cols argument (see build_data.py),
// so this chart and the Fig. 20 bar/matrix below are reading the exact same
// numbers — there used to be a second, independently computed field set
// here that quietly drifted out of sync with Fig. 20; that's gone now.
const RIGOR_FIELDS = ['Randomisation', 'Balanced session order', 'Blinding', 'Circadian control', 'Menstrual timing control', 'Time between sessions']
const RIGOR_COLORS = {
  'Randomisation': '#5B5BFF', 'Balanced session order': '#0A0A0A', 'Blinding': '#FB3640',
  'Circadian control': '#8A8A8A', 'Menstrual timing control': '#4A4A4A', 'Time between sessions': '#BBBBBB',
}

function RigorLines({ periodData, fields, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600, H = 170
  const xStep = W / (periods.length - 1)
  const yScale = (pct) => H - (pct / 100) * H
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1">y-axis: % of studies in that period reporting the control</div>
      <svg width={W + 20} height={H + 24} className="font-data overflow-visible">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={yScale(g)} y2={yScale(g)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={W + 4} y={yScale(g) + 3} fontSize={9} fill="#8A8A8A">{g}%</text>
          </g>
        ))}
        {fields.map((field) => {
          const points = periods.map((p, i) => {
            const r = periodData.find((d) => d.period === p && d.field === field)
            return { x: i * xStep, y: yScale(r?.pct || 0), pct: r?.pct || 0, count: r?.count || 0, n: r?.n || 0 }
          })
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
        {periods.map((p, i) => (<text key={p} x={i * xStep} y={H + 16} fontSize={10} fill="#8A8A8A" textAnchor="middle">{p}</text>))}
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
function RigorOverallBar({ periodData, fields }) {
  const totals = fields.map((f) => {
    const rows = periodData.filter((d) => d.field === f)
    const sumCount = rows.reduce((a, d) => a + d.count, 0)
    const sumN = rows.reduce((a, d) => a + d.n, 0)
    return { label: f, count: sumCount, n: sumN }
  })
  return (
    <InteractiveBarChart
      data={totals.map((t) => ({ label: t.label, count: t.count }))}
      total={totals[0]?.n || 1}
      color="#0A0A0A"
    />
  )
}

export default function ChapterProtocol({ data }) {
  const { fig20_protocol, protocol_by_period, chapter_completeness } = data
  const periods = protocol_by_period.periods
  const randoRows = protocol_by_period.data.filter((d) => d.field === 'Randomisation')
  const firstPct = randoRows.find((d) => d.period === periods[0])?.pct ?? 0
  const lastPct = randoRows.find((d) => d.period === periods[periods.length - 1])?.pct ?? 0
  const randoChange = lastPct - firstPct

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
          { value: '77.4%', label: 'fix clothing insulation', color: '#0A0A0A' },
          {
            value: `${randoChange >= 0 ? '+' : ''}${randoChange.toFixed(0)} pct. pts`,
            label: `change in randomisation rate, ${periods[0]}→${periods[periods.length - 1]}`,
            color: '#5B5BFF',
          },
        ]}
      />

      <CompletenessStrip fields={chapter_completeness.protocol.fields} nStudies={chapter_completeness.protocol.n_studies} />

      <ChapterSection
        title="Has rigor improved as the field has grown?"
        intro="Blinding rose from 0% of studies in 2013–14 to 29% in 2023–24 — a real gain. Randomisation barely moved (an increase of 7 percentage points, on small early-period samples), and circadian control still sits under 40% even in the most recent period. Rigor has improved unevenly, not uniformly, as the field has grown."
      >
        <FigureCard title="Protocol controls reported, by period" plotWidth={680} commentary={null}>
          <OverallByPeriod
            minHeight={260}
            earliestPeriodCaveat="2013–14 and 2015–16 have few studies; read early-period percentages cautiously."
            renderOverall={() => <RigorOverallBar periodData={protocol_by_period.data} fields={RIGOR_FIELDS} />}
            renderByPeriod={() => <RigorLines periodData={protocol_by_period.data} fields={RIGOR_FIELDS} periods={periods} />}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Which controls are used, study by study"
        intro="Fixed clothing insulation (209 of 269 studies, 77%) and a defined activity protocol (191, 71%) are the most common controls by far. Blinding, randomisation, and circadian/menstrual timing control each appear in well under half of studies. Each column in the matrix on the right is one study, row-aligned with the bar to its left."
      >
        <FigureCard figNumber="20" title="Protocol & standardisation controls" plotWidth={900} commentary={null}>
          <OverallByPeriod
            minHeight={320}
            renderOverall={() => (
              <BinaryPresenceFigure bar={fig20_protocol.bar} matrix={fig20_protocol.matrix} fields={fig20_protocol.fields} nStudies={fig20_protocol.n_studies} barColor="#0A0A0A" />
            )}
            renderByPeriod={() => (
              <PercentLinesByPeriod periodData={protocol_by_period.data} fields={protocol_by_period.fields} periods={protocol_by_period.periods} palette={['#0A0A0A', '#5B5BFF', '#FB3640', '#8A8A8A', '#4A4A4A', '#BBBBBB', '#BBBBBB', '#E4E4E4']} />
            )}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
