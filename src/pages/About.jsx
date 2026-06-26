import PageHeader from '../components/PageHeader.jsx'
import { CodeLegend } from '../components/CodeChip.jsx'

export default function About({ data }) {
  const { summary } = data
  return (
    <div>
      <PageHeader eyebrow="Reference" title="About" />

      <div className="px-10 py-8 max-w-2xl space-y-8">
        <section>
          <h2 className="text-[15px] font-semibold mb-2">What this is</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            A living atlas and structured metadata corpus of indoor thermal-physiology experiments
            published between {summary.year_min} and {summary.year_max}. It documents how studies
            report their experimental design, environment, physiological measurements,
            questionnaires, participant characteristics, and protocol controls — not the
            physiological results themselves.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Authorship</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            The website was built by Bilge Kobas. The underlying review and metadata work were
            conducted by Bilge Kobas, Tobias Kramer (CBE Berkeley), Jian Pan (RWTH Aachen), Cynthia
            Ly (Maastricht), and Matteo Favero (EPFL). OSF registration, Zenodo, and manuscript links
            will be added here once the corresponding records are public and stable.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Reading the atlas</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed mb-3">
            The atlas uses a controlled coding vocabulary so completeness can be compared
            across categories and over time. The detailed search, screening, inclusion/exclusion,
            and coding logic now live on the separate Methodology page.
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
          <h2 className="text-[15px] font-semibold mb-2">Limitations & judgment calls</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            Turning the raw corpus into the figures on this site required real judgment calls —
            how to classify thermal comfort scale polarity, how to harmonise free-text sensor
            and cognitive-test names, how to resolve city names to map coordinates, which
            thresholds keep a chart legible versus cluttered. Every one of these is documented,
            with the exact reasoning and numbers affected, in{' '}
            <a
              href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/blob/main/LIMITATIONS.md"
              className="text-coreaccent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              LIMITATIONS.md
            </a>{' '}
            in the repository. Start there before asking "how exactly did you handle X."
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
