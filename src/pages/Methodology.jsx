import PageHeader from '../components/PageHeader.jsx'
import { CodeLegend } from '../components/CodeChip.jsx'

export default function Methodology({ data }) {
  const { summary } = data
  return (
    <div>
      <PageHeader eyebrow="Reference" title="Methodology" />

      <div className="px-10 py-8 max-w-3xl space-y-8">
        <section>
          <h2 className="text-[15px] font-semibold mb-2">Scope and purpose</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            This live atlas is a descriptive metadata analysis of indoor thermal-physiology
            experiments in the thermal-comfort field. It documents how experiments are reported:
            study context, time factors, thermal conditions, participants, environmental variables,
            physiological measurements, questionnaires, cognitive measures, inclusion/exclusion
            criteria, protocol controls, and stated limitations. The atlas is not a reporting
            standard by itself; it is the empirical layer used to make later standardisation and
            reproducibility discussions more concrete.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Search and screening logic</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            The current methodology appendix describes searches across Web of Science, Scopus,
            PubMed, and ScienceDirect for peer-reviewed English-language publications from 2013 to
            2024. Search terms were grouped around thermal-comfort constructs, experimental context,
            and physiological measurement. Records were deduplicated, screened at title/abstract
            stage, and then assessed through full-text review against explicit inclusion and
            exclusion criteria.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Inclusion and exclusion frame</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            Included studies were indoor studies with real human participants, at least one
            thermophysiological parameter, healthy adult participants, laboratory/field/living-lab or
            mixed settings, sedentary real-life contexts, daytime testing, full-body exposures,
            peer-reviewed publication status, English language, and publication years within the
            review window. Exclusions covered outdoor-only studies, manikins or simulations, purely
            subjective thermal-comfort questionnaires, exclusively clinical or special populations,
            children-only or elderly-only samples, VR/AR settings, clinical admissions or immersion
            protocols, exercise physiology, sleep-only physiology, and localised partial-body thermal
            treatments.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Corpus construction</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            The appendix reports 6,592 initial records, 358 publications retained for full-text
            review, 322 eligible studies, and a 250-study corpus selected for detailed metadata
            extraction. The website currently uses the live corpus bundle shown in the sidebar
            ({summary.n_publications} studies; {summary.year_min}–{summary.year_max}) and will be
            updated as the OSF registration, Zenodo record, and journal paper become final.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Metadata architecture</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed mb-3">
            The current extraction sheet contains 14 metadata categories and 198 fields. The fields
            cover identifiers, timing, context, study domains, target thermal conditions, population
            characteristics, environmental measurements, physiological measurements, questionnaires,
            cognitive/mental-load measurements, eligibility criteria, participant metadata, protocol
            controls, and limitations.
          </p>
          <CodeLegend />
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Current methods appendix</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed">
            The PDF attached to this build is included as a provisional methodology reference. It is
            expected to be superseded by the registered OSF protocol and the accompanying journal
            paper. Until then, use it as the detailed trace of the current selection, coding, and
            descriptive-analysis logic.
          </p>
          <a href={`${import.meta.env.BASE_URL}methodology_appendix_vi.pdf`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[12px] font-data text-coreaccent hover:underline">
            Open current methodology appendix PDF →
          </a>
        </section>
      </div>
    </div>
  )
}
