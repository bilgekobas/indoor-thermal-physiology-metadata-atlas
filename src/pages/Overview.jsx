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
