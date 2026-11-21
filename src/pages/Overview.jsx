import { Link } from 'react-router-dom'
import { percent, referenceHeightList, referenceHeightShare } from '../utils/atlasStatistics.js'

const resourceLinks = [
  { to: '/methodology', label: 'How the review was conducted' },
  { to: '/dictionary', label: 'Variable dictionary' },
  { to: '/browse', label: 'Browse the metadata' },
  { to: '/#team', label: 'Meet the team' },
]

const team = [
  {
    name: 'Bilge Kobas', href: 'https://www.arc.ed.tum.de/klima/team/bilge-kobas/',
    affiliation: 'Technical University of Munich, Chair of Building Technology and Climate Responsive Design',
  },
  {
    name: 'Tobias Kramer', href: 'https://cbe.berkeley.edu/about-us/people/tobias-kramer/',
    affiliation: 'UC Berkeley, Center for the Built Environment',
  },
  {
    name: 'Jian Pan', href: 'https://orcid.org/0009-0007-2605-0515',
    affiliation: 'RWTH Aachen, Healthy Living Spaces Research Group',
  },
  {
    name: 'Cynthia Ly', href: 'https://cris.maastrichtuniversity.nl/en/persons/cynthia-ly/',
    affiliation: 'Maastricht University, Faculty of Health, Medicine and Life Sciences',
  },
  {
    name: 'Matteo Favero', href: 'https://people.epfl.ch/matteo.favero',
    affiliation: 'EPFL, Human-Oriented Built Environment Lab',
  },
]

const textLink = 'text-coreaccent hover:underline'

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
      <header className="border-b border-line bg-white/30 px-5 py-8 sm:px-10">
        <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.15] tracking-tight">
          How do we study the body’s response to indoor temperatures?
        </h1>
        <div className="mt-6 max-w-3xl space-y-5 text-base leading-relaxed text-inkmid">
          <section id="what-the-atlas-records">
            <h2 className="mb-1 font-semibold text-ink">What the Atlas records</h2>
            <p>
              The Indoor Thermal Physiology Atlas documents the methods used in {n} experiments on human
              responses to indoor thermal environments, reported in {summary.n_publications} publications
              from {summary.year_min} to {summary.year_max}. For each experiment, it brings together the
              participant characteristics, exposure conditions and measurement methods described by the authors.
            </p>
          </section>
          <section id="why-we-built-it">
            <h2 className="mb-1 font-semibold text-ink">Why we built it</h2>
            <p>
              Which body sites did researchers use to calculate mean skin temperature? How long did participants
              spend at each temperature? Answering these questions usually means reconstructing protocols paper
              by paper. We extracted these details in a common format so researchers can compare protocols,
              identify gaps in reporting and plan new experiments.
            </p>
          </section>
        </div>
      </header>

      <section id="what-we-found" className="scroll-mt-4 px-5 pt-8 sm:px-10">
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

      <nav aria-label="Atlas resources" className="flex flex-wrap gap-3 px-5 pb-8 pt-6 sm:px-10">
        {resourceLinks.map(({ to, label }) => (
          <Link key={to} to={to}
            className="inline-flex min-h-11 items-center rounded-md border border-ink bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-8 border-t border-line px-5 py-8 text-sm leading-relaxed text-inkmid sm:px-10">
        <section id="team" className="max-w-3xl scroll-mt-4">
          <h2 className="mb-2 text-xl font-semibold text-ink">Research team</h2>
          <p>Bilge Kobas led the review and primary extraction.</p>
          <ul className="mt-3 space-y-1.5">
            {team.map(({ name, href, affiliation }) => (
              <li key={name}>
                <a href={href} className={textLink} target="_blank" rel="noopener noreferrer">{name}</a>
                {' · '}{affiliation}
              </li>
            ))}
          </ul>
        </section>

        <section id="citing-and-reusing-this-work" className="max-w-3xl scroll-mt-4">
          <h2 className="mb-2 text-xl font-semibold text-ink">Citing and reusing this work</h2>
          <p>
            Cite the archive corresponding to the material you used. The{' '}
            <a href="https://doi.org/10.5281/zenodo.21511034" className={textLink}>coded dataset</a> and the{' '}
            <a href="https://doi.org/10.5281/zenodo.21516763" className={textLink}>Atlas software</a> have
            separate Zenodo records with citation details.
          </p>
          <p className="mt-2">
            To report an error or suggest a study for inclusion,{' '}
            <a href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/issues" className={textLink}>
              open an issue on GitHub
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
