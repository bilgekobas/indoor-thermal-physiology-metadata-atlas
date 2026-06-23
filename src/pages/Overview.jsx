import { Link } from 'react-router-dom'

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

function FindingCard({ value, unit = '', accent = '#5B5BFF', children, to }) {
  return (
    <Link
      to={to}
      className="group block border border-line rounded-md bg-white/45 px-5 py-4 hover:border-coreaccent hover:bg-white/70 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="font-data text-[32px] leading-none font-semibold shrink-0 min-w-[88px]" style={{ color: accent }}>
          {value}<span className="text-[18px] align-baseline">{unit}</span>
        </div>
        <p className="text-[13.5px] text-inkmid leading-relaxed pt-0.5 group-hover:text-ink">
          {children} <span className="text-coreaccent whitespace-nowrap">↗</span>
        </p>
      </div>
    </Link>
  )
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-6xl">
          <FindingCard value={latestGeo.pct.toFixed(0)} unit="%" accent="#5B5BFF" to="/context#when-and-where-research-happens">
            of {latestGeo.period} studies are from {latestGeo.top_country} alone. The total share for {firstGeo.period} was {firstGeo.pct.toFixed(0)}%.
          </FindingCard>
          <FindingCard value={open_data.n_with_real_data_link} accent="#FB3640" to="/reporting#open-data-in-practice">
            of {open_data.n_total} studies share data directly and openly.
          </FindingCard>
          <FindingCard value={skinPct} unit="%" accent="#5B5BFF" to="/body#whats-measured-and-how">
            of experiments measure skin temperature, the single most measured signal, followed by {heartPct}% measuring heart or pulse rate.
          </FindingCard>
          <FindingCard value="55→25" unit="%" accent="#0A0A0A" to="/body#how-sensor-choice-has-shifted-over-time">
            share of skin-temperature studies using a thermocouple, {firstGeo.period} to {latestGeo.period} — displaced by Thermochron-type loggers such as iButton, which rose from 18% to 52% over the same span.
          </FindingCard>
          <FindingCard value={sevenPointTSVPct} unit="%" accent="#5B5BFF" to="/questionnaires#scale-heterogeneity-sensation-vs-comfort">
            of thermal sensation scales use the standard 7-point format, while thermal comfort scales show {tcvScaleDefinitions} distinct coded scale definitions in this corpus.
          </FindingCard>
          <FindingCard value={standardHeightPct} unit="%" accent="#0A0A0A" to="/environment#where-sensors-are-placed">
            of reported air-temperature, humidity, globe-temperature, and air-velocity sensor heights sit at one of the standard 0.1, 0.6, 1.1, or 1.7 m positions.
          </FindingCard>
          <FindingCard value={fig05_time_of_day.n_reporting} accent="#5B5BFF" to="/context#setting-and-timing">
            studies ({timeReportingPct}%) report time-of-day information.
          </FindingCard>
          <FindingCard value={maleOnly} accent="#FB3640" to="/population#demographics">
            studies ({maleOnlyPct}%) are male-only.
          </FindingCard>
        </div>
      </div>
    </div>
  )
}
