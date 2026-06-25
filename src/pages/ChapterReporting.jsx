import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function FieldCompletenessGroup({ title, rows }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const sorted = rows
  return (
    <div>
      <h4 className="text-[14px] font-medium mb-3">{title}</h4>
      <div className="space-y-1.5">
        {sorted.map((r) => (
          <div key={r.field} className="flex items-center gap-3 group">
            <span className="text-[12px] w-52 shrink-0 truncate" title={r.field}>{r.field}</span>
            <div className="flex-1 h-4 rounded bg-line/50 overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${r.field}: ${r.count} of ${r.denominator} · ${r.pct}%`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}>
              <div className="h-full group-hover:brightness-110" style={{ width: `${r.pct}%`, background: '#0A0A0A' }} />
            </div>
            <span className="font-data text-[11px] w-20 text-right text-inkmid">{r.count}/{r.denominator}</span>
            <span className="font-data text-[11px] w-12 text-right text-inkfaint">{r.pct}%</span>
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterReporting({ data }) {
  const { field_completeness_detailed, summary } = data
  const groups = Object.entries(field_completeness_detailed)
  const flat = groups.flatMap(([group, obj]) => obj.fields.map((f) => ({ ...f, group })))
  const highest = [...flat].sort((a, b) => b.pct - a.pct)[0]
  const lowest = [...flat].sort((a, b) => a.pct - b.pct)[0]

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 7 of 7 · Synthesis"
        title="Data completeness"
        framing={
          <>
            <p>
              The landing page already gives the category-level summary. This closing chapter instead
              shows the full field-level completeness list for the fields we treat as corpus-wide
              reporting requirements.
            </p>
            <p>
              A field counts as “complete” if it holds a substantive value rather than a missing code.
              For environment and questionnaire fields, NR is treated as a legitimate non-use code and is excluded from the denominator; MNR is treated as missing among fields that should have been resolved. MST-specific fields are evaluated only among studies where MST was
              actually calculated. Participant metadata, inclusion criteria, and protocol-rigor fields
              are excluded here because they are not required across all studies.
            </p>
          </>
        }
        headline={[
          { value: `${highest.pct}%`, label: `${highest.field} is the most complete evaluated field`, color: '#5B5BFF' },
          { value: `${lowest.pct}%`, label: `${lowest.field} is the least complete evaluated field`, color: '#FB3640' },
          { value: flat.length, label: 'evaluated fields in this synthesis view', color: '#0A0A0A' },
          { value: summary.n_variables, label: 'coded variables across the corpus' },
        ]}
      />

      <ChapterSection title="Full field-level completeness list" intro="Bars are scaled directly to the reported percentage for that field. Counts and denominators are shown explicitly at right, so special cases such as MST-specific fields remain legible.">
        <FigureCard figNumber="35" title="Evaluated reporting fields" plotWidth={980} commentary="Groups are arranged by chapter logic rather than by rank. Within each group, fields follow the dataset column order so the display can be checked against the coding sheet.">
          <div className="space-y-8 max-w-5xl">
            {groups.map(([group, obj]) => (
              <FieldCompletenessGroup key={group} title={group} rows={obj.fields} />
            ))}
          </div>
        </FigureCard>
      </ChapterSection>

      <div className="px-10 py-6 border-t border-line bg-white/30">
        <p className="text-[12px] text-inkmid leading-relaxed max-w-3xl">
          The point of this page is not to punish optional richness; it is to separate genuinely
          missing reporting from fields that are only applicable in some studies. Once those cases are
          treated correctly, the major completeness gaps concentrate in a smaller set of fields rather
          than being spread artificially across every optional item in the schema.
        </p>
      </div>
    </div>
  )
}
