import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { PeriodHeatmap } from '../components/OverallByPeriod.jsx'

const RIGOR_FIELDS = ['Randomisation', 'Balanced session order', 'Blinding', 'Circadian control', 'Menstrual timing control', 'Time between sessions']

export default function ChapterProtocol({ data }) {
  const { fig20_protocol, protocol_by_period, chapter_completeness } = data
  const periods = protocol_by_period.periods
  const periodN = Object.fromEntries(periods.map((p) => [p, protocol_by_period.data.find((d) => d.period === p)?.n || 0]))
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
        <FigureCard title="Protocol controls reported, by period" plotWidth={980} commentary="Rows are controls; columns are 2-year periods; the final column shows the corpus-wide total count for the same row.">
          <PeriodHeatmap
            rows={RIGOR_FIELDS}
            periods={periods}
            periodN={periodN}
            rowTotals={Object.fromEntries(RIGOR_FIELDS.map((f) => [f, protocol_by_period.data.filter((d) => d.field === f).reduce((a, d) => a + d.count, 0)]))}
            getCount={(field, p) => protocol_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
            labelWidth={210}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Which controls are used"
        intro="Fixed clothing insulation (209 of 269 studies, 77%) and a defined activity protocol (191, 71%) are the most common controls by far. Blinding, randomisation, and circadian/menstrual timing control each appear in well under half of studies. The view below keeps the same row-aligned heatmap style used elsewhere in the atlas."
      >
        <FigureCard figNumber="20" title="Protocol & standardisation controls" plotWidth={980} commentary="Rows are controls; columns are 2-year periods; the final column shows the corpus-wide total count for the same row.">
          <PeriodHeatmap
            rows={protocol_by_period.fields}
            periods={protocol_by_period.periods}
            periodN={periodN}
            rowTotals={Object.fromEntries(fig20_protocol.bar.map((d) => [d.field, d.count]))}
            getCount={(field, p) => protocol_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
            labelWidth={230}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
