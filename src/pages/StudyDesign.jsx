import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import HistogramECDF from '../components/HistogramECDF.jsx'
import StudyIntervalPlot from '../components/StudyIntervalPlot.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// SVG-based normalised sex distribution chart — each study is a thin bar
// split between male (gray) and female (pink) proportion.
function SexDistributionChart({ studies }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const barW = 3
  const gap = 1
  const H = 64
  const totalW = studies.length * (barW + gap)

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={H} style={{ display: 'block' }}>
        {studies.map((s, i) => {
          const x = i * (barW + gap)
          const malePx = Math.round((s.male_pct / 100) * H)
          const femPx = H - malePx
          return (
            <g key={i}
              onMouseEnter={(e) => showTip(e, `${s.id}: ${s.male}M / ${s.female}F · ${s.male_pct}% male`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
              className="cursor-default"
            >
              <rect x={x} y={0} width={barW} height={malePx} fill="#E2DED4" />
              <rect x={x} y={malePx} width={barW} height={femPx} fill="#D94F6E" />
            </g>
          )
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#E2DED4' }} /> Male
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: '#D94F6E' }} /> Female
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function StudyDesign({ data }) {
  const {
    fig01_pubs_by_year, fig02_geography, fig03_session_length, fig04_normalisation_length,
    fig06_setting_typology, fig07_temperature_ranges, fig08_age, fig09_bmi,
    fig10_sex_distribution, fig11_sample_size, summary,
  } = data

  // Each sub-section that needs hover gets its own tooltip state
  const yearTip = useTooltip()

  const maxYearCount = fig01_pubs_by_year.data.reduce((m, d) => d.count > m ? d.count : m, 1)
  const totalPubs = fig01_pubs_by_year.data.reduce((a, d) => a + d.count, 0)

  const typeRollup = useMemo(() => {
    const map = {}
    fig06_setting_typology.data.forEach((r) => {
      map[r['exp-type']] = (map[r['exp-type']] || 0) + r.count
    })
    return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  }, [fig06_setting_typology])

  const typologyDetail = useMemo(() => {
    return [...fig06_setting_typology.data].sort((a, b) => b.count - a.count).slice(0, 12)
  }, [fig06_setting_typology])

  const sexSummary = fig10_sex_distribution.summary

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 1–11"
        title="Study design & context"
        description="When, where, and how indoor thermal-physiology experiments are conducted: publication timeline, geography, session timing, settings, target conditions, and sample composition."
      />

      {/* Fig 1: Publications by year */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Publications by year</h2>
        <p className="text-[13px] text-inkmid mb-5">
          {summary.n_publications} publications, {summary.year_min}–{summary.year_max}. Hover a bar for the exact count and share.
        </p>
        <div className="flex gap-2 items-end h-40 max-w-3xl">
          {fig01_pubs_by_year.data.map((d) => (
            <div key={d.year} className="flex-1 flex flex-col items-center group">
              <div
                className="w-full rounded-sm bg-ink/85 group-hover:bg-peripheral transition-colors cursor-default"
                style={{ height: `${(d.count / maxYearCount) * 130}px` }}
                onMouseEnter={(e) => yearTip.showTip(e, `${d.year}: ${d.count} publications · ${((d.count / totalPubs) * 100).toFixed(1)}%`)}
                onMouseMove={yearTip.moveTip}
                onMouseLeave={yearTip.hideTip}
              />
              <div className="font-data text-[10px] text-inkfaint mt-1.5">{d.year}</div>
            </div>
          ))}
        </div>
        <TooltipPortal tip={yearTip.tip} />
      </div>

      {/* Fig 2: Geography */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Geographical distribution</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Research concentrates in a small number of countries; hot-climate regions are sparsely represented.
        </p>
        <InteractiveBarChart
          data={fig02_geography.data.map((d) => ({ label: d.country, count: d.count }))}
          total={summary.n_publications}
          color="#D94F6E"
          maxBars={15}
        />
      </div>

      {/* Fig 3 & 4: Session length, normalisation */}
      <div className="px-10 py-8 border-b border-line grid grid-cols-2 gap-10">
        <div>
          <h2 className="text-[16px] font-semibold mb-1">Session length</h2>
          <p className="text-[12.5px] text-inkmid mb-4">
            Minutes per experimental session (capped at 600 min; 88% fall under 180 min).
          </p>
          <HistogramECDF
            values={fig03_session_length.values_minutes.filter((v) => v <= 600)}
            binWidth={15}
            unit=" min"
          />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold mb-1">Normalisation period</h2>
          <p className="text-[12.5px] text-inkmid mb-4">Minutes of acclimatisation before measurement starts.</p>
          <HistogramECDF values={fig04_normalisation_length.values_minutes} binWidth={10} unit=" min" />
        </div>
      </div>

      {/* Fig 6: Setting types */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Experimental setting & spatial typology</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Laboratory studies dominate; office-like environments are the most common spatial typology within every setting type.
        </p>
        <div className="grid grid-cols-2 gap-10">
          <InteractiveBarChart
            data={typeRollup}
            total={summary.n_experiments}
            color="#4855C8"
          />
          <InteractiveBarChart
            data={typologyDetail.map((d) => ({ label: `${d['exp-spatial-typology']} (${d['exp-type']})`, count: d.count }))}
            total={summary.n_experiments}
            color="#8A8A86"
          />
        </div>
      </div>

      {/* Fig 7: Temperature ranges */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Tested air temperature ranges</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          One line per study, from its lowest to highest tested setpoint. Hover a line for the exact range and step values.
        </p>
        <StudyIntervalPlot
          studies={[...fig07_temperature_ranges.studies].sort((a, b) => a.min - b.min)}
          getLow={(s) => s.min}
          getHigh={(s) => s.max}
          getLabel={(s) => `${s.id}: ${s.min}–${s.max}°C (steps: ${s.steps.join(', ')})`}
          domain={[6, 44]}
          color="#D94F6E"
        />
      </div>

      {/* Fig 8 & 9: Age and BMI */}
      <div className="px-10 py-8 border-b border-line grid grid-cols-2 gap-10">
        <div>
          <h2 className="text-[16px] font-semibold mb-1">Participant age</h2>
          <p className="text-[12.5px] text-inkmid mb-4">
            Mean ± SD per study, sorted ascending. {fig08_age.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD (shown as a point).
          </p>
          <StudyIntervalPlot
            studies={fig08_age.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} years` : `${s.id}: ${s.mean.toFixed(1)} years (SD not reported)`)}
            domain={[15, 60]}
            color="#E07820"
          />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold mb-1">Participant BMI</h2>
          <p className="text-[12.5px] text-inkmid mb-4">
            Mean ± SD per study, sorted ascending. {fig09_bmi.studies.filter((s) => !s.std_reported).length} studies report a mean with no SD (shown as a point).
          </p>
          <StudyIntervalPlot
            studies={fig09_bmi.studies}
            getLow={(s) => (s.std_reported ? s.mean - s.std : s.mean)}
            getHigh={(s) => (s.std_reported ? s.mean + s.std : s.mean)}
            getLabel={(s) => (s.std_reported ? `${s.id}: ${s.mean.toFixed(1)} ± ${s.std.toFixed(1)} kg/m²` : `${s.id}: ${s.mean.toFixed(1)} kg/m² (SD not reported)`)}
            domain={[16, 30]}
            color="#B8C020"
          />
        </div>
      </div>

      {/* Fig 10 & 11: Sex distribution, sample size */}
      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Sex distribution & sample size</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Of {fig10_sex_distribution.studies.length} studies reporting sex breakdown:{' '}
          {sexSummary.male_gt} skew male (&gt;55%), {sexSummary.equal} are balanced (45–55%),{' '}
          {sexSummary.female_gt} skew female. Hover any bar for the exact split.
        </p>
        <SexDistributionChart studies={fig10_sex_distribution.studies} />
        <p className="text-[12.5px] text-inkfaint mt-8 mb-2">Sample size per study (log scale), median n=22 highlighted.</p>
        <HistogramECDF values={fig11_sample_size.studies.map((s) => Math.log10(s.n))} binWidth={0.15} xLabel="log₁₀(n)" />
      </div>
    </div>
  )
}
