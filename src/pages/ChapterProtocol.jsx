import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { PeriodHeatmap } from '../components/OverallByPeriod.jsx'

export default function ChapterProtocol({ data }) {
  const { fig20_protocol, protocol_by_period, chapter_completeness } = data
  const periodN = Object.fromEntries(
    protocol_by_period.data
      .filter((d, idx, arr) => arr.findIndex((x) => x.period === d.period) === idx)
      .map((d) => [d.period, d.n])
  )

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
              We looked for these specific controls because they are the standard toolkit for any human
              experiment, not unique to thermal physiology. Their absence is therefore a meaningful
              signal about methodological maturity.
            </p>
          </>
        }
        headline={[
          { value: '77.4%', label: 'fix clothing insulation', color: '#0A0A0A' },
          { value: '70.7%', label: 'define an activity protocol', color: '#5B5BFF' },
        ]}
      />

      <ChapterSection
        title="Which controls are used"
        intro="Fixed clothing insulation and a defined activity protocol are the only controls used by clear majorities of studies. Everything else drops off quickly. The heatmap shows how often each control appears within each two-year period, while the aligned bar at right gives the corpus-wide total count for the same row."
      >
        <FigureCard figNumber="20" title="Protocol & standardisation controls" plotWidth={980} commentary="Rows are controls; columns are 2-year periods; the right-hand bar gives the overall count for the same row, scaled relative to the largest row total.">
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
