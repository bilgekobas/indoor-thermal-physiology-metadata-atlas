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

          <div className="text-[13.5px] text-inkmid leading-relaxed">
            <p className="mb-2">
              The underlying review and metadata work were conducted by the following
              researchers:
            </p>

            <p>
              <a
                href="https://www.arc.ed.tum.de/klima/team/bilge-kobas/"
                className="text-coreaccent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bilge Kobas
              </a>
              ; Technical University of Munich, Chair of Building Technology and
              Climate Responsive Design
            </p>

            <p>
              <a
                href="https://cbe.berkeley.edu/about-us/people/tobias-kramer/"
                className="text-coreaccent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tobias Kramer
              </a>
              ; UC Berkeley, Center for the Built Environment
            </p>

            <p>
              <a
                href="https://www.ukaachen.de/kliniken-institute/institut-fuer-arbeits-sozial-und-umweltmedizin/institut/team/wissenschaftliches-personal/jian-pan/"
                className="text-coreaccent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jian Pan
              </a>
              ; RWTH Aachen, Healthy Living Spaces Research Group
            </p>

            <p>
              <a
                href="https://cris.maastrichtuniversity.nl/en/persons/cynthia-ly/"
                className="text-coreaccent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cynthia Ly
              </a>
              ; Maastricht University, Faculty of Health, Medicine and Life Sciences
            </p>

            <p>
              <a
                href="https://people.epfl.ch/matteo.favero"
                className="text-coreaccent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Matteo Favero
              </a>
              ; EPFL, Human-Oriented Built Environment Lab
            </p>

            <p className="mt-3">
              OSF registration, Zenodo, and manuscript links will be added here once
              the corresponding records are public and stable.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Updating the corpus</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            This corpus is intended to be re-extracted periodically following the same inclusion criteria 
            and coding conventions documented in the repository's <code className="font-data text-[12px]">README.md</code> and{' '}
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
