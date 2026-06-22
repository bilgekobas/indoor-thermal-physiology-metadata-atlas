import { Link } from 'react-router-dom'
import { CodeChip } from '../components/CodeChip.jsx'

// Six citable, number-verified findings — each pulled from a chapter's own
// live-computed data (see that chapter for the exact derivation), not
// independently asserted here. Picked to span different chapters and
// different kinds of finding (concentration, transparency, methods drift,
// measurement convention, rigor, scale heterogeneity) rather than six
// variations on "X% don't report Y."
const KEY_FINDINGS = [
  {
    stat: '73%',
    text: <>of 2023–24 studies are from <strong>China alone</strong> — up from 55% a decade earlier. The field hasn't just grown, it's concentrated.</>,
    chapter: 'Ch. 1 — When, where & how',
    to: '/context',
    color: '#D94F6E',
  },
  {
    stat: '5 of 269',
    text: <>studies link to <strong>actual, working open data</strong>. 180 give no data-availability statement at all.</>,
    chapter: 'Ch. 8 — Reporting completeness',
    to: '/reporting',
    color: '#4855C8',
  },
  {
    stat: '55%→25%',
    text: <>share of skin-temperature studies using a <strong>thermocouple</strong>, 2013–14 to 2023–24 — displaced by Thermochron-type loggers (iButton), which rose from 18% to 52% over the same span.</>,
    chapter: 'Ch. 3 — Measurements: the body',
    to: '/body',
    color: '#E07820',
  },
  {
    stat: '62%',
    text: <>of skin-temperature studies measure the <strong>lower leg</strong> — the single most-measured site, but no site is measured in every study.</>,
    chapter: 'Ch. 3 — Measurements: the body',
    to: '/body',
    color: '#B8C020',
  },
  {
    stat: '0%→29%',
    text: <><strong>Blinding</strong> rose from absent in 2013–14 to nearly a third of studies by 2023–24 — a real gain. Randomisation barely moved over the same period.</>,
    chapter: 'Ch. 7 — Protocol rigor',
    to: '/protocol',
    color: '#8A8A86',
  },
  {
    stat: '78% vs. none',
    text: <>of thermal <em>sensation</em> scales use the standard 7-point format. Thermal <em>comfort</em> scales have no equivalent — point count, labels, and polarity all vary, and roughly a quarter of studies put "comfortable" at the opposite end of the number line from the rest.</>,
    chapter: 'Ch. 5 — What people were asked',
    to: '/questionnaires',
    color: '#C9698A',
  },
]

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

export default function Overview({ data }) {
  const { summary, completeness } = data
  const sorted = [...completeness.data].sort((a, b) => a.pct_reported - b.pct_reported)
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]

  return (
    <div>
      {/* Hero */}
      <div className="px-10 pt-12 pb-10 border-b border-line bg-white/30">
        <div className="font-data text-[11px] uppercase tracking-wider text-coreaccent mb-3">
          Living metadata corpus · updated yearly
        </div>
        <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight max-w-3xl">
          How indoor thermal-physiology research<br />actually measures the body
        </h1>
        <p className="text-[15px] text-inkmid mt-4 max-w-xl leading-relaxed">
          A structured, re-extractable record of {summary.n_publications} published experiments
          ({summary.year_min}–{summary.year_max}), documenting what was measured, how, where on
          the body, and what was left unreported.
        </p>

        <div className="grid grid-cols-4 gap-3 mt-8 max-w-2xl">
          <StatBlock value={summary.n_publications} label="Publications" accent="#D94F6E" />
          <StatBlock value={summary.n_experiments} label="Experiments" accent="#4855C8" />
          <StatBlock value={summary.n_variables} label="Coded variables" accent="#E07820" />
          <StatBlock value={`${summary.year_max - summary.year_min + 1}y`} label="Span covered" accent="#8A8A86" />
        </div>

        <div className="flex gap-3 mt-8">
          <Link
            to="/browse"
            className="inline-flex items-center px-4 py-2 rounded-md bg-ink text-paper text-[13.5px] font-medium hover:bg-coreaccent transition-colors"
          >
            Browse the corpus →
          </Link>
          <Link
            to="/reporting"
            className="inline-flex items-center px-4 py-2 rounded-md border border-line text-[13.5px] font-medium hover:border-ink transition-colors"
          >
            See what's missing
          </Link>
        </div>
      </div>

      {/* Key findings — six citable, number-backed facts, each linking to its chapter */}
      <div className="px-10 py-8 border-b border-line bg-white/20">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[16px] font-semibold">Six things worth knowing before you dig in</h2>
          <span className="font-data text-[11px] text-inkfaint">each links to where it comes from</span>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 max-w-4xl">
          {KEY_FINDINGS.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="group flex gap-3 p-3 -m-3 rounded-md hover:bg-white/60 transition-colors"
            >
              <div
                className="font-data text-[20px] font-semibold leading-none shrink-0 w-20"
                style={{ color: f.color }}
              >
                {f.stat}
              </div>
              <div className="text-[13px] text-inkmid leading-snug">
                {f.text}
                <span className="block font-data text-[10.5px] text-coreaccent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.chapter} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Signature: the coding vocabulary, made visible */}
      <div className="px-10 py-8 border-b border-line">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Every field, coded the same way</h2>
          <span className="font-data text-[11px] text-inkfaint">the corpus's own vocabulary</span>
        </div>
        <p className="text-[13.5px] text-inkmid max-w-2xl leading-relaxed mb-5">
          Each of the {summary.n_variables} variables in this corpus is coded against a fixed,
          five-value vocabulary distinguishing what studies report from what they measure but
          leave underspecified. This distinction — particularly between{' '}
          <CodeChip code="NR" /> and <CodeChip code="MNR" /> — is the corpus's central
          methodological contribution.
        </p>
        <div className="flex gap-6 flex-wrap">
          {['Y', 'N', 'NR', 'MNR', 'NC'].map((code) => (
            <div key={code} className="flex items-center gap-2">
              <CodeChip code={code} size="md" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick completeness teaser */}
      <div className="px-10 py-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Reporting is wildly uneven across categories</h2>
          <Link to="/reporting" className="font-data text-[11px] text-coreaccent hover:underline">
            full breakdown →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 max-w-3xl">
          {[...completeness.data].sort((a,b) => b.pct_reported - a.pct_reported).map((c) => (
            <div key={c.category} className="flex items-center gap-3">
              <span className="text-[13px] w-44 shrink-0">{c.category}</span>
              <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.pct_reported}%`,
                    background: c.pct_reported < 20 ? '#D94F6E' : c.pct_reported < 50 ? '#E07820' : '#4855C8',
                  }}
                />
              </div>
              <span className="font-data text-[12px] text-inkmid w-12 text-right">
                {c.pct_reported}%
              </span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-inkfaint mt-5 max-w-2xl leading-relaxed">
          {highest.category} fields are reported in {highest.pct_reported}% of studies on average;
          {' '}{lowest.category.toLowerCase()} fields, only {lowest.pct_reported}%. The gap itself
          is a finding.
        </p>
      </div>
    </div>
  )
}
