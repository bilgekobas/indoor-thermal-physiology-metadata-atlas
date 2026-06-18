import PageHeader from '../components/PageHeader.jsx'
import { CodeLegend } from '../components/CodeChip.jsx'

export default function About({ data }) {
  const { summary } = data
  return (
    <div>
      <PageHeader eyebrow="Reference" title="About & methods" />

      <div className="px-10 py-8 max-w-2xl space-y-8">
        <section>
          <h2 className="text-[15px] font-semibold mb-2">What this is</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            A structured metadata corpus of indoor thermal-physiology experiments published
            between {summary.year_min} and {summary.year_max}. It documents how studies report
            their experimental design, environment, physiological measurements, questionnaires,
            participant characteristics, and protocol controls — not the physiological results
            themselves.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Coding vocabulary</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed mb-3">
            Every field uses a fixed controlled vocabulary so completeness is comparable
            across categories and over time.
          </p>
          <CodeLegend />
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Updating the corpus</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            This corpus is intended to be re-extracted periodically (roughly every five years)
            following the same inclusion criteria and coding conventions documented in the
            repository's <code className="font-data text-[12px]">README.md</code> and{' '}
            <code className="font-data text-[12px]">variable_dictionary.csv</code>. Each release
            is versioned; this site always reflects the latest committed dataset.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Citing this dataset</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            If you use this corpus, please cite the accompanying dataset DOI and the related
            manuscript. Citation details are in the repository README.
          </p>
        </section>
      </div>
    </div>
  )
}
