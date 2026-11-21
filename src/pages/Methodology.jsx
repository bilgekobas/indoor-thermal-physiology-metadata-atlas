import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { CodeLegend } from '../components/CodeChip.jsx'

export default function Methodology({ data }) {
  const { summary, review_search: search, variable_dictionary: dictionary } = data
  const databases = new Intl.ListFormat('en').format(search.databases)
  const categoryCount = new Set(dictionary.data.map((field) => field.category_pretty_names).filter(Boolean)).size
  const heading = 'mb-2 text-lg font-semibold text-ink'

  return (
    <div>
      <PageHeader eyebrow="Reference" title="Methodology" />
      <div className="max-w-3xl space-y-7 px-5 py-8 text-[15px] leading-relaxed text-inkmid sm:px-10">
        <section>
          <h2 className={heading}>Search strategy</h2>
          <p>
            We systematically reviewed peer-reviewed, English-language journal articles on human physiological
            responses to indoor thermal environments. We searched {databases} for articles published from{' '}
            {search.publication_year_min} to {search.publication_year_max}. The search combined terms for thermal
            comfort and sensation, experimental settings such as climate chambers and field studies, and
            physiological measurements such as skin temperature.
          </p>
        </section>

        <section>
          <h2 className={heading}>Eligibility criteria</h2>
          <p>
            Eligible experiments involved at least one group of healthy adults aged 18–64, took place indoors
            primarily during daytime, and included at least one thermophysiological measurement. We included
            whole-body thermal exposures during sedentary or everyday low-activity tasks in settings such as
            laboratories, workplaces, homes and classrooms.
          </p>
          <p className="mt-2">
            Exclusions covered outdoor studies, manikins and simulations, questionnaire-only studies, and samples
            composed exclusively of children, older adults or clinical populations. We also excluded virtual or
            augmented reality, clinical admission, hot-water immersion, altered gravity, exercise-focused and
            sleep-only protocols, and localised thermal treatments.
          </p>
        </section>

        <section>
          <h2 className={heading}>Screening and data extraction</h2>
          <p>
            The search yielded {search.records_identified.toLocaleString('en')} records. The lead author used
            Covidence for deduplication and initial title and abstract screening, then continued screening in
            Rayyan. Records of uncertain eligibility proceeded to full-text assessment. The lead author sought{' '}
            {search.reports_sought} reports for retrieval and assessed {search.reports_assessed} for eligibility.
            All eligible reports entered the corpus.
          </p>
          <p className="mt-2">
            The lead author manually extracted metadata from articles, supplementary materials and linked
            data-availability statements using field-specific coding rules. Co-authors and student assistants
            checked subsets of records and fields. The lead author resolved discrepancies and revisited all entries
            affected by a revised rule. The extent of independent checking was not specified in advance, and
            inter-rater agreement was not assessed.
          </p>
        </section>

        <section>
          <h2 className={heading}>Metadata and units of analysis</h2>
          <p>
            The <Link to="/dictionary" className="text-coreaccent hover:underline">variable dictionary</Link>{' '}
            defines {dictionary.n_fields} fields across {categoryCount} categories. Each result uses the unit
            that corresponds to the question being asked.
          </p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="inline font-semibold text-ink">Publication ({summary.n_publications.toLocaleString('en')}). </dt>
              <dd className="inline">Bibliographic characteristics, journal venues and co-authorship networks. A publication can describe several experiments.</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Experiment ({summary.n_experiments.toLocaleString('en')}). </dt>
              <dd className="inline">Study setting, participants, exposures and protocol. Each experiment contributes once to the prevalence of a given signal or practice.</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink">Signal instance ({summary.n_rows.toLocaleString('en')}). </dt>
              <dd className="inline">One record for a physiological parameter, sensing method and anatomical site within an experiment. An experiment measuring skin temperature at several sites contributes several records.</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className={heading}>Harmonisation</h2>
          <p>
            We harmonised country and city names, sensor brands and mean skin temperature formula citations.
            For questionnaire scales, we retained the ordered numeric response positions and verbal anchors.
            We inferred sensing technology only when the signal, device and body site identified a single
            plausible method. We assigned climate zones from the reported location and coded the use of a
            study space from photographs or plans when its function was unambiguous.
          </p>
        </section>

        <section>
          <h2 className={heading}>Missing information</h2>
          <p>Four codes distinguish absent information, missing measurement details, inapplicable fields and conflicting reports.</p>
          <CodeLegend />
          <p className="mt-3">
            For environmental measurements and questionnaires, we first counted experiments that used the
            measurement or instrument, including those coded MNR. Among those experiments, we then counted
            how many supplied the requested detail, such as sensor height or questionnaire response labels.
          </p>
        </section>

        <section>
          <h2 className={heading}>Descriptive analysis</h2>
          <p>
            We summarised categorical variables with counts and proportions, and continuous variables with
            medians and interquartile ranges or means and standard deviations. Temporal comparisons used
            consecutive two-year publication periods and the eligible experiments or publications in each
            period as the denominator. Differences between periods are descriptive.
          </p>
        </section>
      </div>
    </div>
  )
}
