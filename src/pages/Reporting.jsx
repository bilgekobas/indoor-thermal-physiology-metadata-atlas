import PageHeader from '../components/PageHeader.jsx'
import { CodeChip } from '../components/CodeChip.jsx'

export default function Reporting({ data }) {
  const { completeness } = data
  const sorted = [...completeness.data].sort((a, b) => b.pct_reported - a.pct_reported)

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Reporting completeness"
        description="Average share of fields reported (vs. NR / MNR / NAN) within each metadata category, across all studies."
      />

      <div className="px-10 py-8">
        <div className="space-y-5 max-w-3xl">
          {sorted.map((c) => (
            <div key={c.category}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[14px] font-medium">{c.category}</span>
                <span className="font-data text-[12px] text-inkmid">
                  {c.pct_reported}% · {c.n_fields} fields
                </span>
              </div>
              <div className="h-3 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.pct_reported}%`,
                    background: c.pct_reported < 20 ? '#D94F6E' : c.pct_reported < 50 ? '#E07820' : '#4855C8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-2xl border border-line rounded-md p-5 bg-white/40">
          <h3 className="text-[14px] font-semibold mb-2">Reading this chart</h3>
          <p className="text-[13px] text-inkmid leading-relaxed">
            A field counts as "reported" if it holds a substantive value rather than{' '}
            <CodeChip code="NR" />, <CodeChip code="MNR" />, or <CodeChip code="NAN" />.
            Categories like Questionnaires and Selection criteria contain many optional,
            study-specific fields (most studies only administer a subset), so low percentages
            partly reflect that breadth — not necessarily poor practice. Categories like
            Population and Physiological have a smaller, more universally-expected field set,
            making their completeness rates more directly comparable across studies.
          </p>
        </div>
      </div>
    </div>
  )
}
