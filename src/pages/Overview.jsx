import { Link } from 'react-router-dom'
import { CodeChip } from '../components/CodeChip.jsx'

function StatBlock({ value, label, accent }) {
  return (
    <div className="border border-line rounded-md px-5 py-4 bg-white/40">
      <div className="font-data text-[28px] font-semibold leading-none" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[12.5px] text-inkmid mt-1.5">{label}</div>
    </div>
  )
}

function Finding({ children }) {
  return <li className="text-[13.5px] text-inkmid leading-relaxed pl-1">{children}</li>
}

export default function Overview({ data }) {
  const {
    summary,
    geo_concentration_by_period,
    open_data,
    fig17_physio_params,
    fig13_sensor_heights,
    fig15_tsv_scales,
    fig16_tcv_scales,
    fig05_time_of_day,
    fig10_sex_distribution,
  } = data

  const n = summary.n_experiments
  const latestGeo = geo_concentration_by_period.data[geo_concentration_by_period.data.length - 1]
  const firstGeo = geo_concentration_by_period.data[0]
  const skin = fig17_physio_params.data.find((d) => d.parameter === 'Skin temperature')
  const heart = fig17_physio_params.data.find((d) => d.parameter === 'Heart/Pulse rate')
  const skinPct = ((skin.count / n) * 100).toFixed(0)
  const heartPct = ((heart.count / n) * 100).toFixed(0)
  const sevenPointTSV = fig15_tsv_scales.points_distribution.find((d) => d.points === 7)?.count || 0
  const sevenPointTSVPct = ((sevenPointTSV / fig15_tsv_scales.n_total) * 100).toFixed(0)
  const tcvScaleDefinitions = new Set(
    fig16_tcv_scales.studies.map((s) => `${JSON.stringify(s.range || [])}|${JSON.stringify((s.labels || []).map((x) => String(x).toLowerCase()))}`)
  ).size
  const standardHeights = new Set([0.1, 0.6, 1.1, 1.7])
  const heightRows = fig13_sensor_heights.data || []
  const standardHeightCount = heightRows.filter((r) => standardHeights.has(Number(Number(r.height).toFixed(2)))).length
  const standardHeightPct = heightRows.length ? ((standardHeightCount / heightRows.length) * 100).toFixed(0) : '0'
  const timeReportingPct = ((fig05_time_of_day.n_reporting / n) * 100).toFixed(0)
  const maleOnly = fig10_sex_distribution.studies.filter((s) => s.male > 0 && s.female === 0).length
  const maleOnlyPct = ((maleOnly / n) * 100).toFixed(0)

  return (
    <div>
      <div className="px-10 pt-12 pb-10 border-b border-line bg-white/30">
        <div className="font-data text-[11px] uppercase tracking-wider text-coreaccent mb-3">
          Living metadata corpus · updated yearly
        </div>
        <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight max-w-3xl">
          How indoor thermal-physiology research is structured
        </h1>
        <p className="text-[16px] text-inkmid mt-4 max-w-2xl leading-relaxed">
          Who runs the experiments, where, when, for how long, measuring which populations, and with what.
        </p>
        <p className="text-[14px] text-inkmid mt-4 max-w-2xl leading-relaxed">
          A structured, re-extractable record of published experiments between {summary.year_min}–{summary.year_max} illustrating the landscape of the field.{' '}
          <Link to="/about" className="text-coreaccent hover:underline">
            Read more on how the current corpus is selected.
          </Link>
        </p>

        <div className="grid grid-cols-4 gap-3 mt-8 max-w-2xl">
          <StatBlock value={summary.n_publications} label="Publications" accent="#FB3640" />
          <StatBlock value={summary.n_experiments} label="Unique experiments" accent="#5B5BFF" />
          <StatBlock value={summary.n_variables} label="Coded variables" accent="#FB3640" />
          <StatBlock value={`${summary.year_max - summary.year_min + 1}y`} label="Span covered" accent="#8A8A8A" />
        </div>

        <div className="flex gap-3 mt-8">
          <Link
            to="/browse"
            className="inline-flex items-center px-4 py-2 rounded-md bg-ink text-paper text-[13.5px] font-medium hover:bg-coreaccent transition-colors"
          >
            Browse the entire corpus →
          </Link>
        </div>
      </div>

      <div className="px-10 py-8 border-b border-line bg-white/20">
        <h2 className="text-[16px] font-semibold mb-5">Things worth knowing before you dig in</h2>
        <ul className="list-disc ml-5 space-y-3 max-w-4xl">
          <Finding>
            {latestGeo.pct.toFixed(0)}% of {latestGeo.period} studies are from {latestGeo.top_country} alone. The total share for {firstGeo.period} was {firstGeo.pct.toFixed(0)}%.
          </Finding>
          <Finding>
            {open_data.n_with_real_data_link} of {open_data.n_total} studies share data directly and openly.
          </Finding>
          <Finding>
            Skin temperature is the single most measured signal: {skinPct}% of experiments measure skin temperature, followed by {heartPct}% measuring heart or pulse rate.
          </Finding>
          <Finding>
            55%→25% share of skin-temperature studies using a thermocouple, {firstGeo.period} to {latestGeo.period} — displaced by Thermochron-type loggers such as iButton, which rose from 18% to 52% over the same span.
          </Finding>
          <Finding>
            {sevenPointTSVPct}% of thermal sensation scales use the standard 7-point format, while thermal comfort scales show {tcvScaleDefinitions} distinct coded scale definitions in this corpus.
          </Finding>
          <Finding>
            {standardHeightPct}% of reported air-temperature, humidity, globe-temperature, and air-velocity sensor heights sit at one of the standard 0.1, 0.6, 1.1, or 1.7 m positions.
          </Finding>
          <Finding>
            {fig05_time_of_day.n_reporting} studies ({timeReportingPct}%) report time-of-day information.
          </Finding>
          <Finding>
            {maleOnly} studies ({maleOnlyPct}%) are male-only.
          </Finding>
        </ul>
      </div>

      <div className="px-10 py-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Every field, coded the same way</h2>
          <span className="font-data text-[11px] text-inkfaint">the corpus's own vocabulary</span>
        </div>
        <p className="text-[13.5px] text-inkmid max-w-2xl leading-relaxed mb-5">
          Each of the {summary.n_variables} variables in this corpus is coded against a fixed, five-value vocabulary distinguishing what studies report from what they measure but leave underspecified. This distinction — particularly between <CodeChip code="NR" /> and <CodeChip code="MNR" /> — is the corpus's central methodological contribution.
        </p>
        <div className="grid grid-cols-1 gap-3 max-w-3xl">
          <div className="flex gap-3 items-start"><CodeChip code="Y" size="md" /><span className="text-[13px] text-inkmid">Yes, explicitly reported.</span></div>
          <div className="flex gap-3 items-start"><CodeChip code="N" size="md" /><span className="text-[13px] text-inkmid">No, explicitly reported.</span></div>
          <div className="flex gap-3 items-start"><CodeChip code="NR" size="md" /><span className="text-[13px] text-inkmid">Not reported.</span></div>
          <div className="flex gap-3 items-start"><CodeChip code="MNR" size="md" /><span className="text-[13px] text-inkmid">Measured, but the value of the field is not reported. For example, air temperature is reported as measured, but the sensor height is not reported.</span></div>
          <div className="flex gap-3 items-start"><CodeChip code="NC" size="md" /><span className="text-[13px] text-inkmid">Not clear: conflicting or ambiguous statements.</span></div>
        </div>
      </div>
    </div>
  )
}
