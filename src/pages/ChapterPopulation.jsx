import { useMemo } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import StudyIntervalPlot from '../components/StudyIntervalPlot.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import { PeriodHeatmap } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function SampleSizeHistogramLinear({ studies, maxDisplay = 100, binWidth = 5, color = '#5B5BFF', width = 960 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const values = studies.map((s) => Number(s.n)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (!values.length) return <div className="text-[12px] text-inkfaint">No data available.</div>

  const bins = []
  for (let start = 0; start < maxDisplay; start += binWidth) bins.push({ start, end: start + binWidth, count: 0, overflow: false })
  bins.push({ start: maxDisplay, end: Infinity, count: 0, overflow: true })
  values.forEach((v) => {
    const idx = v >= maxDisplay ? bins.length - 1 : Math.min(Math.floor(v / binWidth), bins.length - 2)
    bins[idx].count += 1
  })

  const total = values.length
  const maxCount = Math.max(...bins.map((b) => b.count), 1)
  let cum = 0
  const ecdf = bins.map((b) => {
    cum += b.count
    return cum / total
  })

  const chartHeight = 180
  const yAxisW = 34
  const binW = width / bins.length
  const mid = Math.floor(values.length / 2)
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2

  return (
    <div>
      <svg width={width + yAxisW} height={chartHeight + 34} className="font-data block overflow-visible">
        {[0, 0.5, 1].map((frac) => (
          <g key={frac}>
            <line x1={yAxisW} x2={width + yAxisW} y1={chartHeight * (1 - frac)} y2={chartHeight * (1 - frac)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={yAxisW - 4} y={chartHeight * (1 - frac) + 3} fontSize={9} fill="#8A8A8A" textAnchor="end">
              {Math.round(maxCount * frac)}
            </text>
          </g>
        ))}
        <text x={0} y={10} fontSize={9} fill="#8A8A8A">studies</text>
        <g transform={`translate(${yAxisW}, 0)`}>
          {bins.map((b, i) => {
            const barH = (b.count / maxCount) * chartHeight
            const x = i * binW
            const w = Math.max(1, binW - 2)
            const label = b.overflow ? `${maxDisplay}+` : `${b.start}–${b.end}`
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
                onMouseEnter={(e) => showTip(e, `${label} participants: ${b.count} studies · ${((b.count / total) * 100).toFixed(1)}%`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          <polyline points={[`0,${chartHeight}`].concat(ecdf.map((y, i) => `${(i + 1) * binW},${chartHeight - y * chartHeight}`)).join(' ')} fill="none" stroke={color} strokeWidth={1.6} />
          {ecdf.map((y, i) => (
            <circle
              key={i}
              cx={(i + 1) * binW}
              cy={chartHeight - y * chartHeight}
              r={2.6}
              fill={color}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `Cumulative through this bin: ${(y * 100).toFixed(1)}% of studies ${bins[i].overflow ? `≥ ${maxDisplay}` : `≤ ${bins[i].end}`} participants`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          ))}
          {bins.map((b, i) => {
            const show = i % 2 === 0 || i === bins.length - 1
            if (!show) return null
            return (
              <text key={i} x={i * binW + (b.overflow ? binW / 2 : 0)} y={chartHeight + 16} fontSize={9.5} fill="#8A8A8A" textAnchor={b.overflow ? 'middle' : 'start'}>
                {b.overflow ? `${maxDisplay}+` : b.start}
              </text>
            )
          })}
        </g>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-inkmid flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm bg-ink/85" /> count</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-full" style={{ background: color }} /> cumulative %</span>
        <span className="text-inkfaint">· x-axis: participants per study, linear bins of {binWidth}; final bin = {maxDisplay}+.</span>
      </div>
      <div className="font-data text-[10.5px] text-inkfaint mt-1">Median sample size = {median.toFixed(0)} participants.</div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function SexDistributionChart({ studies, width = 960 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const H = 120
  const yAxisW = 30
  const n = studies.length
  const barSlot = width / Math.max(n, 1)
  const barW = Math.max(1.3, barSlot * 0.82)
  return (
    <div>
      <svg width={width + yAxisW} height={H + 2} style={{ display: 'block' }}>
        {[0, 50, 100].map((pct) => {
          const y = H - (pct / 100) * H
          return (
            <g key={pct}>
              <line x1={yAxisW} x2={width + yAxisW} y1={y} y2={y} stroke="#E4E4E4" strokeWidth={1} />
              <text x={yAxisW - 4} y={y + 3} fontSize={9} fill="#8A8A8A" textAnchor="end" className="font-data">{pct}%</text>
            </g>
          )
        })}
        <g transform={`translate(${yAxisW},0)`}>
          {studies.map((s, i) => {
            const x = i * barSlot + (barSlot - barW) / 2
            const malePx = (s.male_pct / 100) * H
            return (
              <g
                key={i}
                onMouseEnter={(e) => showTip(e, `${s.id}: ${s.male}M / ${s.female}F · ${s.male_pct}% male`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
                className="cursor-default"
              >
                <rect x={x} y={0} width={barW} height={malePx} fill="#E4E4E4" />
                <rect x={x} y={malePx} width={barW} height={H - malePx} fill="#0A0A0A" />
              </g>
            )
          })}
        </g>
      </svg>
      <div className="flex gap-4 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#E4E4E4' }} /> Male</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#0A0A0A' }} /> Female</span>
      </div>
      <div className="font-data text-[10px] text-inkfaint mt-1">
        Each thin bar is one study's reported sex split (100% stacked); studies are sorted left→right by ascending % male.
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterPopulation({ data }) {
  const {
    fig08_age,
    fig09_bmi,
    fig10_sex_distribution,
    fig11_sample_size,
    fig21_participant_metadata,
    fig22_selection_criteria,
    selection_by_period,
    participant_by_period,
    chapter_completeness,
    sample_justification,
  } = data

  const sampleSizes = useMemo(() => fig11_sample_size.studies.map((s) => Number(s.n)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b), [fig11_sample_size])
  const medianSampleSize = useMemo(() => {
    const mid = Math.floor(sampleSizes.length / 2)
    return sampleSizes.length % 2 ? sampleSizes[mid] : (sampleSizes[mid - 1] + sampleSizes[mid]) / 2
  }, [sampleSizes])

  const sexSummary = useMemo(() => {
    const studies = fig10_sex_distribution.studies || []
    let male_gt = 0, equal = 0, female_gt = 0
    studies.forEach((s) => {
      if (s.male_pct > 55) male_gt += 1
      else if (s.male_pct < 45) female_gt += 1
      else equal += 1
    })
    return { male_gt, equal, female_gt, total: studies.length }
  }, [fig10_sex_distribution])

  const balancedPct = sexSummary.total ? ((sexSummary.equal / sexSummary.total) * 100).toFixed(0) : '0'
  const malePct = sexSummary.total ? ((sexSummary.male_gt / sexSummary.total) * 100).toFixed(0) : '0'
  const femalePct = sexSummary.total ? ((sexSummary.female_gt / sexSummary.total) * 100).toFixed(0) : '0'

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 2 of 7"
        title="Who is studied"
        framing={
          <>
            <p>
              This chapter is about the human beings inside the experiments: how many, how old, what
              body composition, what sex balance — and, just as importantly, who was excluded from
              participating and what else was known about the people who took part.
            </p>
            <p>
              We looked at selection criteria and participant metadata together with the basic
              demographics because they answer the same underlying question from two directions: age,
              BMI, and sex describe who's typically recruited; exclusion criteria and metadata like
              thermal history or menstrual status describe what else might be quietly shaping the
              physiological baseline of that sample.
            </p>
          </>
        }
        headline={[
          { value: `${medianSampleSize.toFixed(0)}`, label: 'Median sample size', color: '#5B5BFF' },
          { value: `${balancedPct}%`, label: 'balanced sex split', color: '#5B5BFF' },
          { value: '~70%', label: '"healthy" used with no stated test', color: '#0A0A0A' },
        ]}
      />

      <ChapterSection
        title="Demographics"
        intro={`${sexSummary.equal} of ${sexSummary.total} studies (${balancedPct}%) report a balanced sex split (45–55% male); ${sexSummary.male_gt} (${malePct}%) skew male and only ${sexSummary.female_gt} (${femalePct}%) skew female. Sample sizes are modest, with a median of ${medianSampleSize.toFixed(0)} participants.`}
      >
        <FigureCard figNumber="13" title="Participant age" plotWidth={940} commentary={`Mean ± SD per study, sorted ascending by mean. ${fig08_age.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD; these appear as a mean point with no range.`}>
          <StudyIntervalPlot
            studies={fig08_age.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getMid={(s) => s.mean}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} years` : `${s.id}: ${s.mean.toFixed(1)} years (SD not reported)`)}
            domain={[15, 60]}
            color="#5B5BFF"
            xAxisLabel="Age (years)"
            tickStep={5}
            width={900}
          />
        </FigureCard>

        <FigureCard figNumber="14" title="Participant BMI" plotWidth={940} commentary={`Mean ± SD per study, sorted ascending by mean. ${fig09_bmi.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD; these appear as a mean point with no range.`}>
          <StudyIntervalPlot
            studies={fig09_bmi.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getMid={(s) => s.mean}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} kg/m²` : `${s.id}: ${s.mean.toFixed(1)} kg/m² (SD not reported)`)}
            domain={[16, 30]}
            color="#5B5BFF"
            xAxisLabel="BMI (kg/m²)"
            tickStep={2}
            width={900}
          />
        </FigureCard>

        <FigureCard figNumber="15" title="Sex distribution" plotWidth={980} commentary={`Of ${fig10_sex_distribution.studies.length} studies reporting sex breakdown: ${sexSummary.male_gt} skew male (>55%), ${sexSummary.equal} are balanced, and ${sexSummary.female_gt} skew female.`}>
          <SexDistributionChart studies={fig10_sex_distribution.studies} width={920} />
        </FigureCard>

        <FigureCard figNumber="16" title="Sample size distribution" plotWidth={980} commentary={`Distribution of total participants per study, shown on a linear participant scale with an overflow bin at 100+ so the shape remains intuitive while still retaining the largest studies. Median is ${medianSampleSize.toFixed(0)}.`}>
          <SampleSizeHistogramLinear studies={fig11_sample_size.studies} maxDisplay={100} binWidth={5} color="#5B5BFF" width={920} />
        </FigureCard>
      </ChapterSection>



      <ChapterSection
        title="Was sample size justified?"
        intro="Sample size belongs with the population story: it conditions how much confidence we can place in all subgroup claims later in the paper."
      >
        <FigureCard figNumber="17" title="Sample size calculation type" plotWidth={560} commentary="Among studies that justify sample size at all, most use an a priori power calculation rather than post-hoc reasoning or simple precedent from earlier literature.">
          <InteractiveBarChart
            data={sample_justification.calc_type_distribution.map((d) => ({ label: d.type, count: d.count }))}
            total={sample_justification.calc_type_distribution.reduce((a, d) => a + d.count, 0)}
            color="#0A0A0A"
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Who was excluded, and why"
        intro={'"Healthy" is the dominant inclusion criterion, almost always without a stated method for verifying health status. Every other criterion shown appears in well under a third of studies — few select by a specific age or BMI range, or restrict recruitment to one sex.'}
      >
        <FigureCard figNumber="18" title="Inclusion / exclusion criteria" plotWidth={980} commentary="Rows are fields; columns are 2-year periods; the final column shows the corpus-wide total count for the same row.">
          <PeriodHeatmap
            rows={selection_by_period.fields}
            periods={selection_by_period.periods}
            periodN={Object.fromEntries(selection_by_period.data.filter((d, idx, arr) => arr.findIndex((x) => x.period === d.period) === idx).map((d) => [d.period, d.n]))}
            rowTotals={Object.fromEntries(fig22_selection_criteria.bar.map((d) => [d.field, d.count]))}
            getCount={(field, p) => selection_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
            labelWidth={210}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="What else is known about participants"
        intro="Sex, age, height, and weight are reported in nearly every study. Thermal history, body fat, and menstrual or contraceptive status — all known to shift thermophysiological baselines — are reported much less often."
      >
        <FigureCard figNumber="19" title="Participant metadata collected" plotWidth={980} commentary="Rows are fields; columns are 2-year periods; the final column shows the corpus-wide total count for the same row.">
          <PeriodHeatmap
            rows={participant_by_period.fields}
            periods={participant_by_period.periods}
            periodN={Object.fromEntries(participant_by_period.data.filter((d, idx, arr) => arr.findIndex((x) => x.period === d.period) === idx).map((d) => [d.period, d.n]))}
            rowTotals={Object.fromEntries(fig21_participant_metadata.bar.map((d) => [d.field, d.count]))}
            getCount={(field, p) => participant_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
            labelWidth={210}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
