import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import OverallByPeriod, { PeriodHeatmap } from '../components/OverallByPeriod.jsx'

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
            renderByPeriod={() => {
              const periodN = Object.fromEntries(periods.map((p) => [p, protocol_by_period.data.find((d) => d.period === p)?.n || 0]))
              const totals = Object.fromEntries(RIGOR_FIELDS.map((f) => [f, protocol_by_period.data.filter((d) => d.field === f).reduce((a, d) => a + d.count, 0)]))
              return (
                <PeriodHeatmap
                  rows={RIGOR_FIELDS}
                  periods={periods}
                  periodN={periodN}
                  rowTotals={totals}
                  getCount={(field, p) => protocol_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
                />
              )
            }}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Which controls are used"
        intro="Fixed clothing insulation (209 of 269 studies, 77%) and a defined activity protocol (191, 71%) are the most common controls by far. Blinding, randomisation, and circadian/menstrual timing control each appear in well under half of studies. The overall view shows corpus-wide counts; the period view uses the same row-aligned heatmap style as the rest of the atlas."
      >
        <FigureCard figNumber="20" title="Protocol & standardisation controls" plotWidth={900} commentary={null}>
          <OverallByPeriod
            minHeight={320}
            renderOverall={() => (
              <InteractiveBarChart data={fig20_protocol.bar.map((d) => ({ label: d.field, count: d.count }))} total={fig20_protocol.n_studies} color="#0A0A0A" />
            )}
            renderByPeriod={() => (
              (() => {
                const periodN = Object.fromEntries(protocol_by_period.periods.map((p) => [p, protocol_by_period.data.find((d) => d.period === p)?.n || 0]))
                const totals = Object.fromEntries(protocol_by_period.fields.map((f) => [f, fig20_protocol.bar.find((d) => d.field === f)?.count || 0]))
                return (
                  <PeriodHeatmap
                    rows={protocol_by_period.fields}
                    periods={protocol_by_period.periods}
                    periodN={periodN}
                    rowTotals={totals}
                    getCount={(field, p) => protocol_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
                  />
                )
              })()
            )}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
