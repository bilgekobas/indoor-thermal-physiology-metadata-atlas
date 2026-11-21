import { Link } from 'react-router-dom'
import { chapters } from '../chapters.js'
import { percent, referenceHeightList, referenceHeightShare } from '../utils/atlasStatistics.js'

function FindingCard({ value, children, to }) {
  return (
    <Link
      to={to}
      className="group block rounded-md border border-line bg-white/45 px-5 py-4 transition-colors hover:border-coreaccent hover:bg-white/70"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-data text-[28px] font-semibold leading-none text-coreaccent">{value}</span>
        <p className="min-w-0 flex-[1_1_14rem] text-sm leading-relaxed text-inkmid group-hover:text-ink">{children}</p>
      </div>
    </Link>
  )
}

export default function Overview({ data }) {
  const {
    summary, geo_concentration_by_period, open_data, fig17_physio_params, fig13_sensor_heights,
    fig15_tsv_scales, fig16_tcv_scales, fig05_time_of_day, fig10_sex_distribution, evo_signal_sensor,
  } = data
  const n = summary.n_experiments
  const geo = geo_concentration_by_period.data
  const firstGeo = geo[0]
  const lastGeo = geo.at(-1)
  const signalCount = (name) => fig17_physio_params.data.find((row) => row.parameter === name)?.count ?? 0
  const skinCount = signalCount('Skin temperature')
  const skinLeads = skinCount > 0 && fig17_physio_params.data.every((row) =>
    row.parameter === 'Skin temperature' || row.count < skinCount)
  const sevenPoint = fig15_tsv_scales.points_distribution.find((row) => row.points === 7)?.count ?? 0
  const maleOnly = fig10_sex_distribution.studies.filter((row) => row.male > 0 && row.female === 0).length
  const skinSensors = evo_signal_sensor.signals['Skin temperature']
  const periods = evo_signal_sensor.periods.filter((period) => skinSensors.period_totals[period] > 0)
  const first = periods[0]
  const last = periods.at(-1)
  const sensorShare = (method, period) =>
    percent(skinSensors.headline_methods[method][period] ?? 0, skinSensors.period_totals[period])

  return (
    <div>
      <header className="border-b border-line bg-white/30 px-5 pb-9 pt-10 sm:px-10">
        <div className="mb-3 font-data text-xs uppercase tracking-wider text-coreaccent">Living Metadata Atlas</div>
        <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.15] tracking-tight">
          How do we study the body’s response to indoor temperatures?
        </h1>
        <div className="mt-5 max-w-2xl space-y-4 text-base leading-relaxed text-inkmid">
          <p>
            In climate chambers, offices and other indoor settings, researchers study how people experience
            their thermal environment and how their bodies respond. Take skin temperature{skinLeads && ', the most frequently measured physiological signal in this review'}.
            One experiment might record it at the wrist. Another might calculate a mean from sensors placed
            at several body sites. To compare the two, a reader needs to know where the sensors were placed
            and how the readings were combined.
          </p>
          <p>
            We built the <strong className="font-semibold text-ink">Indoor Thermal Physiology Metadata Atlas</strong> to
            bring those details together. It documents how researchers designed and reported {n} experiments
            in papers published from {summary.year_min} to {summary.year_max}. You can explore who took part,
            which conditions they experienced, what researchers measured, and which details the papers provide.
          </p>
        </div>
        <p className="mt-5 text-sm text-inkmid">
          The review was led by Bilge Kobas at the Technical University of Munich.{' '}
          <Link to="/about#team" className="text-coreaccent hover:underline">Meet the research team</Link>.
        </p>
        <Link to="#what-we-found" className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-coreaccent">
          Explore the Atlas
        </Link>
      </header>

      <section id="what-we-found" className="scroll-mt-4 border-b border-line px-5 py-8 sm:px-10">
        <h2 className="mb-5 text-xl font-semibold">What we found</h2>
        <div className="grid max-w-6xl gap-3 xl:grid-cols-2">
          <FindingCard value={lastGeo ? percent(lastGeo.top_count, lastGeo.total) : '—'} to="/context#when-and-where-research-happens">
            {lastGeo ? <>of {lastGeo.period} experiments with a recorded country were from {lastGeo.top_country}. In {firstGeo.period} the share was {percent(firstGeo.top_count, firstGeo.total)}.</> : 'Country information by publication period.'}
          </FindingCard>
          <FindingCard value={percent(open_data.n_with_real_data_link, open_data.n_total)} to="/context#open-data-in-practice">
            of experiments link to an accessible data or code resource ({open_data.n_with_real_data_link} of {open_data.n_total}).
          </FindingCard>
          <FindingCard value={percent(skinCount, n)} to="/body#whats-measured-and-how">
            of experiments measured skin temperature. Heart or pulse rate was measured in {percent(signalCount('Heart/Pulse rate'), n)}.
          </FindingCard>
          <FindingCard value={periods.length ? `${sensorShare('thermocouple', first)} → ${sensorShare('thermocouple', last)}` : '—'} to="/body#how-sensor-choice-has-shifted-over-time">
            {periods.length ? <>of skin-temperature experiments used thermocouples in {first} and {last}, respectively. Button-type loggers were used in {sensorShare('button_logger', first)} and {sensorShare('button_logger', last)}.</> : 'Sensor choices among experiments that measured skin temperature.'}
          </FindingCard>
          <FindingCard value={percent(sevenPoint, fig15_tsv_scales.n_discrete, 1)} to="/questionnaires#scale-heterogeneity-sensation-vs-comfort">
            of discrete thermal sensation scales have seven response positions. Their wording varies. Thermal comfort scales have {fig16_tcv_scales.n_distinct_scale_descriptions} distinct normalised scale-and-label combinations.
          </FindingCard>
          <FindingCard value={referenceHeightShare(fig13_sensor_heights.data)} to="/environment#where-sensors-are-placed">
            of reported air-temperature, humidity, globe-temperature and air-velocity sensor heights match a reference level of {referenceHeightList} m. Each recorded height contributes one observation.
          </FindingCard>
          <FindingCard value={percent(fig05_time_of_day.n_reporting, n)} to="/context#setting-and-timing">
            of experiments report a testing-time range that could be extracted ({fig05_time_of_day.n_reporting} of {n}).
          </FindingCard>
          <FindingCard value={percent(maleOnly, n)} to="/population#demographics">
            of all included experiments report a male-only sample ({maleOnly} of {n}).
          </FindingCard>
        </div>
      </section>

      <nav aria-label="Atlas chapter guide" className="px-5 py-8 sm:px-10">
        <h2 className="mb-4 text-xl font-semibold">Explore by chapter</h2>
        <ul className="grid max-w-6xl gap-x-8 md:grid-cols-2">
          {chapters.map(({ to, label, description }) => (
            <li key={to} className="border-b border-line">
              <Link to={to} className="group block py-3">
                <span className="block font-medium group-hover:text-coreaccent">{label}</span>
                <span className="block text-sm leading-relaxed text-inkmid">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-coreaccent">
          <Link to="/browse" className="hover:underline">Browse the metadata</Link>
          <Link to="/dictionary" className="hover:underline">Variable dictionary</Link>
          <Link to="/methodology" className="hover:underline">How the review was conducted</Link>
        </div>
      </nav>
    </div>
  )
}
