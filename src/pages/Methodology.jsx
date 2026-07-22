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
            The search and screening process covered Web of Science, Scopus,
            PubMed, and ScienceDirect for peer-reviewed English-language publications from 2013 to
            2024. Search terms were grouped around thermal-comfort constructs, experimental context,
            and physiological measurement. The initial search results yielded 6592 records across four databases. 
            After duplicate removal and title/abstract screening, 358 publications remained for full-text review. 
            Of these, 273 studies met all inclusion and exclusion criteria. <br></br>
            The current corpus contains {summary.n_publications} studies published between {summary.year_min} and {summary.year_max}.
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
          <h2 className="text-[15px] font-semibold mb-2">Metadata architecture</h2>
          <p className="text-[13.5px] text-inkmid leading-relaxed mb-3">
            The current extraction sheet contains 14 metadata categories and 206 fields. The fields
            cover identifiers, timing, context, study domains, target thermal conditions, population
            characteristics, environmental measurements, physiological measurements, questionnaires,
            cognitive/mental-load measurements, eligibility criteria, participant metadata, protocol
            controls, and limitations.
          </p>
          <CodeLegend />
        </section>
      </div>
    </div>
  )
}
