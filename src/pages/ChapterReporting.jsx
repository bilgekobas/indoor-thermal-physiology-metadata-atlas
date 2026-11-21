import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { figNum } from '../figureRegistry.js'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function FieldCompletenessGroup({ title, rows, maxDenominator }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const sorted = rows
  return (
    <div>
      <h4 className="text-[14px] font-medium mb-3">{title}</h4>
      <div className="space-y-1.5">
        {sorted.map((r) => {
          const denomWidth = `${(r.denominator / Math.max(maxDenominator || r.denominator, 1)) * 100}%`
          const fillWidth = `${(r.count / Math.max(r.denominator || 1, 1)) * 100}%`
          return (
            <div key={r.field} className="flex items-center gap-3 group">
              <span className="text-[12px] w-52 shrink-0 truncate" title={r.field}>{r.field}</span>
              <div className="flex-1 h-4 cursor-default"
                onMouseEnter={(e) => showTip(e, `${r.field}: ${r.count} of ${r.denominator} · ${r.pct}%; denominator scaled to corpus n`)}
                onMouseMove={moveTip} onMouseLeave={hideTip}>
                <div className="h-full rounded bg-line/50 overflow-hidden" style={{ width: denomWidth }}>
                  <div className="h-full group-hover:brightness-110" style={{ width: fillWidth, background: '#0A0A0A' }} />
                </div>
              </div>
              <span className="font-data text-[11px] w-20 text-right text-inkmid">{r.count}/{r.denominator}</span>
              <span className="font-data text-[11px] w-12 text-right text-inkfaint">{r.pct}%</span>
            </div>
          )
        })}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterReporting({ data }) {
  const { field_completeness_detailed, summary } = data
  const groups = Object.entries(field_completeness_detailed)
  const flat = groups.flatMap(([group, obj]) => obj.fields.map((f) => ({ ...f, group })))
  const maxDenominator = Math.max(summary.n_experiments || 0, ...flat.map((f) => f.denominator || 0), 1)

  return (
    <div>
      <ChapterHeader
        eyebrow="Synthesis"
        title="Data completeness"
        framing={
          <>
            <p>
              This chapter describes the availability of individual metadata fields. Applicability depends on the field: environmental placement details are assessed among experiments measuring that variable, and MST details among experiments explicitly calculating MST.
            </p>
            <p>
              A field counts as documented when it contains a substantive coded value. For physiological fields, this view requires a value on at least one measurement row in the experiment; it does not establish that every signal or site is documented. Environmental rows evaluate placement detail, and questionnaire rows evaluate scale descriptions. Measured-but-unspecified and unclear details remain incomplete. Participant-state and protocol fields are presented in their relevant chapters.
            </p>
          </>
        }
        headline={[
          { value: flat.length, label: 'evaluated fields in this synthesis view', color: '#0A0A0A' },
          { value: summary.n_variables, label: 'coded variables across the corpus' },
        ]}
      />

      <ChapterSection title="Full field-level completeness list" intro="Tracks are scaled to each field’s applicable denominator and filled by documented count. Environmental rows refer to placement descriptions, which may be numeric heights or descriptions such as “desk”. Ratios at right make the denominator explicit.">
        <FigureCard figNumber={figNum('reporting-fields')} title="Evaluated reporting fields" plotWidth={980} commentary="Rows identify coded reporting fields; the display preserves their order in the dataset.">
          <div className="space-y-8 max-w-5xl">
            {groups.map(([group, obj]) => (
              <FieldCompletenessGroup key={group} title={group} rows={obj.fields} maxDenominator={maxDenominator} />
            ))}
          </div>
        </FigureCard>
      </ChapterSection>

      <div className="px-10 py-6 border-t border-line bg-white/30">
        <p className="text-[12px] text-inkmid leading-relaxed max-w-3xl">
          These counts describe the metadata available in the coded record. They do not provide an overall quality score, establish standards compliance, or show that experiments with the same reported fields can be pooled without further checks.
        </p>
      </div>
    </div>
  )
}
