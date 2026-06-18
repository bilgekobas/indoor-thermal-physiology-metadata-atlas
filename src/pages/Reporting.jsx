import PageHeader from '../components/PageHeader.jsx'
import { CodeChip } from '../components/CodeChip.jsx'
import BinaryPresenceFigure from '../components/BinaryPresenceFigure.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'

export default function Reporting({ data }) {
  const { completeness, fig20_protocol, fig21_participant_metadata, fig22_selection_criteria, fig14_questionnaire_domains, summary } = data
  const sorted = [...completeness.data].sort((a, b) => b.pct_reported - a.pct_reported)

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 14, 20–22"
        title="Reporting completeness"
        description="Which experimental, participant, and protocol details studies make explicit — and which are left to the reader's assumption."
      />

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-4">By metadata category</h2>
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
        <div className="mt-8 max-w-2xl border border-line rounded-md p-5 bg-white/40">
          <h3 className="text-[13.5px] font-semibold mb-2">Reading this chart</h3>
          <p className="text-[12.5px] text-inkmid leading-relaxed">
            A field counts as "reported" if it holds a substantive value rather than{' '}
            <CodeChip code="NR" />, <CodeChip code="MNR" />, or <CodeChip code="NAN" />.
            Categories with many optional, study-specific fields (Questionnaires, Selection criteria)
            naturally score lower than categories with a smaller, near-universal field set
            (Population, Physiological) — the gap is partly a function of breadth, not only practice.
          </p>
        </div>
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Questionnaire usage by domain</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Thermal questionnaires dominate; other domains (air movement, humidity, light, IAQ, acoustic) are
          included only when the study's specific focus calls for them.
        </p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          {Object.entries(fig14_questionnaire_domains).map(([domain, d]) => (
            <div key={domain}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-[13.5px] font-medium">{domain}</h3>
                <span className="font-data text-[11px] text-inkfaint">n={d.n_any}</span>
              </div>
              <InteractiveBarChart
                data={d.fields.map((f) => ({ label: f.field, count: f.count }))}
                total={summary.n_experiments}
                color="#4855C8"
                maxBars={6}
                height={16}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Protocol & standardisation controls</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Fixed clothing and a defined activity protocol are common; blinding, randomisation, and
          circadian/menstrual timing control are reported far less often. Each column on the right is one study.
        </p>
        <BinaryPresenceFigure
          bar={fig20_protocol.bar}
          matrix={fig20_protocol.matrix}
          fields={fig20_protocol.fields}
          nStudies={fig20_protocol.n_studies}
          barColor="#1A1A18"
        />
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Participant metadata collected</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Sex, age, height, and weight are nearly universal. Thermal history, body fat, and menstrual/contraceptive
          status are rarely reported despite known relevance to thermophysiological baselines.
        </p>
        <BinaryPresenceFigure
          bar={fig21_participant_metadata.bar}
          matrix={fig21_participant_metadata.matrix}
          fields={fig21_participant_metadata.fields}
          nStudies={fig21_participant_metadata.n_studies}
          barColor="#4855C8"
        />
      </div>

      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Inclusion / exclusion criteria</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          "Healthy" is the dominant inclusion criterion, usually without a stated method for verifying health status.
        </p>
        <BinaryPresenceFigure
          bar={fig22_selection_criteria.bar}
          matrix={fig22_selection_criteria.matrix}
          fields={fig22_selection_criteria.fields}
          nStudies={fig22_selection_criteria.n_studies}
          barColor="#E07820"
        />
      </div>
    </div>
  )
}
