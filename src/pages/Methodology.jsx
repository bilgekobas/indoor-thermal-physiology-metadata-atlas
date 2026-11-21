import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { CodeLegend } from '../components/CodeChip.jsx'

export default function Methodology({ data }) {
  const { summary, review_search: search, variable_dictionary: dictionary } = data
  const databases = new Intl.ListFormat('en').format(search.databases)
  const categoryCount = new Set(dictionary.data.map((field) => field.category_pretty_names).filter(Boolean)).size

  return (
    <div>
      <PageHeader eyebrow="Reference" title="Methodology" />
      <div className="max-w-3xl space-y-8 px-5 py-8 text-sm leading-relaxed text-inkmid sm:px-10">
        <section className="rounded-md border border-line bg-white/50 px-5 py-4">
          <h2 className="mb-2 text-base font-semibold text-ink">In short</h2>
          <p>
            We searched {search.databases.length} databases for studies of human physiology and indoor thermal comfort.
            We extracted the experimental methods and reporting details from eligible papers. The current corpus
            contains {summary.n_publications} publications describing {summary.n_experiments} experiments.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Units of analysis</h2>
          <p>
            Publication counts describe the literature and its authors. A paper can report several experiments,
            each with its own participants or exposure protocol. For questions about participants, exposures and
            study design, we count each experiment once.
          </p>
          <p className="mt-2">
            A single experiment can record skin temperature at several body sites or compare several formulas
            for calculating mean skin temperature. It contributes once to the count of experiments measuring
            skin temperature and can contribute to several site or formula categories. In the measurement data,
            each row records an experiment, a physiological signal, a sensing method and a body site.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Search and screening</h2>
          <p>
            The original search covered English-language, peer-reviewed journal publications from{' '}
            {search.publication_year_min} to {search.publication_year_max} in {databases}. Search terms covered
            thermal comfort, experimental settings and physiological measurement. The search returned{' '}
            {search.records_identified.toLocaleString('en')} records. After deduplication and title and abstract
            screening, {search.reports_sought} reports were sought for retrieval and {search.reports_assessed} were
            assessed for eligibility.
          </p>
          <p className="mt-2">
            The lead author screened the records and performed the primary extraction. Co-authors and student
            assistants checked selected records and fields. The lead author reviewed discrepancies and revisited
            affected records when a coding rule required clarification.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Eligibility</h2>
          <p>
            Eligible experiments studied healthy adults in sedentary, daytime settings with whole-body thermal
            exposure and at least one physiological measurement. Settings included laboratories, field studies,
            living labs and mixed designs.
          </p>
          <p className="mt-2">
            Exclusions included outdoor-only studies, manikins or simulations, questionnaire-only studies,
            exclusively clinical populations, samples limited to children or older adults, virtual or augmented
            reality settings, clinical admission or immersion protocols, exercise physiology, sleep-only studies
            and localised thermal treatments.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Metadata and missing information</h2>
          <p className="mb-3">
            The <Link to="/dictionary" className="text-coreaccent hover:underline">variable dictionary</Link> defines
            the {dictionary.n_fields} fields across {categoryCount} categories, including their units and permitted
            values. The codes below distinguish details a paper leaves unspecified from measurements it mentions
            without providing values.
          </p>
          <CodeLegend />
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink">Reading the figures</h2>
          <p>
            Counts and percentages are computed from the coded records. The denominator depends on the question.
            For example, the proportion of experiments measuring skin temperature uses the entire corpus, while
            the proportion using a particular skin-temperature sensor uses experiments that measured that signal.
            A change in the countries or settings represented can also change a percentage across publication periods.
          </p>
          <p className="mt-2">
            The Atlas describes what authors reported. Its English-language search and eligibility criteria
            define the population of papers it covers. Details of harmonisation and other coding decisions
            are available in the{' '}
            <a href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/blob/main/LIMITATIONS.md"
              className="text-coreaccent hover:underline">repository notes</a>. For releases, citations and corrections,
            see <Link to="/about" className="text-coreaccent hover:underline">About the Atlas</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
