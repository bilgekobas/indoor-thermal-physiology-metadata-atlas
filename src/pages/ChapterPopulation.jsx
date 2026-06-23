import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import HistogramECDF from '../components/HistogramECDF.jsx'
import StudyIntervalPlot from '../components/StudyIntervalPlot.jsx'
import BinaryPresenceFigure from '../components/BinaryPresenceFigure.jsx'
import OverallByPeriod, { PercentLinesByPeriod } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// Diverging dot-strip: each dot is one study's (male mean − female mean)
// for age or BMI. Zero line = perfectly matched sub-samples. Axis units and
// the "flagged" threshold are stated directly under the chart, not only in
// the hover tooltip, since a reader scanning the chart visually should be
// able to tell what "pink" means without interacting.
function SexDivergenceChart({ rows, metric, unit, domain, flagThreshold }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const filtered = rows.filter((r) => r.metric === metric).sort((a, b) => a.diff - b.diff)
  const W = 600, rowH = 4
  const H = filtered.length * rowH
  const [domainMin, domainMax] = domain
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W
  const nFlagged = filtered.filter((r) => Math.abs(r.diff) > flagThreshold).length
  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">
        {filtered.length} studies · x-axis: male mean − female mean ({unit || 'unitless'}) · 0 = perfectly matched
      </div>
      <svg width={W + 20} height={H + 20} className="font-data overflow-visible">
        <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={H} stroke="#D5FF99" strokeWidth={1} opacity={0.5} />
        {filtered.map((r, i) => {
          const y = i * rowH + rowH / 2
          const flagged = Math.abs(r.diff) > flagThreshold
          return (
            <circle key={r.id} cx={xScale(r.diff)} cy={y} r={flagged ? 2.4 : 1.4}
              fill={flagged ? '#FB3640' : '#8A8A8A'}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${r.id}: male ${r.male}${unit}, female ${r.female}${unit} (diff ${r.diff > 0 ? '+' : ''}${r.diff}${unit})`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}
            />
          )
        })}
        {Array.from({ length: domainMax - domainMin + 1 }, (_, i) => domainMin + i).filter((v) => v % 2 === 0).map((v) => (
          <text key={v} x={xScale(v)} y={H + 14} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v > 0 ? `+${v}` : v}</text>
        ))}
      </svg>
      <div className="font-data text-[10px] text-inkfaint mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-peripheral inline-block" /> {nFlagged} studies differ by more than {flagThreshold}{unit}</span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function SexDistributionChart({ studies }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const barW = 3, gap = 1, H = 64
  const totalW = studies.length * (barW + gap)
  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">
        Each thin bar is one study's reported sex split (100% stacked); studies sorted left→right by ascending % male.
      </div>
      <svg width={totalW} height={H} style={{ display: 'block' }}>
        {studies.map((s, i) => {
          const x = i * (barW + gap)
          const malePx = Math.round((s.male_pct / 100) * H)
          return (
            <g key={i}
              onMouseEnter={(e) => showTip(e, `${s.id}: ${s.male}M / ${s.female}F · ${s.male_pct}% male`)}
              onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={x} y={0} width={barW} height={malePx} fill="#E4E4E4" />
              <rect x={x} y={malePx} width={barW} height={H - malePx} fill="#FB3640" />
            </g>
          )
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#E4E4E4' }} /> Male</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#FB3640' }} /> Female</span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterPopulation({ data }) {
  const {
    fig08_age, fig09_bmi, fig10_sex_distribution, fig11_sample_size,
    fig21_participant_metadata, fig22_selection_criteria,
    selection_by_period, participant_by_period, sex_disaggregated, chapter_completeness,
  } = data
  const sexSummary = fig10_sex_distribution.summary

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 2 of 8"
        title="Who was studied"
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
          { value: 22, label: 'Median sample size', color: '#FB3640' },
          { value: `${sexSummary.equal}`, label: 'studies with balanced sex split', color: '#5B5BFF' },
          { value: '~70%', label: '"healthy" used with no stated test', color: '#FB3640' },
        ]}
      />

      <CompletenessStrip
        fields={chapter_completeness.population.fields}
        nStudies={chapter_completeness.population.n_studies}
      />

      <ChapterSection
        title="Demographics"
        intro="144 of 253 studies (57%) report a balanced sex split (45–55% male); 87 (34%) skew male and only 22 (9%) skew female. Sample sizes are modest, with a median of 22 participants."
      >
        <FigureCard figNumber="8" title="Participant age" commentary={`Mean ± SD per study, sorted ascending. ${fig08_age.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD (shown as a point).`}>
          <StudyIntervalPlot
            studies={fig08_age.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} years` : `${s.id}: ${s.mean.toFixed(1)} years (SD not reported)`)}
            domain={[15, 60]} color="#FB3640" unit="" xAxisLabel="Age (years)"
          />
        </FigureCard>

        <FigureCard figNumber="9" title="Participant BMI" commentary={`Mean ± SD per study, sorted ascending. ${fig09_bmi.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD.`}>
          <StudyIntervalPlot
            studies={fig09_bmi.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} kg/m²` : `${s.id}: ${s.mean.toFixed(1)} kg/m² (SD not reported)`)}
            domain={[16, 30]} color="#D5FF99" unit="" xAxisLabel="BMI (kg/m²)"
          />
        </FigureCard>

        <FigureCard figNumber="10" title="Sex distribution" plotWidth={680} commentary={`Of ${fig10_sex_distribution.studies.length} studies reporting sex breakdown: ${sexSummary.male_gt} skew male (>55%), ${sexSummary.equal} are balanced, ${sexSummary.female_gt} skew female.`}>
          <SexDistributionChart studies={fig10_sex_distribution.studies} />
        </FigureCard>

        <FigureCard figNumber="11" title="Sample size distribution" commentary="Distribution of total participants per study (log-scaled bins so small and large studies are both visible); median is 22.">
          <HistogramECDF
            values={fig11_sample_size.studies.map((s) => Math.log10(s.n))}
            binWidth={0.15}
            xLabel="participants (n), log-scaled bins"
            tickFormatter={(v) => `n=${Math.round(10 ** v)}`}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Are male and female sub-samples actually matched?"
        intro={`When a study reports separate male and female means, are the two groups comparable on age and BMI — or is sex confounded with age or body composition within the same study? ${sex_disaggregated.data.filter((r) => r.metric === 'age').length} studies report both sexes' mean age; ${sex_disaggregated.data.filter((r) => r.metric === 'bmi').length} report both sexes' mean BMI.`}
      >
        <FigureCard title="Male − female age difference, per study" commentary={`On average male and female sub-samples are well matched (mean difference ≈0.4 years), but a few studies show a larger gap. Pink dots mark studies with more than 3 years' difference — worth checking before attributing any sex effect purely to sex.`}>
          <SexDivergenceChart rows={sex_disaggregated.data} metric="age" unit="y" domain={[-6, 6]} flagThreshold={3} />
        </FigureCard>

        <FigureCard title="Male − female BMI difference, per study" commentary="27 of 71 studies (38%) show more than a 2 kg/m² gap between male and female sub-sample BMI means — a much larger share than for age, and worth checking before attributing a sex difference in thermal response to sex alone rather than body composition.">
          <SexDivergenceChart rows={sex_disaggregated.data} metric="bmi" unit=" kg/m²" domain={[-6, 6]} flagThreshold={2} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Who was excluded, and why"
        intro={'"Healthy" is the dominant inclusion criterion (191 of 269 studies, 71%), almost always without a stated method for verifying health status. Every other criterion shown appears in well under a third of studies — few select by a specific age or BMI range, or restrict recruitment to one sex.'}
      >
        <FigureCard figNumber="22" title="Inclusion / exclusion criteria" plotWidth={900} commentary="Each column on the right is one study. Most studies report at most one or two explicit criteria beyond general health.">
          <OverallByPeriod
            minHeight={460}
            renderOverall={() => (
              <BinaryPresenceFigure bar={fig22_selection_criteria.bar} matrix={fig22_selection_criteria.matrix} fields={fig22_selection_criteria.fields} nStudies={fig22_selection_criteria.n_studies} barColor="#0A0A0A" />
            )}
            renderByPeriod={() => (
              <PercentLinesByPeriod periodData={selection_by_period.data} fields={selection_by_period.fields} periods={selection_by_period.periods} />
            )}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="What else is known about participants"
        intro="Sex (97%), age (91%), height (75%), and weight (75%) are reported in nearly every study. Thermal history, body fat, and menstrual/contraceptive status — all known to shift thermophysiological baselines — drop to under a third (see the completeness strip above)."
      >
        <FigureCard figNumber="21" title="Participant metadata collected" plotWidth={900} commentary={null}>
          <OverallByPeriod
            minHeight={430}
            renderOverall={() => (
              <BinaryPresenceFigure bar={fig21_participant_metadata.bar} matrix={fig21_participant_metadata.matrix} fields={fig21_participant_metadata.fields} nStudies={fig21_participant_metadata.n_studies} barColor="#0A0A0A" />
            )}
            renderByPeriod={() => (
              <PercentLinesByPeriod periodData={participant_by_period.data} fields={participant_by_period.fields} periods={participant_by_period.periods} />
            )}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
