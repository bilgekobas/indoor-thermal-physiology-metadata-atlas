import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { CodeChip } from '../components/CodeChip.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'

export default function ChapterReporting({ data }) {
  const { completeness, open_data, sample_justification, summary } = data
  const sorted = [...completeness.data].sort((a, b) => b.pct_reported - a.pct_reported)
  const highest = sorted[0], lowest = sorted[sorted.length - 1]

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 8 of 8 · Synthesis"
        title="Reporting completeness, end to end"
        framing={
          <>
            <p>
              The preceding five chapters each looked at one slice of the corpus in detail. This closing
              chapter steps back to the category level: across {summary.n_publications} studies, how
              completely is each broad area of the experiment actually documented?
            </p>
            <p>
              A field counts as "reported" if it holds a substantive value rather than{' '}
              <CodeChip code="NR" />, <CodeChip code="MNR" />, or <CodeChip code="NAN" />. Categories
              with many optional, study-specific fields (Questionnaires, Selection criteria) naturally
              score lower than categories with a smaller, near-universal field set (Population,
              Physiological) — the gap is partly a function of breadth, not only of practice.
            </p>
          </>
        }
        headline={[
          { value: `${highest.pct_reported}%`, label: `${highest.category} fields reported on average`, color: '#5B5BFF' },
          { value: `${lowest.pct_reported}%`, label: `${lowest.category} fields reported on average`, color: '#FB3640' },
          { value: open_data.n_with_real_data_link, label: `of ${open_data.n_total} studies share a real open-data link`, color: '#FB3640' },
          { value: summary.n_variables, label: 'coded variables across the corpus' },
        ]}
      />

      <ChapterSection title="By metadata category">
        <FigureCard title="Average reporting completeness, all categories" plotWidth={760} commentary="The top three categories (Physiological 65%, Population 61%, Cognitive 60%) cluster close together, then drop sharply: Protocol falls to 25%, and everything below it sits under 25% as well. Sorted from most to least complete; see each chapter for the field-level breakdown within a category.">
          <div className="space-y-5">
            {sorted.map((c) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[14px] font-medium">{c.category}</span>
                  <span className="font-data text-[12px] text-inkmid">{c.pct_reported}% · {c.n_fields} fields</span>
                </div>
                <div className="h-3 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct_reported}%`, background: c.pct_reported < 20 ? '#FB3640' : c.pct_reported < 50 ? '#FB3640' : '#5B5BFF' }} />
                </div>
              </div>
            ))}
          </div>
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Open data, in practice"
        intro={`A "data availability statement" being present is not the same as data actually being shared. Of ${open_data.n_total} studies, only ${open_data.n_with_real_data_link} link to an actual, working open-data repository — the rest either give no statement, say data is available "on request" with no link, or don't share at all.`}
      >
        <FigureCard title="Data availability statement, as reported" commentary="180 of 269 studies (67%) give no data availability statement at all. 51 (19%) say data is available 'upon request' with no link, and 23 (9%) explicitly state data is not available. Only 5 (2%) provide a working link.">
          <InteractiveBarChart
            data={open_data.data_avail_distribution.map((d) => ({ label: d.status, count: d.count }))}
            total={open_data.n_total}
            color="#5B5BFF"
          />
        </FigureCard>

        <FigureCard title="Studies with a real, working data link" commentary={`Only ${open_data.n_with_real_data_link} of ${open_data.n_total} studies actually provide one — listed here by study ID.`}>
          <div className="space-y-1.5 text-[12px] font-data">
            {open_data.studies_with_link.map((s) => (
              <div key={s.id} className="flex gap-3">
                <span className="text-inkfaint w-12 shrink-0">{s.id}</span>
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-coreaccent hover:underline truncate">{s.link}</a>
              </div>
            ))}
          </div>
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="How sample size was justified"
        intro="When a sample-size calculation is reported, it's usually a genuine a priori power calculation rather than a post-hoc justification or simple precedence from prior literature — but the larger pattern (see Chapter 2) is that most studies report no calculation at all."
      >
        <FigureCard title="Sample size calculation type" plotWidth={500} commentary="Of the 62 studies that justify their sample size at all (23% of the corpus, see Chapter 2), 48 (77%) use a genuine a priori power calculation, 13 (21%) cite precedence from prior literature, and only 1 is a post-hoc justification.">
          <InteractiveBarChart
            data={sample_justification.calc_type_distribution.map((d) => ({ label: d.type, count: d.count }))}
            total={sample_justification.calc_type_distribution.reduce((a, d) => a + d.count, 0)}
            color="#FB3640"
          />
        </FigureCard>

        <FigureCard title="Participant compensation" plotWidth={500} commentary="222 of 269 studies (82%) don't say whether participants were paid. 47 (17%) confirm payment; only 1 explicitly states no payment was given — absence of a statement is overwhelmingly the norm, not confirmation that nothing was paid.">
          <InteractiveBarChart
            data={sample_justification.payment_distribution.map((d) => ({ label: d.status, count: d.count }))}
            total={sample_justification.n_total}
            color="#D5FF99"
          />
        </FigureCard>
      </ChapterSection>

      <div className="px-10 py-6 border-t border-line bg-white/30">
        <p className="text-[12px] text-inkmid leading-relaxed max-w-2xl">
          Every chart in this corpus rests on judgment calls of its own — how scale polarity was
          classified, how sensor and brand names were harmonised, how city names were resolved to
          map coordinates. Every one of those is documented, not hidden, in{' '}
          <a
            href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/blob/main/LIMITATIONS.md"
            className="text-coreaccent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            LIMITATIONS.md
          </a>.
        </p>
      </div>
    </div>
  )
}
